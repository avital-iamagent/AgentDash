import { useEffect } from "react";
import { useAppStore } from "./stores/appStore";
import { useWebSocket } from "./hooks/useWebSocket";
import { useMeta } from "./hooks/usePhaseState";
import StartScreen from "./components/start/StartScreen";
import Sidebar from "./components/layout/Sidebar";
import PhaseHeader from "./components/layout/PhaseHeader";
import PromptBar from "./components/layout/PromptBar";
import StreamingDisplay from "./components/layout/StreamingDisplay";

function Dashboard() {
  const activePhase = useAppStore((s) => s.activePhase);

  // Initialize WebSocket connection
  useWebSocket();

  // Auto-refresh meta on file changes
  const { data: metaData } = useMeta();
  const setMeta = useAppStore((s) => s.setMeta);

  useEffect(() => {
    if (metaData) {
      setMeta(metaData as ReturnType<typeof useAppStore.getState>["meta"] & object);
    }
  }, [metaData, setMeta]);

  return (
    <div className="flex h-screen bg-canvas">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Phase header */}
        <div className="px-6 pt-5 pb-4 border-b border-edge bg-panel/50">
          <PhaseHeader />
        </div>

        {/* Phase content area */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <PhaseContentPlaceholder phase={activePhase} />
        </div>

        {/* Streaming response display */}
        <StreamingDisplay />

        {/* Prompt input bar */}
        <PromptBar />
      </main>
    </div>
  );
}

/**
 * Placeholder for phase-specific views.
 * Will be replaced with actual phase components in Milestone 5.
 */
function PhaseContentPlaceholder({ phase }: { phase: string }) {
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
          <span
            className="text-lg font-mono font-bold"
            style={{ color: `var(--color-phase-${phase})` }}
          >
            {phase[0].toUpperCase()}
          </span>
        </div>
        <p className="text-ink-muted text-sm">
          Start by sending a prompt below
        </p>
        <p className="text-ink-faint text-xs mt-1 font-mono">
          Phase views coming in Milestone 5
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const projectDir = useAppStore((s) => s.projectDir);

  if (!projectDir) {
    return <StartScreen />;
  }

  return <Dashboard />;
}
