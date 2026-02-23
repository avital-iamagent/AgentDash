import { useArtifact } from "../../hooks/usePhaseState";
import { useAppStore } from "../../stores/appStore";
import MarkdownRenderer from "../shared/MarkdownRenderer";
import type { PhaseName } from "../../types";

export default function ArtifactPreview({ phase }: { phase: PhaseName }) {
  const { content, loading, error } = useArtifact(phase);
  const meta = useAppStore((s) => s.meta);

  const phaseInfo = meta?.phases[phase];
  const approved = phaseInfo?.artifactApproved === true;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-ink-muted text-sm">
        Loading artifact...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-40 text-red-400 text-sm">
        {error}
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-ink-muted text-sm gap-2">
        <span className="text-2xl opacity-40">~</span>
        No artifact yet
      </div>
    );
  }

  return (
    <div>
      {/* Approval badge */}
      <div className="mb-4 flex items-center gap-2">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium"
          style={{
            color: approved ? "var(--color-phase-environment)" : "var(--color-ink-muted)",
            backgroundColor: approved
              ? "color-mix(in srgb, var(--color-phase-environment) 12%, transparent)"
              : "color-mix(in srgb, var(--color-ink-muted) 12%, transparent)",
          }}
        >
          {approved ? "approved" : "pending approval"}
        </span>
      </div>

      <MarkdownRenderer content={content} />
    </div>
  );
}
