import { useState, useEffect } from "react";
import { sendWsMessage } from "../../hooks/useWebSocket";
import { useAppStore } from "../../stores/appStore";

export default function QuestionForm() {
  const pendingQuestions = useAppStore((s) => s.pendingQuestions);
  const setPendingQuestions = useAppStore((s) => s.setPendingQuestions);
  const startStreaming = useAppStore((s) => s.startStreaming);
  const stopStreaming = useAppStore((s) => s.stopStreaming);
  const setError = useAppStore((s) => s.setError);
  const isStreaming = useAppStore((s) => s.isStreaming);
  const activePhase = useAppStore((s) => s.activePhase);
  const phaseColor = `var(--color-phase-${activePhase})`;

  const [answers, setAnswers] = useState<string[]>([]);

  useEffect(() => {
    if (pendingQuestions) setAnswers(pendingQuestions.map(() => ""));
  }, [pendingQuestions]);

  if (!pendingQuestions || pendingQuestions.length === 0) return null;

  function setAnswer(i: number, value: string) {
    setAnswers((prev) => prev.map((a, idx) => (idx === i ? value : a)));
  }

  function handleSubmit() {
    if (isStreaming) return;
    const filled = answers.map((a) => a.trim());
    if (filled.every((a) => !a)) return;

    const formatted = filled
      .map((a, i) => `${i + 1}. ${a || "(no answer)"}`)
      .join("\n");

    setError(null);
    setPendingQuestions(null);
    startStreaming(formatted);

    const sent = sendWsMessage({ type: "prompt", phase: activePhase, text: formatted });
    if (!sent) {
      stopStreaming();
      setError("WebSocket not connected.");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, i: number) {
    if (e.key === "Tab" && !e.shiftKey && i === (pendingQuestions?.length ?? 0) - 1) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="border-t border-edge bg-panel/40 px-5 py-4 space-y-3 shrink-0">
      <p className="text-[10px] font-mono uppercase tracking-wider text-ink-faint">
        Answer each question — then send
      </p>
      <div className="space-y-2.5">
        {pendingQuestions.map((q, i) => (
          <div key={i} className="flex gap-3 items-start">
            {/* Number badge */}
            <div
              className="shrink-0 w-5 h-5 rounded flex items-center justify-center mt-1.5"
              style={{ backgroundColor: `color-mix(in srgb, ${phaseColor} 15%, transparent)` }}
            >
              <span className="text-[10px] font-mono font-bold" style={{ color: phaseColor }}>{i + 1}</span>
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-xs text-ink-muted leading-snug">{q}</p>
              <textarea
                rows={2}
                value={answers[i] ?? ""}
                onChange={(e) => setAnswer(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                placeholder="Your answer..."
                className="w-full bg-raised border border-edge rounded-md px-3 py-1.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-edge-bright transition-colors resize-none"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => setPendingQuestions(null)}
          className="text-xs text-ink-faint hover:text-ink-muted transition-colors font-mono"
        >
          dismiss
        </button>
        <button
          onClick={handleSubmit}
          disabled={isStreaming}
          className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            color: phaseColor,
            backgroundColor: `color-mix(in srgb, ${phaseColor} 15%, transparent)`,
          }}
        >
          Send answers
        </button>
      </div>
    </div>
  );
}
