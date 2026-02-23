import { useAppStore } from "../../stores/appStore";
import PhaseStepper from "./PhaseStepper";
import GitStatus from "./GitStatus";

export default function Sidebar() {
  const projectName = useAppStore((s) => s.projectName);
  const wsConnected = useAppStore((s) => s.wsConnected);
  const clearProject = useAppStore((s) => s.clearProject);

  return (
    <aside className="w-56 h-full bg-panel border-r border-edge flex flex-col shrink-0">
      {/* Project header */}
      <div className="px-4 pt-4 pb-3 border-b border-edge">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-md bg-raised border border-edge flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-phase-architecture">/</span>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink truncate">
              {projectName || "AgentDash"}
            </div>
          </div>
        </div>
      </div>

      {/* Phase stepper */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <div className="text-[10px] font-mono uppercase tracking-wider text-ink-faint px-2 mb-2">
          Phases
        </div>
        <PhaseStepper />
      </div>

      {/* Git status */}
      <GitStatus />

      {/* Footer */}
      <div className="px-4 py-3 border-t border-edge space-y-2">
        {/* Connection status */}
        <div className="flex items-center gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              wsConnected ? "bg-phase-environment" : "bg-phase-tasks"
            }`}
            style={wsConnected ? { animation: "pulse-dot 3s ease-in-out infinite" } : undefined}
          />
          <span className="text-[11px] text-ink-faint font-mono">
            {wsConnected ? "connected" : "disconnected"}
          </span>
        </div>

        {/* Back to projects */}
        <button
          onClick={clearProject}
          className="text-[11px] text-ink-faint hover:text-ink-muted transition-colors font-mono"
        >
          &larr; switch project
        </button>
      </div>
    </aside>
  );
}
