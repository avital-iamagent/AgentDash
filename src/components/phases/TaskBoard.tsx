import { usePhaseState } from "../../hooks/usePhaseState";
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

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (!state || state.tasks.length === 0) return <PhaseEmptyState phase="tasks" />;

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
