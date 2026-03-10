import { useRef, useEffect, useState, useCallback } from "react";
import { usePrompt } from "../../hooks/usePrompt";
import { useAppStore } from "../../stores/appStore";
import { sendWsMessage } from "../../hooks/useWebSocket";

export default function PromptBar() {
  const { prompt, setPrompt, submit, submitResearch, isStreaming, attachments, addAttachments, removeAttachment } = usePrompt();
  const wsConnected = useAppStore((s) => s.wsConnected);
  const researchMode = useAppStore((s) => s.researchMode);
  const setResearchMode = useAppStore((s) => s.setResearchMode);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

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

  // Paste handler for images from clipboard
  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      addAttachments(imageFiles);
    }
  }

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addAttachments(e.dataTransfer.files);
    }
  }, [addAttachments]);

  const canSend = (prompt.trim().length > 0 || attachments.length > 0) && !isStreaming && wsConnected;

  return (
    <div
      className={`border-t border-edge bg-panel px-4 py-3 ${isStreaming ? "prompt-glow" : ""} ${isDragOver ? "ring-2 ring-accent/40 ring-inset" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addAttachments(e.target.files);
          e.target.value = "";
        }}
      />

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

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="mb-2 flex gap-2 flex-wrap">
          {attachments.map((att) => (
            <div key={att.id} className="relative group">
              <img
                src={att.dataUrl}
                alt={att.name}
                className="h-16 max-w-[120px] rounded-md border border-edge object-cover"
              />
              <button
                onClick={() => removeAttachment(att.id)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-ink text-canvas flex items-center justify-center"
              >
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Attachment button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming}
          title="Attach screenshot"
          className="shrink-0 w-9 h-[40px] rounded-lg border border-edge text-ink-muted hover:text-ink hover:border-edge-bright flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Input */}
        <div className="relative flex-1">
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              isDragOver
                ? "Drop image here..."
                : isStreaming
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

        {/* Stop button (while streaming) or Send button */}
        {isStreaming ? (
          <button
            onClick={() => sendWsMessage({ type: "abort" })}
            title="Stop generation"
            className="shrink-0 w-9 h-[40px] rounded-lg border border-phase-tasks/40 bg-phase-tasks/10 text-phase-tasks hover:bg-phase-tasks/20 flex items-center justify-center transition-all"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <rect x="5" y="5" width="14" height="14" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            onClick={researchMode ? submitResearch : submit}
            disabled={!canSend}
            className={`shrink-0 w-9 h-[40px] rounded-lg border flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
              researchMode
                ? "bg-phase-research/15 border-phase-research/30 text-phase-research hover:bg-phase-research/25 disabled:hover:bg-phase-research/15"
                : "bg-accent/15 border-accent/30 text-accent hover:bg-accent/25 disabled:hover:bg-accent/15"
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
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
