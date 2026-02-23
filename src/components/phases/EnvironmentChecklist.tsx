import { useState } from "react";
import { usePhaseState } from "../../hooks/usePhaseState";
import PhaseEmptyState from "../shared/PhaseEmptyState";
import type { EnvironmentState } from "../../types";

const STATUS_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  done:    { icon: "\u2713", color: "var(--color-phase-environment)", bg: "color-mix(in srgb, var(--color-phase-environment) 12%, transparent)" },
  failed:  { icon: "!", color: "var(--color-phase-tasks)", bg: "color-mix(in srgb, var(--color-phase-tasks) 12%, transparent)" },
  pending: { icon: "\u2022", color: "var(--color-ink-faint)", bg: "color-mix(in srgb, var(--color-ink-faint) 12%, transparent)" },
};

export default function EnvironmentChecklist() {
  const { data, loading, error } = usePhaseState("environment");
  const state = data as EnvironmentState | null;

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (!state || state.checklist.length === 0) return <PhaseEmptyState phase="environment" />;

  const doneCount = state.checklist.filter((i) => i.status === "done").length;
  const total = state.checklist.length;

  return (
    <div className="stagger space-y-4">
      {/* Progress summary */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-overlay overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${total > 0 ? (doneCount / total) * 100 : 0}%`,
              backgroundColor: "var(--color-phase-environment)",
            }}
          />
        </div>
        <span className="text-xs font-mono text-ink-muted shrink-0">
          {doneCount}/{total}
        </span>
      </div>

      {/* Checklist items */}
      {state.checklist.map((item) => (
        <ChecklistItem key={item.id} item={item} />
      ))}
    </div>
  );
}

function ChecklistItem({ item }: { item: EnvironmentState["checklist"][number] }) {
  const [expanded, setExpanded] = useState(false);
  const style = STATUS_ICONS[item.status] ?? STATUS_ICONS.pending;
  const hasDetails = item.command || item.output;

  return (
    <div className="rounded-lg border border-edge bg-raised">
      <button
        onClick={() => hasDetails && setExpanded(!expanded)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left ${
          hasDetails ? "cursor-pointer hover:bg-overlay/50" : "cursor-default"
        } transition-colors`}
      >
        {/* Status indicator */}
        <div
          className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold"
          style={{ color: style.color, backgroundColor: style.bg }}
        >
          {style.icon}
        </div>

        {/* Task label */}
        <span
          className={`text-sm flex-1 ${
            item.status === "done" ? "text-ink-muted line-through" : "text-ink"
          }`}
        >
          {item.task}
        </span>

        {/* Expand chevron */}
        {hasDetails && (
          <span
            className="text-ink-faint text-xs transition-transform"
            style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            &rsaquo;
          </span>
        )}
      </button>

      {/* Expandable details */}
      {expanded && hasDetails && (
        <div className="px-4 pb-3 space-y-2 border-t border-edge animate-fade-in">
          {item.command && (
            <div className="mt-2">
              <span className="text-[10px] font-mono text-ink-faint uppercase tracking-wider">
                Command
              </span>
              <pre className="mt-1 text-xs font-mono text-ink bg-canvas rounded p-2 overflow-x-auto">
                {item.command}
              </pre>
            </div>
          )}
          {item.output && (
            <div>
              <span className="text-[10px] font-mono text-ink-faint uppercase tracking-wider">
                Output
              </span>
              <pre className="mt-1 text-xs font-mono text-ink-muted bg-canvas rounded p-2 overflow-x-auto max-h-32 overflow-y-auto">
                {item.output}
              </pre>
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
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-14 rounded-lg bg-raised border border-edge shimmer" />
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
