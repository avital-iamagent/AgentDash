import { useReview } from "../../hooks/usePhaseState";
import MarkdownRenderer from "../shared/MarkdownRenderer";
import type { PhaseName } from "../../types";

export default function ReviewPanel({ phase }: { phase: PhaseName }) {
  const { content, loading, error } = useReview(phase);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-ink-muted text-sm">
        Loading review...
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
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
        <span className="text-ink-faint text-xs">No review yet</span>
      </div>
    );
  }

  return <MarkdownRenderer content={content} />;
}
