import { useState } from "react";
import { usePhaseState } from "../../hooks/usePhaseState";
import Card from "../shared/Card";
import PhaseEmptyState from "../shared/PhaseEmptyState";
import type { ResearchState } from "../../types";

const CATEGORY_COLORS: Record<string, string> = {
  competitor: "var(--color-phase-brainstorm)",
  "tech-stack": "var(--color-phase-architecture)",
  pattern: "var(--color-phase-research)",
  risk: "var(--color-phase-tasks)",
};

const VERDICT_COLORS: Record<string, string> = {
  adopt: "var(--color-phase-environment)",
  "learn-from": "var(--color-phase-research)",
  avoid: "var(--color-phase-tasks)",
  "needs-more-research": "var(--color-phase-brainstorm)",
};

export default function ResearchGrid() {
  const { data, loading, error } = usePhaseState("research");
  const state = data as ResearchState | null;
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (!state || state.items.length === 0) return <PhaseEmptyState phase="research" />;

  // Derive unique categories from items
  const categories = Array.from(new Set(state.items.map((i) => i.category)));

  const filtered = activeCategory
    ? state.items.filter((i) => i.category === activeCategory)
    : state.items;

  return (
    <div className="space-y-4">
      {/* Category filter tabs */}
      <div className="flex gap-2 flex-wrap stagger">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
            activeCategory === null
              ? "bg-overlay text-ink"
              : "text-ink-muted hover:text-ink hover:bg-overlay/50"
          }`}
        >
          All ({state.items.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
              activeCategory === cat
                ? "text-ink"
                : "text-ink-muted hover:text-ink hover:bg-overlay/50"
            }`}
            style={
              activeCategory === cat
                ? {
                    backgroundColor: `color-mix(in srgb, ${CATEGORY_COLORS[cat] ?? "var(--color-ink-faint)"} 15%, transparent)`,
                  }
                : undefined
            }
          >
            {cat} ({state.items.filter((i) => i.category === cat).length})
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
        {filtered.map((item) => (
          <Card
            key={item.id}
            title={item.topic}
            status={{
              label: item.verdict,
              color: VERDICT_COLORS[item.verdict] ?? "var(--color-ink-muted)",
            }}
            accentColor={CATEGORY_COLORS[item.category]}
          >
            {/* Category badge */}
            <div className="mb-2">
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
                style={{
                  color: CATEGORY_COLORS[item.category] ?? "var(--color-ink-muted)",
                  backgroundColor: `color-mix(in srgb, ${CATEGORY_COLORS[item.category] ?? "var(--color-ink-faint)"} 10%, transparent)`,
                }}
              >
                {item.category}
              </span>
            </div>

            {/* Summary */}
            <p className="text-xs text-ink-muted leading-relaxed">{item.summary}</p>

            {/* Source count */}
            {item.sources.length > 0 && (
              <p className="text-[10px] font-mono text-ink-faint mt-2">
                {item.sources.length} source{item.sources.length !== 1 ? "s" : ""}
              </p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-7 w-20 rounded bg-raised border border-edge shimmer" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-36 rounded-lg bg-raised border border-edge shimmer" />
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
