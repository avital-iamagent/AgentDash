import { usePhaseState } from "../../hooks/usePhaseState";
import Card from "../shared/Card";
import PhaseEmptyState from "../shared/PhaseEmptyState";
import type { BrainstormState } from "../../types";

const STATUS_COLORS: Record<string, string> = {
  proposed: "var(--color-phase-brainstorm)",
  accepted: "var(--color-phase-environment)",
  rejected: "var(--color-phase-tasks)",
};

const CREATOR_LABELS: Record<string, string> = {
  "user": "you",
  "claude-code": "claude",
};

export default function BrainstormBoard() {
  const { data, loading, error } = usePhaseState("brainstorm");
  const state = data as BrainstormState | null;

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (!state || state.cards.length === 0) return <PhaseEmptyState phase="brainstorm" />;

  // Build group lookup
  const groupMap = new Map(state.groups.map((g) => [g.id, g]));

  // Group cards: cards with a group go under that group, rest go to "Ungrouped"
  const grouped = new Map<string, { name: string; color?: string; cards: BrainstormState["cards"] }>();

  for (const card of state.cards) {
    const groupId = card.group ?? "__ungrouped__";
    if (!grouped.has(groupId)) {
      const groupInfo = groupMap.get(groupId);
      grouped.set(groupId, {
        name: groupInfo?.name ?? "Ungrouped",
        color: groupInfo?.color,
        cards: [],
      });
    }
    grouped.get(groupId)!.cards.push(card);
  }

  return (
    <div className="stagger space-y-6">
      {Array.from(grouped.entries()).map(([groupId, group]) => (
        <div key={groupId}>
          {/* Group header */}
          <div className="flex items-center gap-2 mb-3">
            {group.color && (
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
            )}
            <h3 className="text-sm font-medium text-ink">{group.name}</h3>
            <span className="text-xs font-mono text-ink-faint">{group.cards.length}</span>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.cards.map((card) => (
              <Card
                key={card.id}
                title={card.text}
                tags={card.tags}
                status={{
                  label: card.status,
                  color: STATUS_COLORS[card.status] ?? "var(--color-ink-muted)",
                }}
                accentColor={group.color}
              >
                {card.notes && (
                  <p className="text-xs text-ink-muted mt-1">{card.notes}</p>
                )}
                <div className="mt-2 text-[10px] font-mono text-ink-faint">
                  {CREATOR_LABELS[card.createdBy] ?? card.createdBy}
                </div>
              </Card>
            ))}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-lg bg-raised border border-edge shimmer" />
        ))}
      </div>
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
