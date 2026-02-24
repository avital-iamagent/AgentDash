import { useAppStore } from "../../stores/appStore";
import { sendWsMessage } from "../../hooks/useWebSocket";
import type { PhaseName, PhaseStatus } from "../../types";

function TTSToggle() {
  const ttsEnabled = useAppStore((s) => s.ttsEnabled);
  const setTtsEnabled = useAppStore((s) => s.setTtsEnabled);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setTtsEnabled(!ttsEnabled); }}
      title={ttsEnabled ? "Mute voice" : "Enable voice (ElevenLabs)"}
      className={`shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors ${
        ttsEnabled
          ? "text-phase-brainstorm"
          : "text-ink-faint hover:text-ink-muted"
      }`}
    >
      {ttsEnabled ? (
        // Talking head — animated mouth
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M10 2a6 6 0 00-6 6v1a6 6 0 0012 0V8a6 6 0 00-6-6zm-2 9a2 2 0 104 0H8z" />
          <path d="M5 17a1 1 0 000 2h10a1 1 0 000-2H5z" />
        </svg>
      ) : (
        // Muted head
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M10 2a6 6 0 00-6 6v1a6 6 0 0012 0V8a6 6 0 00-6-6zm0 10a2 2 0 01-2-2h4a2 2 0 01-2 2z" clipRule="evenodd" />
          <path d="M5 17a1 1 0 000 2h10a1 1 0 000-2H5z" />
        </svg>
      )}
    </button>
  );
}

const PHASES: { name: PhaseName; label: string; personality: string }[] = [
  { name: "brainstorm", label: "Brainstorm", personality: "Devil's Advocate" },
  { name: "research", label: "Research", personality: "Skeptical Analyst" },
  { name: "architecture", label: "Architecture", personality: "Pragmatic Engineer" },
  { name: "environment", label: "Environment", personality: "Meticulous Ops" },
  { name: "tasks", label: "Tasks", personality: "Clear-Headed PM" },
  { name: "coding", label: "Coding", personality: "Master Engineer" },
];

const PHASE_COLOR_CLASSES: Record<PhaseName, { dot: string; text: string; line: string }> = {
  brainstorm: { dot: "bg-phase-brainstorm", text: "text-phase-brainstorm", line: "bg-phase-brainstorm" },
  research: { dot: "bg-phase-research", text: "text-phase-research", line: "bg-phase-research" },
  architecture: { dot: "bg-phase-architecture", text: "text-phase-architecture", line: "bg-phase-architecture" },
  environment: { dot: "bg-phase-environment", text: "text-phase-environment", line: "bg-phase-environment" },
  tasks: { dot: "bg-phase-tasks", text: "text-phase-tasks", line: "bg-phase-tasks" },
  coding: { dot: "bg-phase-coding", text: "text-phase-coding", line: "bg-phase-coding" },
};

function getPhaseStatus(meta: { phases: Record<string, { status: PhaseStatus }> } | null, phase: PhaseName): PhaseStatus {
  return meta?.phases[phase]?.status || "locked";
}

export default function PhaseStepper() {
  const meta = useAppStore((s) => s.meta);
  const activePhase = useAppStore((s) => s.activePhase);
  const setActivePhase = useAppStore((s) => s.setActivePhase);
  const history = useAppStore((s) => s.history);
  const isStreaming = useAppStore((s) => s.isStreaming);
  const startStreaming = useAppStore((s) => s.startStreaming);
  const stopStreaming = useAppStore((s) => s.stopStreaming);

  function handlePhaseClick(phaseName: PhaseName) {
    setActivePhase(phaseName);

    // Auto kick-off if this phase has never been interacted with
    if (isStreaming) return;
    const hasHistory = history.some((e) => e.phase === phaseName);
    if (hasHistory) return;

    startStreaming();
    const sent = sendWsMessage({ type: "prompt", phase: phaseName, text: "begin" });
    if (!sent) stopStreaming();
  }

  return (
    <div className="space-y-0 stagger">
      {PHASES.map((phase, i) => {
        const status = getPhaseStatus(meta, phase.name);
        const isActive = activePhase === phase.name;
        const isClickable = status !== "locked";
        const colors = PHASE_COLOR_CLASSES[phase.name];
        const isLast = i === PHASES.length - 1;

        return (
          <div key={phase.name} className="relative">
            {/* Connecting line */}
            {!isLast && (
              <div
                className={`absolute left-[9px] top-[24px] w-[2px] h-[calc(100%-4px)] ${
                  status === "completed" ? colors.line + " opacity-40" : "bg-edge"
                }`}
              />
            )}

            <button
              onClick={() => isClickable && handlePhaseClick(phase.name)}
              disabled={!isClickable}
              className={`relative w-full flex items-start gap-3 px-2 py-2.5 rounded-md text-left transition-all ${
                isActive
                  ? "bg-raised"
                  : isClickable
                    ? "hover:bg-raised/50"
                    : "opacity-40 cursor-not-allowed"
              }`}
            >
              {/* Status dot */}
              <div className="relative shrink-0 mt-0.5">
                {status === "completed" ? (
                  <div className={`w-[20px] h-[20px] rounded-full ${colors.dot} flex items-center justify-center`}>
                    <svg className="w-3 h-3 text-canvas" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : status === "active" ? (
                  <div className={`w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center`}
                    style={{ borderColor: `var(--color-phase-${phase.name})` }}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${colors.dot}`}
                      style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
                    />
                  </div>
                ) : (
                  <div className="w-[20px] h-[20px] rounded-full border-2 border-edge" />
                )}
              </div>

              {/* Label */}
              <div className="min-w-0">
                <div
                  className={`text-sm font-medium leading-tight ${
                    isActive ? colors.text : status === "completed" ? "text-ink-muted" : "text-ink-faint"
                  }`}
                >
                  {phase.label}
                </div>
                {isActive && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-ink-faint font-mono">
                      {phase.personality}
                    </span>
                    {phase.name === "brainstorm" && <TTSToggle />}
                  </div>
                )}
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
