import { useRef, useEffect } from "react";
import { usePrompt } from "../../hooks/usePrompt";
import { useAppStore } from "../../stores/appStore";

export default function PromptBar() {
  const { prompt, setPrompt, submit, submitResearch, isStreaming } = usePrompt();
  const wsConnected = useAppStore((s) => s.wsConnected);
  const researchMode = useAppStore((s) => s.researchMode);
  const setResearchMode = useAppStore((s) => s.setResearchMode);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [prompt]);

  // Focus input when not streaming
  useEffect(() => {
    if (!isStreaming) {
      inputRef.current?.focus();
    }
  }, [isStreaming]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (researchMode) {
        submitResearch();
      } else {
        submit();
      }
    }
  }

  const canSend = prompt.trim().length > 0 && !isStreaming && wsConnected;

  return (
    <div className="border-t border-edge bg-panel px-4 py-3">
      {/* Research mode pill */}
      {researchMode && (
        <div className="mb-2 flex items-center">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-phase-research/10 text-phase-research text-xs font-medium">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
            Research Mode
            <button
              onClick={() => setResearchMode(false)}
              className="ml-0.5 hover:text-ink transition-colors"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </span>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Input */}
        <div className="relative flex-1">
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isStreaming
                ? "Waiting for response..."
                : researchMode
                  ? "Ask a research question..."
                  : "Ask Claude anything..."
            }
            disabled={isStreaming}
            rows={1}
            className={`w-full bg-canvas border rounded-lg px-3.5 py-2.5 text-sm text-ink placeholder-ink-faint resize-none focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              researchMode
                ? "border-phase-research/50 bg-phase-research/5 focus:border-phase-research/70"
                : "border-edge focus:border-edge-bright"
            }`}
            style={{ minHeight: "40px" }}
          />
        </div>

        {/* Send button */}
        <button
          onClick={researchMode ? submitResearch : submit}
          disabled={!canSend}
          className={`shrink-0 w-9 h-[40px] rounded-lg border flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
            researchMode
              ? "bg-phase-research/15 border-phase-research/30 text-phase-research hover:bg-phase-research/25 disabled:hover:bg-phase-research/15"
              : "bg-accent/15 border-accent/30 text-accent hover:bg-accent/25 disabled:hover:bg-accent/15"
          }`}
        >
          {isStreaming ? (
            <div className={`w-3.5 h-3.5 border-2 rounded-full animate-spin ${
              researchMode
                ? "border-phase-research/40 border-t-phase-research"
                : "border-accent/40 border-t-accent"
            }`} />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Status hints */}
      {!wsConnected && (
        <div className="mt-2 text-[11px] text-phase-tasks font-mono flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-phase-tasks" />
          Reconnecting to server...
        </div>
      )}
    </div>
  );
}
