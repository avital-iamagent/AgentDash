import { create } from "zustand";
import type { Meta, PhaseName } from "../types";

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
  startStreaming: () => void;
  stopStreaming: () => void;
  appendStreamContent: (chunk: string) => void;
  clearStreamContent: () => void;

  // Error state
  error: string | null;
  setError: (error: string | null) => void;
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
  startStreaming: () => set({ isStreaming: true, streamingContent: "" }),
  stopStreaming: () => set({ isStreaming: false }),
  appendStreamContent: (chunk) =>
    set((s) => ({ streamingContent: s.streamingContent + chunk })),
  clearStreamContent: () => set({ streamingContent: "", isStreaming: false }),

  error: null,
  setError: (error) => set({ error }),
}));
