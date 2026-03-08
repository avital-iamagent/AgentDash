import { useState } from "react";
import { useAppStore } from "../../stores/appStore";
import MarkdownRenderer from "../shared/MarkdownRenderer";
import type { PhaseName } from "../../types";

const PHASES: { key: PhaseName; label: string }[] = [
  { key: "brainstorm", label: "Brainstorm" },
  { key: "research", label: "Research" },
  { key: "architecture", label: "Architecture" },
  { key: "tasks", label: "Tasks" },
];

export default function ResearchSaveModal() {
  const researchResult = useAppStore((s) => s.researchResult);
  const showResearchSave = useAppStore((s) => s.showResearchSave);
  const dismissResearchSave = useAppStore((s) => s.dismissResearchSave);
  const [selectedPhase, setSelectedPhase] = useState<PhaseName | null>(null);
  const [saving, setSaving] = useState(false);

  if (!showResearchSave || !researchResult) return null;

  async function handleSave() {
    if (!selectedPhase || !researchResult) return;
    setSaving(true);
    try {
      await fetch("/api/research-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase: selectedPhase,
          question: researchResult.question,
          content: researchResult.content,
        }),
      });
    } catch {
      // silent — best effort
    } finally {
      setSaving(false);
      setSelectedPhase(null);
      dismissResearchSave();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-panel border border-edge rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-edge">
          <svg className="w-4.5 h-4.5 text-phase-research shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <h2 className="text-sm font-semibold text-ink">Save Research Note</h2>
        </div>

        {/* Question */}
        {researchResult.question && (
          <div className="px-5 pt-3 pb-1">
            <div className="text-xs text-ink-faint font-mono mb-1">Question</div>
            <div className="text-sm text-ink-muted">{researchResult.question}</div>
          </div>
        )}

        {/* Content preview */}
        <div className="flex-1 overflow-y-auto px-5 py-3 min-h-0">
          <div className="text-xs text-ink-faint font-mono mb-2">Research Output</div>
          <div className="bg-canvas rounded-lg border border-edge p-4 max-h-[300px] overflow-y-auto">
            <MarkdownRenderer content={researchResult.content} />
          </div>
        </div>

        {/* Phase picker */}
        <div className="px-5 py-3 border-t border-edge">
          <div className="text-xs text-ink-faint font-mono mb-2.5">Save to phase</div>
          <div className="flex flex-wrap gap-2">
            {PHASES.map((p) => {
              const isSelected = selectedPhase === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => setSelectedPhase(p.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    isSelected
                      ? `border-phase-${p.key}/50 text-phase-${p.key}`
                      : "border-edge text-ink-muted hover:border-edge-bright"
                  }`}
                  style={isSelected ? {
                    backgroundColor: `color-mix(in srgb, var(--color-phase-${p.key}) 12%, transparent)`,
                    borderColor: `color-mix(in srgb, var(--color-phase-${p.key}) 50%, transparent)`,
                    color: `var(--color-phase-${p.key})`,
                  } : undefined}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-5 py-3.5 border-t border-edge">
          <button
            onClick={() => { setSelectedPhase(null); dismissResearchSave(); }}
            className="text-xs text-ink-muted hover:text-ink transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedPhase || saving}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-phase-research/15 border border-phase-research/30 text-phase-research hover:bg-phase-research/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Note"}
          </button>
        </div>
      </div>
    </div>
  );
}
