import { create } from "zustand";

interface AppState {
  // Project state (null = show start screen)
  projectDir: string | null;
  projectName: string | null;
  setProject: (dir: string, name: string) => void;
  clearProject: () => void;

  // Phase state
  activePhase: string;
  setActivePhase: (phase: string) => void;

  // Connection state
  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;

  // Streaming state
  isStreaming: boolean;
  streamingContent: string;
  setStreaming: (streaming: boolean, content?: string) => void;
  appendStreamContent: (chunk: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  projectDir: null,
  projectName: null,
  setProject: (dir, name) => set({ projectDir: dir, projectName: name }),
  clearProject: () => set({ projectDir: null, projectName: null, activePhase: "brainstorm" }),

  activePhase: "brainstorm",
  setActivePhase: (phase) => set({ activePhase: phase }),

  wsConnected: false,
  setWsConnected: (connected) => set({ wsConnected: connected }),

  isStreaming: false,
  streamingContent: "",
  setStreaming: (streaming, content = "") =>
    set({ isStreaming: streaming, streamingContent: content }),
  appendStreamContent: (chunk) =>
    set((s) => ({ streamingContent: s.streamingContent + chunk })),
}));
