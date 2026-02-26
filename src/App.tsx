import React, { useEffect, useState } from "react";
import { useAppStore } from "./stores/appStore";
import { useWebSocket } from "./hooks/useWebSocket";
import { useTTS } from "./hooks/useTTS";
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
import PermissionModal from "./components/shared/PermissionModal";
import QuestionForm from "./components/layout/QuestionForm";
import type { PhaseName } from "./types";

const MIN_STREAM_HEIGHT = 80;
const MAX_STREAM_HEIGHT_RATIO = 0.75;
const DEFAULT_STREAM_HEIGHT = 240;

type TabName = "data" | "artifact" | "review" | "notes";

const TABS: { key: TabName; label: string; hideForPhases?: string[] }[] = [
  { key: "data", label: "Board" },
  { key: "artifact", label: "Handoff", hideForPhases: ["tasks"] },
  { key: "review", label: "Validate", hideForPhases: ["tasks"] },
  { key: "notes", label: "Research Notes", hideForPhases: ["tasks"] },
];

function Dashboard() {
  const activePhase = useAppStore((s) => s.activePhase);
  const projectName = useAppStore((s) => s.projectName);
  const showWelcome = useAppStore((s) => s.showWelcome);
  const setShowWelcome = useAppStore((s) => s.setShowWelcome);
  const [activeTab, setActiveTab] = useState<TabName>("data");
  const [streamPanelHeight, setStreamPanelHeight] = useState(DEFAULT_STREAM_HEIGHT);
  const hasStreamContent = useAppStore(
    (s) => s.history.length > 0 || !!s.streamingContent || s.isStreaming || !!s.error
  );

  function handleDividerMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = streamPanelHeight;

    function onMouseMove(ev: MouseEvent) {
      const delta = startY - ev.clientY; // up = positive = expand stream panel
      const newHeight = Math.max(
        MIN_STREAM_HEIGHT,
        Math.min(window.innerHeight * MAX_STREAM_HEIGHT_RATIO, startHeight + delta)
      );
      setStreamPanelHeight(newHeight);
    }

    function onMouseUp() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  // Reset tab to "data" when phase changes
  useEffect(() => {
    setActiveTab("data");
  }, [activePhase]);

  // Initialize WebSocket connection
  useWebSocket();
  useTTS();

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

        {/* Welcome banner for new projects */}
        {showWelcome && (
          <div className="px-6 py-3 bg-phase-brainstorm/8 border-b border-phase-brainstorm/20 flex items-center justify-between animate-fade-up">
            <p className="text-sm text-ink-muted">
              <span className="text-phase-brainstorm font-medium">Welcome to {projectName}!</span>
              {" "}Start by describing your idea in the prompt below.
            </p>
            <button
              onClick={() => setShowWelcome(false)}
              className="text-ink-faint hover:text-ink-muted text-xs ml-4 shrink-0 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab bar */}
        <div className="px-6 flex gap-1 border-b border-edge bg-panel/30">
          {TABS.filter((tab) => !tab.hideForPhases?.includes(activePhase)).map((tab) => {
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

        {/* Draggable divider — only visible when stream panel has content */}
        {hasStreamContent && (
          <div
            className="relative flex items-center justify-center h-2 cursor-row-resize group shrink-0"
            onMouseDown={handleDividerMouseDown}
          >
            <div className="w-10 h-0.5 rounded-full bg-edge group-hover:bg-accent/50 transition-colors" />
          </div>
        )}

        {/* Streaming response display */}
        <StreamingDisplay height={hasStreamContent ? streamPanelHeight : undefined} />

        {/* Structured question form — shown when Claude asks numbered questions */}
        <QuestionForm />

        {/* Prompt input bar */}
        <PromptBar />
      </main>

      {/* Research save modal */}
      <ResearchSaveModal />

      {/* Permission request modal */}
      <PermissionModal />
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
