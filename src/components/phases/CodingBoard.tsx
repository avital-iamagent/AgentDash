import { usePhaseState } from "../../hooks/usePhaseState";
import Card from "../shared/Card";
import PhaseEmptyState from "../shared/PhaseEmptyState";
import type { CodingState } from "../../types";

const STATUS_COLORS: Record<string, string> = {
  pending:       "var(--color-ink-faint)",
  "in-progress": "var(--color-phase-coding)",
  done:          "var(--color-phase-environment)",
  failed:        "var(--color-phase-tasks)",
};

export default function CodingBoard() {
  const { data, loading, error } = usePhaseState("coding");
  const state = data as CodingState | null;

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (!state || state.tasks.length === 0) return <PhaseEmptyState phase="coding" />;

  return (
    <div className="stagger space-y-2">
      {state.tasks.map((task) => {
        const isCurrent = task.taskId === state.currentTaskId;
        return (
          <Card
            key={task.taskId}
            title={task.title}
            highlight={isCurrent}
            accentColor={isCurrent ? "var(--color-phase-coding)" : undefined}
            status={{
              label: task.status,
              color: STATUS_COLORS[task.status] ?? "var(--color-ink-faint)",
            }}
          >
            {isCurrent && (
              <span className="text-[10px] font-mono text-phase-coding">
                current
              </span>
            )}

            {task.notes && (
              <p className="text-xs text-ink-muted mt-1">{task.notes}</p>
            )}

            {task.commits && task.commits.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {task.commits.map((commit) => (
                  <span
                    key={commit}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono"
                    style={{
                      color: "var(--color-phase-coding)",
                      backgroundColor: "color-mix(in srgb, var(--color-phase-coding) 10%, transparent)",
                    }}
                  >
                    {commit.slice(0, 7)}
                  </span>
                ))}
              </div>
            )}
          </Card>
        );
      })}

      {state.completedAt && (
        <div className="pt-4 text-center">
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono"
            style={{
              color: "var(--color-phase-environment)",
              backgroundColor: "color-mix(in srgb, var(--color-phase-environment) 10%, transparent)",
            }}
          >
            All tasks complete
          </span>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-fade-in">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 rounded-lg bg-raised border border-edge shimmer" />
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
