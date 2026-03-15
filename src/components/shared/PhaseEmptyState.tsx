import type { ReactNode } from "react";
import { useAppStore } from "../../stores/appStore";
import type { PhaseName } from "../../types";

const PHASE_CONFIG: Record<PhaseName, {
  noun: string;
  action: string;
  hint: string;
  icon: (color: string) => ReactNode;
}> = {
  brainstorm: {
    noun: "ideas",
    action: "start brainstorming",
    hint: "Describe your project idea and goals",
    icon: (c) => (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  research: {
    noun: "research items",
    action: "start research",
    hint: "Ask a question or request an investigation",
    icon: (c) => (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" />
        <path d="M11 8v6M8 11h6" />
      </svg>
    ),
  },
  architecture: {
    noun: "architecture",
    action: "start designing",
    hint: "Describe your system requirements",
    icon: (c) => (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <path d="M10 6.5h4M6.5 10v4M17.5 10v4M10 17.5h4" />
      </svg>
    ),
  },
  tasks: {
    noun: "tasks",
    action: "break down tasks",
    hint: "Ask to break the project into tasks",
    icon: (c) => (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 14l2 2 4-4" />
      </svg>
    ),
  },
  design: {
    noun: "design reviews",
    action: "start design review",
    hint: "Review UI tasks and discuss visual direction",
    icon: (c) => (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
      </svg>
    ),
  },
  coding: {
    noun: "code changes",
    action: "start coding",
    hint: "Pick a task and start implementing",
    icon: (c) => (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
        <line x1="14" y1="4" x2="10" y2="20" />
      </svg>
    ),
  },
};

interface PhaseEmptyStateProps {
  phase: PhaseName;
}

export default function PhaseEmptyState({ phase }: PhaseEmptyStateProps) {
  const meta = useAppStore((s) => s.meta);
  const phaseStatus = meta?.phases[phase]?.status;
  const config = PHASE_CONFIG[phase];
  const phaseColor = `var(--color-phase-${phase})`;

  const isCompleted = phaseStatus === "completed";
  const isLocked = phaseStatus === "locked";

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center animate-fade-up max-w-xs">
        {/* Icon container with glow */}
        <div
          className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center relative"
          style={{
            backgroundColor: `color-mix(in srgb, ${phaseColor} 8%, transparent)`,
            boxShadow: isLocked ? "none" : `0 0 30px 0 color-mix(in srgb, ${phaseColor} 10%, transparent)`,
          }}
        >
          <div style={{ opacity: isLocked ? 0.4 : 0.8 }}>
            {config.icon(isLocked ? "var(--color-ink-faint)" : phaseColor)}
          </div>
        </div>

        {isCompleted ? (
          <>
            <p className="text-ink-muted text-sm font-medium">Phase completed</p>
            <p className="text-ink-faint text-xs mt-1.5">
              No {config.noun} were recorded
            </p>
          </>
        ) : isLocked ? (
          <>
            <p className="text-ink-muted text-sm font-medium">Phase locked</p>
            <p className="text-ink-faint text-xs mt-1.5">
              Complete earlier phases to unlock
            </p>
          </>
        ) : (
          <>
            <p className="text-ink text-sm font-medium">No {config.noun} yet</p>
            <p className="text-ink-faint text-xs mt-1.5 leading-relaxed">
              {config.hint}
            </p>

            {/* Keyboard shortcut hint */}
            <div className="mt-5 flex items-center justify-center gap-2 text-ink-faint">
              <span className="text-[11px]">Press</span>
              <kbd
                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border"
                style={{
                  borderColor: `color-mix(in srgb, ${phaseColor} 25%, transparent)`,
                  color: phaseColor,
                  backgroundColor: `color-mix(in srgb, ${phaseColor} 5%, transparent)`,
                }}
              >
                /
              </kbd>
              <span className="text-[11px]">to start typing</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
