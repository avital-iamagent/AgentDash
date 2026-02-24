import { create } from "zustand";
import type { Meta, PhaseName } from "../types";

export interface HistoryEntry {
  id: string;
  role: "user" | "assistant";
  content: string;
  phase: PhaseName;
  timestamp: number;
}

interface AppState {
  // Project identity (null = show start screen)
  projectDir: string | null;
  projectName: string | null;
  setProject: (dir: string, name: string) => void;
  clearProject: () => void;

  // Project metadata from meta.json
  meta: Meta | null;
  setMeta: (meta: Meta) => void;

  // Which phase the user is viewing in the UI
  activePhase: PhaseName;
  setActivePhase: (phase: PhaseName) => void;

  // WebSocket connection
  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;

  // Streaming state
  isStreaming: boolean;
  isResearchStream: boolean;
  streamingContent: string;
  pendingUserPrompt: string | null;
  startStreaming: (userPrompt?: string, isResearch?: boolean) => void;
  stopStreaming: () => void;
  appendStreamContent: (chunk: string) => void;
  clearStreamContent: () => void;

  // Message history (persisted to .agentdash/history.json)
  history: HistoryEntry[];
  loadHistory: () => Promise<void>;
  clearHistory: () => void;

  // Research mode & save modal
  researchMode: boolean;
  setResearchMode: (on: boolean) => void;
  researchResult: { question: string; content: string } | null;
  showResearchSave: boolean;
  dismissResearchSave: () => void;

  // Error state
  error: string | null;
  setError: (error: string | null) => void;
}

let nextId = 1;
function genId() {
  return String(nextId++);
}

/** Save history to server (fire-and-forget) */
function persistHistory(entries: HistoryEntry[]) {
  fetch("/api/history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entries),
  }).catch(() => {
    // silent — best effort persistence
  });
}

export const useAppStore = create<AppState>((set, get) => ({
  projectDir: null,
  projectName: null,
  setProject: (dir, name) => set({ projectDir: dir, projectName: name }),
  clearProject: () =>
    set({
      projectDir: null,
      projectName: null,
      meta: null,
      activePhase: "brainstorm",
      isStreaming: false,
      streamingContent: "",
      pendingUserPrompt: null,
      history: [],
      isResearchStream: false,
      researchMode: false,
      researchResult: null,
      showResearchSave: false,
      error: null,
    }),

  meta: null,
  setMeta: (meta) =>
    set({
      meta,
      activePhase: meta.activePhase,
      projectName: meta.projectName,
    }),

  activePhase: "brainstorm",
  setActivePhase: (phase) => set({ activePhase: phase }),

  wsConnected: false,
  setWsConnected: (connected) => set({ wsConnected: connected }),

  isStreaming: false,
  isResearchStream: false,
  streamingContent: "",
  pendingUserPrompt: null,
  startStreaming: (userPrompt, isResearch) => set({
    isStreaming: true,
    isResearchStream: isResearch ?? false,
    streamingContent: "",
    pendingUserPrompt: userPrompt ?? null,
  }),
  stopStreaming: () => {
    const s = get();
    const entries: HistoryEntry[] = [];
    const phase = s.activePhase;
    const now = Date.now();

    if (s.pendingUserPrompt) {
      entries.push({ id: genId(), role: "user", content: s.pendingUserPrompt, phase, timestamp: now - 1 });
    }
    if (s.streamingContent) {
      entries.push({ id: genId(), role: "assistant", content: s.streamingContent, phase, timestamp: now });
    }

    const newHistory = [...s.history, ...entries];

    // If this was a research stream with content, show the save modal
    const researchUpdate = s.isResearchStream && s.streamingContent
      ? {
          researchResult: { question: s.pendingUserPrompt || "", content: s.streamingContent },
          showResearchSave: true,
        }
      : {};

    set({
      isStreaming: false,
      isResearchStream: false,
      streamingContent: "",
      pendingUserPrompt: null,
      history: newHistory,
      ...researchUpdate,
    });

    persistHistory(newHistory);
  },
  appendStreamContent: (chunk) =>
    set((s) => ({ streamingContent: s.streamingContent + chunk })),
  clearStreamContent: () => set({ streamingContent: "", isStreaming: false, pendingUserPrompt: null }),

  history: [],
  loadHistory: async () => {
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const entries: HistoryEntry[] = await res.json();
        if (Array.isArray(entries) && entries.length > 0) {
          // Advance the ID counter past any loaded IDs
          const maxId = Math.max(...entries.map((e) => Number(e.id) || 0));
          if (maxId >= nextId) nextId = maxId + 1;
          set({ history: entries });
        }
      }
    } catch {
      // silent — history will just start empty
    }
  },
  clearHistory: () => {
    set({ history: [] });
    persistHistory([]);
  },

  researchMode: false,
  setResearchMode: (on) => set({ researchMode: on }),
  researchResult: null,
  showResearchSave: false,
  dismissResearchSave: () => set({ researchResult: null, showResearchSave: false }),

  error: null,
  setError: (error) => set({ error }),
}));
