import { useAppStore } from "../../stores/appStore";
import type { PhaseName } from "../../types";

const PHASE_INFO: Record<PhaseName, { label: string; personality: string; description: string }> = {
  brainstorm: {
    label: "Brainstorm",
    personality: "Devil's Advocate",
    description: "Stress-testing ideas, challenging assumptions, forcing clarity",
  },
  research: {
    label: "Research",
    personality: "Skeptical Analyst",
    description: "Evidence-driven analysis, comparing alternatives, citing sources",
  },
  architecture: {
    label: "Architecture",
    personality: "Pragmatic Engineer",
    description: "Designing components, defining interfaces, managing complexity",
  },
  environment: {
    label: "Environment",
    personality: "Meticulous Ops",
    description: "Verifying tools, pinning dependencies, running checklists",
  },
  tasks: {
    label: "Tasks",
    personality: "Clear-Headed PM",
    description: "Breaking down work, ordering dependencies, defining done",
  },
  design: {
    label: "Design",
    personality: "Creative Director",
    description: "Reviewing UI tasks, discussing visual design, generating reference mockups",
  },
  coding: {
    label: "Coding",
    personality: "Master Engineer",
    description: "Implementing tasks, committing code, tracking progress",
  },
};

export default function PhaseHeader() {
  const activePhase = useAppStore((s) => s.activePhase);
  const meta = useAppStore((s) => s.meta);
  const info = PHASE_INFO[activePhase];
  const phaseStatus = meta?.phases[activePhase]?.status;

  return (
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-ink">{info.label}</h2>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium"
            style={{
              color: `var(--color-phase-${activePhase})`,
              backgroundColor: `color-mix(in srgb, var(--color-phase-${activePhase}) 12%, transparent)`,
            }}
          >
            {info.personality}
          </span>
          {phaseStatus === "completed" && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono text-phase-environment bg-phase-environment/10">
              completed
            </span>
          )}
        </div>
        <p className="text-sm text-ink-muted mt-1">{info.description}</p>
      </div>
    </div>
  );
}
