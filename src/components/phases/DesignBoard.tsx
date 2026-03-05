import { useState } from "react";
import { usePhaseState } from "../../hooks/usePhaseState";
import Card from "../shared/Card";
import PhaseEmptyState from "../shared/PhaseEmptyState";
import type { TasksState, DesignPhaseState } from "../../types";

const STATUS_COLORS = {
  reviewed: "var(--color-phase-environment)",
  pending: "var(--color-ink-faint)",
};

export default function DesignBoard() {
  const { data: tasksData, loading: tasksLoading } = usePhaseState("tasks");
  const { data: designData, loading: designLoading } = usePhaseState("design");
  const [showNonUi, setShowNonUi] = useState(false);

  const tasks = tasksData as TasksState | null;
  const design = designData as DesignPhaseState | null;

  if (tasksLoading || designLoading) return <LoadingSkeleton />;
  if (!tasks || tasks.tasks.length === 0) return <PhaseEmptyState phase="design" />;

  const reviewedSet = new Set(design?.reviewedTasks ?? []);

  // Heuristic: tasks with designNotes or visualId are UI tasks;
  // also treat any task whose title/description mentions UI keywords as UI-facing
  const UI_KEYWORDS = /\b(ui|frontend|component|page|layout|button|modal|form|dashboard|sidebar|header|visual|screen|view|panel|tab|card|badge|display|render)\b/i;

  const uiTasks = tasks.tasks.filter(
    (t) => t.designNotes || t.visualId || UI_KEYWORDS.test(t.title) || UI_KEYWORDS.test(t.description)
  );
  const nonUiTasks = tasks.tasks.filter(
    (t) => !uiTasks.includes(t)
  );

  const reviewedCount = uiTasks.filter((t) => reviewedSet.has(t.id) || !!t.designNotes).length;

  return (
    <div className="stagger space-y-6">
      {/* Progress header */}
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-medium text-ink">Design Review</h3>
        <span className="text-xs font-mono text-ink-faint">
          {reviewedCount}/{uiTasks.length} tasks reviewed
        </span>
        {/* Progress bar */}
        <div className="flex-1 max-w-[200px] h-1.5 rounded-full bg-edge overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: uiTasks.length > 0 ? `${(reviewedCount / uiTasks.length) * 100}%` : "0%",
              backgroundColor: "var(--color-phase-design)",
            }}
          />
        </div>
      </div>

      {/* Design theme summary */}
      {design && (design.designTheme || design.colorPalette || design.typography) && (
        <div
          className="rounded-xl border p-4 space-y-2"
          style={{
            borderColor: "color-mix(in srgb, var(--color-phase-design) 30%, transparent)",
            backgroundColor: "color-mix(in srgb, var(--color-phase-design) 6%, transparent)",
          }}
        >
          <span
            className="text-[10px] font-mono font-medium uppercase tracking-wide"
            style={{ color: "var(--color-phase-design)" }}
          >
            Design Direction
          </span>
          {design.designTheme && (
            <p className="text-xs text-ink-muted"><span className="text-ink font-medium">Theme:</span> {design.designTheme}</p>
          )}
          {design.colorPalette && (
            <p className="text-xs text-ink-muted"><span className="text-ink font-medium">Palette:</span> {design.colorPalette}</p>
          )}
          {design.typography && (
            <p className="text-xs text-ink-muted"><span className="text-ink font-medium">Typography:</span> {design.typography}</p>
          )}
        </div>
      )}

      {/* UI task cards */}
      <div className="space-y-2">
        {uiTasks.map((task) => {
          const isReviewed = reviewedSet.has(task.id) || !!task.designNotes;
          return (
            <Card
              key={task.id}
              title={task.title}
              accentColor={isReviewed ? "var(--color-phase-design)" : undefined}
              status={{
                label: isReviewed ? "reviewed" : "pending",
                color: isReviewed ? STATUS_COLORS.reviewed : STATUS_COLORS.pending,
              }}
            >
              <p className="text-xs text-ink-muted">{task.description}</p>

              {/* Visual thumbnail */}
              {task.visualId && (
                <a
                  href={`/api/visuals/image/${task.visualId}.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-2"
                >
                  <img
                    src={`/api/visuals/image/${task.visualId}.png`}
                    alt="Design reference"
                    className="w-full max-w-[240px] rounded border border-edge cursor-pointer hover:opacity-80 transition-opacity"
                  />
                </a>
              )}

              {/* Design notes */}
              {task.designNotes && (
                <div
                  className="mt-2 rounded-lg p-2"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--color-phase-design) 6%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--color-phase-design) 20%, transparent)",
                  }}
                >
                  <span
                    className="text-[10px] font-mono font-medium uppercase tracking-wide"
                    style={{ color: "var(--color-phase-design)" }}
                  >
                    Design Notes
                  </span>
                  <p className="text-[11px] text-ink-muted mt-1">{task.designNotes}</p>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Non-UI tasks collapsed section */}
      {nonUiTasks.length > 0 && (
        <div>
          <button
            onClick={() => setShowNonUi(!showNonUi)}
            className="flex items-center gap-2 text-xs text-ink-faint hover:text-ink-muted transition-colors"
          >
            <svg
              className={`w-3 h-3 transition-transform ${showNonUi ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            No design needed ({nonUiTasks.length} tasks)
          </button>
          {showNonUi && (
            <div className="mt-2 space-y-1.5 pl-5">
              {nonUiTasks.map((task) => (
                <div key={task.id} className="text-xs text-ink-faint flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-edge shrink-0" />
                  {task.title}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="h-4 w-48 rounded bg-raised border border-edge shimmer" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-28 rounded-lg bg-raised border border-edge shimmer" />
      ))}
    </div>
  );
}
