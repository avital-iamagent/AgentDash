import { useEffect } from "react";
import { useAppStore } from "./stores/appStore";
import { useWebSocket } from "./hooks/useWebSocket";
import { useMeta } from "./hooks/usePhaseState";
import StartScreen from "./components/start/StartScreen";
import Sidebar from "./components/layout/Sidebar";
import PhaseHeader from "./components/layout/PhaseHeader";
import PromptBar from "./components/layout/PromptBar";
import StreamingDisplay from "./components/layout/StreamingDisplay";
import BrainstormBoard from "./components/phases/BrainstormBoard";
import ResearchGrid from "./components/phases/ResearchGrid";
import ArchitectureView from "./components/phases/ArchitectureView";
import EnvironmentChecklist from "./components/phases/EnvironmentChecklist";
import TaskBoard from "./components/phases/TaskBoard";
import type { PhaseName } from "./types";

function Dashboard() {
  const activePhase = useAppStore((s) => s.activePhase);

  // Initialize WebSocket connection
  useWebSocket();

  // Auto-refresh meta on file changes
  const { data: metaData } = useMeta();
  const setMeta = useAppStore((s) => s.setMeta);
  const loadHistory = useAppStore((s) => s.loadHistory);

  useEffect(() => {
    if (metaData) {
      setMeta(metaData as ReturnType<typeof useAppStore.getState>["meta"] & object);
    }
  }, [metaData, setMeta]);

  // Load persisted history on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

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
          <PhaseContent phase={activePhase} />
        </div>

        {/* Streaming response display */}
        <StreamingDisplay />

        {/* Prompt input bar */}
        <PromptBar />
      </main>
    </div>
  );
}

const PHASE_VIEWS: Record<PhaseName, React.ComponentType> = {
  brainstorm: BrainstormBoard,
  research: ResearchGrid,
  architecture: ArchitectureView,
  environment: EnvironmentChecklist,
  tasks: TaskBoard,
};

function PhaseContent({ phase }: { phase: PhaseName }) {
  const View = PHASE_VIEWS[phase];
  return <View />;
}

export default function App() {
  const projectDir = useAppStore((s) => s.projectDir);

  if (!projectDir) {
    return <StartScreen />;
  }

  return <Dashboard />;
}
