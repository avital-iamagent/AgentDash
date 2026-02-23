import { useRef, useEffect } from "react";
import Markdown from "react-markdown";
import { useAppStore } from "../../stores/appStore";

export default function StreamingDisplay() {
  const isStreaming = useAppStore((s) => s.isStreaming);
  const streamingContent = useAppStore((s) => s.streamingContent);
  const error = useAppStore((s) => s.error);
  const clearStreamContent = useAppStore((s) => s.clearStreamContent);
  const setError = useAppStore((s) => s.setError);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom during streaming
  useEffect(() => {
    if (isStreaming || streamingContent) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamingContent, isStreaming]);

  // Nothing to show
  if (!streamingContent && !isStreaming && !error) {
    return null;
  }

  return (
    <div className="border-t border-edge bg-canvas/50">
      <div className="max-h-[40vh] overflow-y-auto">
        <div className="px-5 py-4">
          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 mb-3 animate-fade-up">
              <div className="shrink-0 w-5 h-5 rounded bg-phase-tasks/15 flex items-center justify-center mt-0.5">
                <span className="text-xs text-phase-tasks">!</span>
              </div>
              <div className="text-sm text-phase-tasks">{error}</div>
              <button
                onClick={() => setError(null)}
                className="shrink-0 ml-auto text-ink-faint hover:text-ink-muted text-xs"
              >
                dismiss
              </button>
            </div>
          )}

          {/* Streaming content */}
          {streamingContent && (
            <div className="prose-stream text-sm animate-fade-in">
              <Markdown>{streamingContent}</Markdown>
            </div>
          )}

          {/* Streaming indicator */}
          {isStreaming && !streamingContent && (
            <div className="flex items-center gap-2 text-ink-muted text-sm animate-fade-up">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-ink-faint" style={{ animation: "pulse-dot 1.2s ease-in-out infinite" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-ink-faint" style={{ animation: "pulse-dot 1.2s ease-in-out 0.2s infinite" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-ink-faint" style={{ animation: "pulse-dot 1.2s ease-in-out 0.4s infinite" }} />
              </div>
              <span className="font-mono text-xs">Claude is thinking...</span>
            </div>
          )}

          {/* Done indicator + dismiss */}
          {!isStreaming && streamingContent && (
            <div className="mt-3 pt-3 border-t border-edge flex items-center justify-between">
              <span className="text-[11px] text-ink-faint font-mono">Response complete</span>
              <button
                onClick={clearStreamContent}
                className="text-[11px] text-ink-faint hover:text-ink-muted font-mono transition-colors"
              >
                dismiss
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
