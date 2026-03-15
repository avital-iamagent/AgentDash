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
      <div className="flex flex-col items-center justify-center h-40 text-ink-muted text-sm gap-3">
        <svg className="w-8 h-8 text-ink-faint opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <span className="text-ink-faint text-xs">No artifact yet</span>
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
