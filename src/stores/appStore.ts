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
  streamingContent: string;
  pendingUserPrompt: string | null;
  startStreaming: (userPrompt?: string) => void;
  stopStreaming: () => void;
  appendStreamContent: (chunk: string) => void;
  clearStreamContent: () => void;

  // Message history
  history: HistoryEntry[];
  clearHistory: () => void;

  // Error state
  error: string | null;
  setError: (error: string | null) => void;
}

let nextId = 1;
function genId() {
  return String(nextId++);
}

export const useAppStore = create<AppState>((set) => ({
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
  streamingContent: "",
  pendingUserPrompt: null,
  startStreaming: (userPrompt) => set({ isStreaming: true, streamingContent: "", pendingUserPrompt: userPrompt ?? null }),
  stopStreaming: () =>
    set((s) => {
      const entries: HistoryEntry[] = [];
      const phase = s.activePhase;
      const now = Date.now();

      // Add the user prompt that triggered this response
      if (s.pendingUserPrompt) {
        entries.push({ id: genId(), role: "user", content: s.pendingUserPrompt, phase, timestamp: now - 1 });
      }

      // Add assistant response
      if (s.streamingContent) {
        entries.push({ id: genId(), role: "assistant", content: s.streamingContent, phase, timestamp: now });
      }

      return {
        isStreaming: false,
        streamingContent: "",
        pendingUserPrompt: null,
        history: [...s.history, ...entries],
      };
    }),
  appendStreamContent: (chunk) =>
    set((s) => ({ streamingContent: s.streamingContent + chunk })),
  clearStreamContent: () => set({ streamingContent: "", isStreaming: false, pendingUserPrompt: null }),

  history: [],
  clearHistory: () => set({ history: [] }),

  error: null,
  setError: (error) => set({ error }),
}));
