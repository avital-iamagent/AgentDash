import { useAppStore } from "../../stores/appStore";
import type { PhaseName } from "../../types";

const PHASE_CONFIG: Record<PhaseName, { letter: string; noun: string; action: string }> = {
  brainstorm:   { letter: "B", noun: "ideas",           action: "start brainstorming" },
  research:     { letter: "R", noun: "research items",  action: "start research" },
  architecture: { letter: "A", noun: "architecture",    action: "start designing" },
  environment:  { letter: "E", noun: "checklist items", action: "start environment setup" },
  tasks:        { letter: "T", noun: "tasks",           action: "break down tasks" },
};

interface PhaseEmptyStateProps {
  phase: PhaseName;
}

export default function PhaseEmptyState({ phase }: PhaseEmptyStateProps) {
  const meta = useAppStore((s) => s.meta);
  const phaseStatus = meta?.phases[phase]?.status;
  const config = PHASE_CONFIG[phase];

  const isCompleted = phaseStatus === "completed";
  const isLocked = phaseStatus === "locked";

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center animate-fade-up">
        <div
          className="w-12 h-12 rounded-xl border-2 mx-auto mb-4 flex items-center justify-center"
          style={{
            borderColor: `var(--color-phase-${phase})`,
            backgroundColor: `color-mix(in srgb, var(--color-phase-${phase}) 8%, transparent)`,
          }}
        >
          <span className="text-lg" style={{ color: `var(--color-phase-${phase})` }}>
            {config.letter}
          </span>
        </div>

        {isCompleted ? (
          <>
            <p className="text-ink-muted text-sm">Phase completed</p>
            <p className="text-ink-faint text-xs mt-1 font-mono">
              No {config.noun} were recorded
            </p>
          </>
        ) : isLocked ? (
          <>
            <p className="text-ink-muted text-sm">Phase locked</p>
            <p className="text-ink-faint text-xs mt-1 font-mono">
              Complete earlier phases to unlock
            </p>
          </>
        ) : (
          <>
            <p className="text-ink-muted text-sm">No {config.noun} yet</p>
            <p className="text-ink-faint text-xs mt-1 font-mono">
              Send a prompt to {config.action}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
