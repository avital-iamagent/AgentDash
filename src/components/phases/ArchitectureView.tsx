import { usePhaseState } from "../../hooks/usePhaseState";
import Card from "../shared/Card";
import MermaidDiagram from "../shared/MermaidDiagram";
import PhaseEmptyState from "../shared/PhaseEmptyState";
import type { ArchitectureState } from "../../types";

const SEVERITY_COLORS: Record<string, string> = {
  high:   "var(--color-phase-tasks)",
  medium: "var(--color-phase-brainstorm)",
  low:    "var(--color-phase-environment)",
};

export default function ArchitectureView() {
  const { data, loading, error } = usePhaseState("architecture");
  const state = data as ArchitectureState | null;

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (!state) return <PhaseEmptyState phase="architecture" />;

  const hasDiagrams = state.diagrams.length > 0;
  const hasComponents = state.components.length > 0;
  const hasDecisions = state.decisions.length > 0;
  const hasRisks = state.risks.length > 0;
  const isEmpty = !hasDiagrams && !hasComponents && !hasDecisions && !hasRisks;

  if (isEmpty) return <PhaseEmptyState phase="architecture" />;

  return (
    <div className="stagger space-y-5">
      {/* Diagrams */}
      {hasDiagrams && (
        <section>
          <SectionHeader title="Diagrams" count={state.diagrams.length} />
          <div className="space-y-4">
            {state.diagrams.map((diagram, i) => (
              <div key={diagram.id ?? i}>
                <h4 className="text-xs font-mono text-ink-muted mb-2">{diagram.title}</h4>
                <MermaidDiagram chart={diagram.mermaid} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Components grid */}
      {hasComponents && (
        <section>
          <SectionHeader title="Components" count={state.components.length} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {state.components.map((comp, i) => (
              <Card
                key={comp.id ?? i}
                title={comp.name}
                accentColor="var(--color-phase-architecture)"
              >
                <div className="mb-1">
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
                    style={{
                      color: "var(--color-phase-architecture)",
                      backgroundColor: "color-mix(in srgb, var(--color-phase-architecture) 10%, transparent)",
                    }}
                  >
                    {comp.type}
                  </span>
                </div>
                <p className="text-xs text-ink-muted">{comp.responsibility}</p>
                {comp.dependencies && comp.dependencies.length > 0 && (
                  <p className="text-[10px] font-mono text-ink-faint mt-2">
                    deps: {comp.dependencies.join(", ")}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Decisions table */}
      {hasDecisions && (
        <section>
          <SectionHeader title="Decisions" count={state.decisions.length} />
          <div className="rounded-lg border border-edge overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-overlay/50">
                  <th className="text-left px-4 py-2.5 text-xs font-mono font-medium text-ink-muted">
                    Choice
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-mono font-medium text-ink-muted">
                    Rationale
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-mono font-medium text-ink-muted">
                    Alternatives
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.decisions.map((dec, i) => (
                  <tr key={dec.id ?? i} className="border-t border-edge">
                    <td className="px-4 py-2.5 text-ink font-medium align-top">
                      {dec.choice}
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted align-top">
                      {dec.rationale}
                    </td>
                    <td className="px-4 py-2.5 text-ink-faint font-mono text-xs align-top">
                      {dec.alternatives?.join(", ") || "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Risks list */}
      {hasRisks && (
        <section>
          <SectionHeader title="Risks" count={state.risks.length} />
          <div className="space-y-2">
            {state.risks.map((risk, i) => (
              <div
                key={risk.id ?? i}
                className="flex items-start gap-3 rounded-lg border border-edge bg-raised px-4 py-3"
              >
                <span
                  className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium mt-0.5"
                  style={{
                    color: SEVERITY_COLORS[risk.severity] ?? "var(--color-ink-muted)",
                    backgroundColor: `color-mix(in srgb, ${SEVERITY_COLORS[risk.severity] ?? "var(--color-ink-faint)"} 12%, transparent)`,
                  }}
                >
                  {risk.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink">{risk.description}</p>
                  <p className="text-xs text-ink-muted mt-1">{risk.mitigation}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h3 className="text-sm font-medium text-ink">{title}</h3>
      <span className="text-xs font-mono text-ink-faint">{count}</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-48 rounded-lg bg-raised border border-edge shimmer" />
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
