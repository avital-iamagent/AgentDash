import type { PhaseName } from "../../types";

const PERSONALITIES: Record<PhaseName, string> = {
  brainstorm: "Devil's Advocate",
  research: "Skeptical Analyst",
  architecture: "Pragmatic Engineer",
  environment: "Meticulous Ops",
  tasks: "Clear-Headed PM",
  coding: "Master Engineer",
};

interface PersonalityBadgeProps {
  phase: PhaseName;
  className?: string;
}

export default function PersonalityBadge({ phase, className = "" }: PersonalityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium ${className}`}
      style={{
        color: `var(--color-phase-${phase})`,
        backgroundColor: `color-mix(in srgb, var(--color-phase-${phase}) 12%, transparent)`,
      }}
    >
      {PERSONALITIES[phase]}
    </span>
  );
}
