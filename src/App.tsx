import { useEffect, useState } from "react";
import { useAppStore } from "./stores/appStore";
import { useWebSocket } from "./hooks/useWebSocket";
import { useMeta } from "./hooks/usePhaseState";
import StartScreen from "./components/start/StartScreen";
import Sidebar from "./components/layout/Sidebar";
import PhaseHeader from "./components/layout/PhaseHeader";
import PromptBar from "./components/layout/PromptBar";
import StreamingDisplay from "./components/layout/StreamingDisplay";
import ArtifactPreview from "./components/artifact/ArtifactPreview";
import ReviewPanel from "./components/layout/ReviewPanel";
import BrainstormBoard from "./components/phases/BrainstormBoard";
import ResearchGrid from "./components/phases/ResearchGrid";
import ArchitectureView from "./components/phases/ArchitectureView";
import EnvironmentChecklist from "./components/phases/EnvironmentChecklist";
import TaskBoard from "./components/phases/TaskBoard";
import ResearchNotesPanel from "./components/notes/ResearchNotesPanel";
import ResearchSaveModal from "./components/notes/ResearchSaveModal";
import type { PhaseName } from "./types";

type TabName = "data" | "artifact" | "review" | "notes";

const TABS: { key: TabName; label: string }[] = [
  { key: "data", label: "Data" },
  { key: "artifact", label: "Artifact" },
  { key: "review", label: "Review" },
  { key: "notes", label: "Notes" },
];

function Dashboard() {
  const activePhase = useAppStore((s) => s.activePhase);
  const [activeTab, setActiveTab] = useState<TabName>("data");

  // Reset tab to "data" when phase changes
  useEffect(() => {
    setActiveTab("data");
  }, [activePhase]);

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

        {/* Tab bar */}
        <div className="px-6 flex gap-1 border-b border-edge bg-panel/30">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const tabColor = tab.key === "notes"
              ? "var(--color-phase-research)"
              : `var(--color-phase-${activePhase})`;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="relative px-3 py-2 text-sm font-medium transition-colors"
                style={{
                  color: isActive ? tabColor : "var(--color-ink-muted)",
                }}
              >
                {tab.label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[2px]"
                    style={{ backgroundColor: tabColor }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Phase content area */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeTab === "data" && <PhaseContent phase={activePhase} />}
          {activeTab === "artifact" && <ArtifactPreview phase={activePhase} />}
          {activeTab === "review" && <ReviewPanel phase={activePhase} />}
          {activeTab === "notes" && <ResearchNotesPanel />}
        </div>

        {/* Streaming response display */}
        <StreamingDisplay />

        {/* Prompt input bar */}
        <PromptBar />
      </main>

      {/* Research save modal */}
      <ResearchSaveModal />
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
