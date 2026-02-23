import { useRef, useEffect } from "react";
import { usePrompt } from "../../hooks/usePrompt";
import { useAppStore } from "../../stores/appStore";

export default function PromptBar() {
  const { prompt, setPrompt, submit, submitResearch, isStreaming } = usePrompt();
  const wsConnected = useAppStore((s) => s.wsConnected);
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
      submit();
    }
  }

  const canSend = prompt.trim().length > 0 && !isStreaming && wsConnected;

  return (
    <div className="border-t border-edge bg-panel px-4 py-3">
      <div className="flex items-end gap-2">
        {/* Input */}
        <div className="relative flex-1">
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? "Waiting for response..." : "Ask Claude anything..."}
            disabled={isStreaming}
            rows={1}
            className="w-full bg-canvas border border-edge rounded-lg px-3.5 py-2.5 text-sm text-ink placeholder-ink-faint resize-none focus:outline-none focus:border-edge-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: "40px" }}
          />
        </div>

        {/* Research button */}
        <button
          onClick={submitResearch}
          disabled={!canSend}
          title="Send as research question"
          className="shrink-0 w-9 h-[40px] rounded-lg border border-edge bg-canvas flex items-center justify-center text-ink-faint hover:text-phase-research hover:border-phase-research/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-ink-faint disabled:hover:border-edge"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
        </button>

        {/* Send button */}
        <button
          onClick={submit}
          disabled={!canSend}
          className="shrink-0 w-9 h-[40px] rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent hover:bg-accent/25 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-accent/15"
        >
          {isStreaming ? (
            <div className="w-3.5 h-3.5 border-2 border-accent/40 border-t-accent rounded-full animate-spin" />
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
