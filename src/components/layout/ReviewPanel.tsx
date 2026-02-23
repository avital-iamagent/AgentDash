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
      <div className="flex flex-col items-center justify-center h-40 text-ink-muted text-sm gap-2">
        <span className="text-2xl opacity-40">~</span>
        No review yet
      </div>
    );
  }

  return <MarkdownRenderer content={content} />;
}
