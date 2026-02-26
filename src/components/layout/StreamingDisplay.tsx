import { useRef, useEffect } from "react";
import Markdown from "react-markdown";
import { useAppStore } from "../../stores/appStore";
import type { HistoryEntry } from "../../stores/appStore";

const TOOL_LABELS: Record<string, string> = {
  Read: "Reading file",
  Bash: "Running command",
  Grep: "Searching code",
  Glob: "Finding files",
  Write: "Writing file",
  Edit: "Editing file",
  WebSearch: "Searching the web",
  WebFetch: "Fetching page",
  Skill: "Running skill",
  Task: "Running agent",
};

export default function StreamingDisplay({ height }: { height?: number }) {
  const isStreaming = useAppStore((s) => s.isStreaming);
  const isResearchStream = useAppStore((s) => s.isResearchStream);
  const streamingContent = useAppStore((s) => s.streamingContent);
  const pendingUserPrompt = useAppStore((s) => s.pendingUserPrompt);
  const toolActivity = useAppStore((s) => s.toolActivity);
  const error = useAppStore((s) => s.error);
  const setError = useAppStore((s) => s.setError);
  const history = useAppStore((s) => s.history);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom during streaming or when history grows
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamingContent, isStreaming, history.length]);

  const hasContent = history.length > 0 || streamingContent || isStreaming || error;

  if (!hasContent) {
    return null;
  }

  return (
    <div className="border-t border-edge bg-canvas/50">
      <div
        className="overflow-y-auto"
        style={height !== undefined ? { height } : { maxHeight: "40vh" }}
      >
        <div className="px-5 py-4 space-y-4">
          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 animate-fade-up">
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

          {/* Message history */}
          {history.map((entry) => (
            <HistoryMessage key={entry.id} entry={entry} />
          ))}

          {/* Current in-flight: user prompt waiting for response */}
          {pendingUserPrompt && (
            <div className="flex gap-3 animate-fade-up">
              <div className="shrink-0 w-5 h-5 rounded bg-accent/15 flex items-center justify-center mt-0.5">
                <span className="text-[10px] font-mono font-bold text-accent">U</span>
              </div>
              <p className="text-sm text-ink">{pendingUserPrompt}</p>
            </div>
          )}

          {/* Streaming content */}
          {streamingContent && (
            <div className="prose-stream text-sm animate-fade-in">
              <Markdown>{streamingContent}</Markdown>
            </div>
          )}

          {/* Streaming indicator — pre-text thinking or tool activity */}
          {isStreaming && (!streamingContent || toolActivity) && (
            <ActivityIndicator
              toolActivity={toolActivity}
              isResearchStream={isResearchStream}
              hasContent={!!streamingContent}
            />
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}

function HistoryMessage({ entry }: { entry: HistoryEntry }) {
  if (entry.role === "user") {
    return (
      <div className="flex gap-3">
        <div className="shrink-0 w-5 h-5 rounded bg-accent/15 flex items-center justify-center mt-0.5">
          <span className="text-[10px] font-mono font-bold text-accent">U</span>
        </div>
        <p className="text-sm text-ink">{entry.content}</p>
      </div>
    );
  }

  return (
    <div className="prose-stream text-sm border-l-2 border-edge pl-3">
      <Markdown>{entry.content}</Markdown>
    </div>
  );
}

function ActivityIndicator({
  toolActivity,
  isResearchStream,
  hasContent,
}: {
  toolActivity: { toolName: string; elapsedSeconds: number } | null;
  isResearchStream: boolean;
  hasContent: boolean;
}) {
  const toolLabel = toolActivity
    ? TOOL_LABELS[toolActivity.toolName] ?? toolActivity.toolName
    : null;

  const label = toolLabel
    ? `${toolLabel}  ${Math.round(toolActivity!.elapsedSeconds)}s`
    : isResearchStream
      ? "Researching..."
      : "Claude is thinking...";

  const dotColor = isResearchStream ? "bg-phase-research/50" : "bg-ink-faint";
  const textColor = hasContent ? "text-ink-faint" : isResearchStream ? "text-phase-research" : "text-ink-muted";

  return (
    <div className={`flex items-center gap-2 text-sm animate-fade-up ${textColor}`}>
      <div className="flex gap-1">
        <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} style={{ animation: "pulse-dot 1.2s ease-in-out infinite" }} />
        <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} style={{ animation: "pulse-dot 1.2s ease-in-out 0.2s infinite" }} />
        <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} style={{ animation: "pulse-dot 1.2s ease-in-out 0.4s infinite" }} />
      </div>
      <span className="font-mono text-xs">{label}</span>
    </div>
  );
}
