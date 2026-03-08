import { useAppStore } from "../../stores/appStore";
import PhaseStepper from "./PhaseStepper";
import GitStatus from "./GitStatus";

export default function Sidebar() {
  const projectName = useAppStore((s) => s.projectName);
  const wsConnected = useAppStore((s) => s.wsConnected);
  const clearProject = useAppStore((s) => s.clearProject);
  const researchMode = useAppStore((s) => s.researchMode);
  const setResearchMode = useAppStore((s) => s.setResearchMode);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);

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

      {/* Research toggle */}
      <div className="px-4 py-2.5 border-t border-edge">
        <button
          onClick={() => setResearchMode(!researchMode)}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all ${
            researchMode
              ? "bg-phase-research/10 text-phase-research border-l-2 border-phase-research"
              : "text-ink-muted hover:text-phase-research hover:bg-phase-research/5"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          Research
        </button>
      </div>

      {/* Git status */}
      <GitStatus />

      {/* Footer */}
      <div className="px-4 py-3 border-t border-edge space-y-2">
        {/* Connection status + theme toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                wsConnected ? "bg-success" : "bg-phase-tasks"
              }`}
              style={wsConnected ? { animation: "pulse-dot 3s ease-in-out infinite" } : undefined}
            />
            <span className="text-[11px] text-ink-faint font-mono">
              {wsConnected ? "connected" : "disconnected"}
            </span>
          </div>
          <button
            onClick={toggleTheme}
            className="w-6 h-6 rounded-md flex items-center justify-center text-ink-faint hover:text-ink-muted hover:bg-raised transition-all"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
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
