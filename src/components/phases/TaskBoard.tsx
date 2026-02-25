import { usePhaseState } from "../../hooks/usePhaseState";
import { useAppStore } from "../../stores/appStore";
import { sendWsMessage } from "../../hooks/useWebSocket";
import Card from "../shared/Card";
import PhaseEmptyState from "../shared/PhaseEmptyState";
import type { TasksState } from "../../types";

const PRIORITY_COLORS: Record<string, string> = {
  must:   "var(--color-phase-tasks)",
  should: "var(--color-phase-brainstorm)",
  could:  "var(--color-phase-research)",
};

const STATUS_COLORS: Record<string, string> = {
  pending:       "var(--color-ink-faint)",
  "in-progress": "var(--color-phase-brainstorm)",
  done:          "var(--color-phase-environment)",
  blocked:       "var(--color-phase-tasks)",
};

export default function TaskBoard() {
  const { data, loading, error } = usePhaseState("tasks");
  const state = data as TasksState | null;
  const isStreaming = useAppStore((s) => s.isStreaming);
  const startStreaming = useAppStore((s) => s.startStreaming);
  const stopStreaming = useAppStore((s) => s.stopStreaming);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (!state || state.tasks.length === 0) return <PhaseEmptyState phase="tasks" />;

  const hasStartedCoding = state.tasks.some(
    (t) => t.status === "in-progress" || t.status === "done"
  );

  function handleStartCoding() {
    if (isStreaming) return;
    startStreaming("start coding");
    const sent = sendWsMessage({ type: "prompt", phase: "tasks", text: "start coding" });
    if (!sent) stopStreaming();
  }

  // Build milestone lookup
  const milestoneMap = new Map(state.milestones.map((m) => [m.id, m]));

  // Group tasks by milestone
  const grouped = new Map<string, { name: string; tasks: TasksState["tasks"] }>();

  // First, organize by milestone order
  for (const ms of state.milestones) {
    grouped.set(ms.id, { name: ms.name, tasks: [] });
  }
  grouped.set("__none__", { name: "Unassigned", tasks: [] });

  for (const task of state.tasks) {
    const msId = task.milestone ?? "__none__";
    if (!grouped.has(msId)) {
      const msInfo = milestoneMap.get(msId);
      grouped.set(msId, { name: msInfo?.name ?? msId, tasks: [] });
    }
    grouped.get(msId)!.tasks.push(task);
  }

  // Remove empty groups
  for (const [key, val] of grouped) {
    if (val.tasks.length === 0) grouped.delete(key);
  }

  return (
    <div className="stagger space-y-6">
      {!hasStartedCoding && (
        <div
          className="rounded-xl border p-4 flex items-center justify-between gap-4 animate-fade-up"
          style={{
            borderColor: "color-mix(in srgb, var(--color-phase-environment) 30%, transparent)",
            backgroundColor: "color-mix(in srgb, var(--color-phase-environment) 6%, transparent)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm"
              style={{
                color: "var(--color-phase-environment)",
                backgroundColor: "color-mix(in srgb, var(--color-phase-environment) 15%, transparent)",
              }}
            >
              ▶
            </div>
            <div>
              <p className="text-sm font-medium text-ink">Ready for implementation</p>
              <p className="text-xs text-ink-muted mt-0.5">
                Want me to start coding through these tasks?
              </p>
            </div>
          </div>
          <button
            onClick={handleStartCoding}
            disabled={isStreaming}
            className="shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40"
            style={{
              color: "var(--color-canvas)",
              backgroundColor: "var(--color-phase-environment)",
            }}
          >
            Start Coding
          </button>
        </div>
      )}
      {Array.from(grouped.entries()).map(([msId, group]) => (
        <div key={msId}>
          {/* Milestone header */}
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-medium text-ink">{group.name}</h3>
            <span className="text-xs font-mono text-ink-faint">
              {group.tasks.filter((t) => t.status === "done").length}/{group.tasks.length}
            </span>
          </div>

          {/* Tasks */}
          <div className="space-y-2">
            {group.tasks.map((task) => {
              const isCurrent = task.id === state.currentTask;
              return (
                <Card
                  key={task.id}
                  title={task.title}
                  highlight={isCurrent}
                  accentColor={isCurrent ? "var(--color-phase-brainstorm)" : undefined}
                  status={{
                    label: task.status,
                    color: STATUS_COLORS[task.status] ?? "var(--color-ink-faint)",
                  }}
                >
                  {/* Priority badge */}
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
                      style={{
                        color: PRIORITY_COLORS[task.priority] ?? "var(--color-ink-muted)",
                        backgroundColor: `color-mix(in srgb, ${PRIORITY_COLORS[task.priority] ?? "var(--color-ink-faint)"} 12%, transparent)`,
                      }}
                    >
                      {task.priority}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-mono text-phase-brainstorm">
                        current
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-ink-muted mt-1">{task.description}</p>

                  {/* Implementation notes */}
                  {task.notes && (
                    <p className="text-xs text-ink-faint mt-1 italic">{task.notes}</p>
                  )}

                  {/* Acceptance criteria */}
                  {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {task.acceptanceCriteria.map((criterion, i) => (
                        <li key={i} className="text-[11px] text-ink-faint flex gap-1.5">
                          <span className="shrink-0 text-ink-faint">&bull;</span>
                          {criterion}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Commit hashes */}
                  {task.commits && task.commits.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {task.commits.map((hash) => (
                        <span
                          key={hash}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono"
                          style={{
                            color: "var(--color-phase-coding)",
                            backgroundColor: "color-mix(in srgb, var(--color-phase-coding) 10%, transparent)",
                          }}
                        >
                          {hash.slice(0, 7)}
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="h-4 w-32 rounded bg-raised border border-edge shimmer" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 rounded-lg bg-raised border border-edge shimmer" />
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center animate-fade-up">
        <p className="text-sm text-phase-tasks">{message}</p>
      </div>
    </div>
  );
}
