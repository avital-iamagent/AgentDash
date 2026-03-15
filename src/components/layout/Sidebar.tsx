import { useEffect } from "react";
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
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  // Cmd+B to toggle sidebar
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [toggleSidebar]);

  return (
    <aside
      className={`h-full bg-panel/80 backdrop-blur-xl border-r border-edge flex flex-col shrink-0 transition-all duration-200 ${
        collapsed ? "w-12" : "w-56"
      }`}
    >
      {/* Project header */}
      <div className={`border-b border-edge ${collapsed ? "px-2 pt-3 pb-2" : "px-4 pt-4 pb-3"}`}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5 mb-1"}`}>
          <button
            onClick={toggleSidebar}
            className="w-7 h-7 rounded-md bg-raised border border-edge flex items-center justify-center shrink-0 hover:bg-overlay transition-colors"
            title={collapsed ? "Expand sidebar (⌘B)" : "Collapse sidebar (⌘B)"}
          >
            <span className="text-sm font-bold text-phase-architecture">/</span>
          </button>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink truncate">
                {projectName || "AgentDash"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Phase stepper */}
      <div className={`flex-1 overflow-y-auto py-3 ${collapsed ? "px-1" : "px-2"}`}>
        {!collapsed && (
          <div className="text-[10px] font-mono uppercase tracking-wider text-ink-faint px-2 mb-2">
            Phases
          </div>
        )}
        <PhaseStepper collapsed={collapsed} />
      </div>

      {/* Research toggle */}
      <div className={`border-t border-edge ${collapsed ? "px-1 py-2" : "px-4 py-2.5"}`}>
        <button
          onClick={() => setResearchMode(!researchMode)}
          title={collapsed ? "Research mode" : undefined}
          className={`flex items-center rounded-lg transition-all ${
            collapsed
              ? `w-8 h-8 justify-center mx-auto ${
                  researchMode
                    ? "bg-phase-research/10 text-phase-research"
                    : "text-ink-muted hover:text-phase-research hover:bg-phase-research/5"
                }`
              : `w-full gap-2.5 px-2.5 py-2 text-sm font-medium ${
                  researchMode
                    ? "bg-phase-research/10 text-phase-research border-l-2 border-phase-research"
                    : "text-ink-muted hover:text-phase-research hover:bg-phase-research/5"
                }`
          }`}
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          {!collapsed && "Research"}
        </button>
      </div>

      {/* Git status — hidden when collapsed */}
      {!collapsed && <GitStatus />}

      {/* Footer */}
      <div className={`border-t border-edge ${collapsed ? "px-1 py-2" : "px-4 py-3 space-y-2"}`}>
        {collapsed ? (
          /* Collapsed: just icons stacked */
          <div className="flex flex-col items-center gap-2">
            <div
              className={`w-1.5 h-1.5 rounded-full ${wsConnected ? "bg-success" : "bg-phase-tasks"}`}
              style={wsConnected ? { animation: "pulse-dot 3s ease-in-out infinite" } : undefined}
              title={wsConnected ? "Connected" : "Disconnected"}
            />
            <button
              onClick={toggleTheme}
              className="w-7 h-7 rounded-md flex items-center justify-center text-ink-faint hover:text-ink-muted hover:bg-raised transition-all"
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
            <button
              onClick={clearProject}
              className="w-7 h-7 rounded-md flex items-center justify-center text-ink-faint hover:text-ink-muted hover:bg-raised transition-all"
              title="Switch project"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        ) : (
          <>
            {/* Connection status + theme toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${wsConnected ? "bg-success" : "bg-phase-tasks"}`}
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
          </>
        )}
      </div>
    </aside>
  );
}
