import { useState, useCallback } from "react";
import { sendWsMessage } from "./useWebSocket";
import { useAppStore } from "../stores/appStore";

interface UsePromptResult {
  prompt: string;
  setPrompt: (text: string) => void;
  submit: () => void;
  submitResearch: () => void;
  isStreaming: boolean;
}

/**
 * Manages prompt input state, submission via WebSocket,
 * and streaming response tracking.
 */
export function usePrompt(): UsePromptResult {
  const [prompt, setPrompt] = useState("");
  const isStreaming = useAppStore((s) => s.isStreaming);
  const activePhase = useAppStore((s) => s.activePhase);
  const startStreaming = useAppStore((s) => s.startStreaming);
  const stopStreaming = useAppStore((s) => s.stopStreaming);
  const setError = useAppStore((s) => s.setError);

  const submit = useCallback(() => {
    const text = prompt.trim();
    if (!text || isStreaming) return;

    setError(null);
    startStreaming();

    const sent = sendWsMessage({
      type: "prompt",
      phase: activePhase,
      text,
    });

    if (!sent) {
      stopStreaming();
      setError("WebSocket not connected. Waiting for reconnection...");
      return;
    }

    setPrompt("");
  }, [prompt, isStreaming, activePhase, startStreaming, stopStreaming, setError]);

  const submitResearch = useCallback(() => {
    const text = prompt.trim();
    if (!text || isStreaming) return;

    setError(null);
    startStreaming();

    const sent = sendWsMessage({
      type: "research",
      text,
    });

    if (!sent) {
      stopStreaming();
      setError("WebSocket not connected. Waiting for reconnection...");
      return;
    }

    setPrompt("");
  }, [prompt, isStreaming, startStreaming, stopStreaming, setError]);

  return { prompt, setPrompt, submit, submitResearch, isStreaming };
}
