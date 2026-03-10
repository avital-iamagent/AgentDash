import { useState, useCallback } from "react";
import { sendWsMessage } from "./useWebSocket";
import { useAppStore } from "../stores/appStore";

export interface Attachment {
  id: string;
  name: string;
  data: string; // base64 without prefix
  mimeType: string;
  dataUrl: string; // full data URL for thumbnail preview
}

interface UsePromptResult {
  prompt: string;
  setPrompt: (text: string) => void;
  submit: () => void;
  submitResearch: () => void;
  isStreaming: boolean;
  attachments: Attachment[];
  addAttachments: (files: FileList | File[]) => void;
  removeAttachment: (id: string) => void;
}

function genId() {
  return crypto.randomUUID();
}

/**
 * Manages prompt input state, submission via WebSocket,
 * and streaming response tracking.
 */
export function usePrompt(): UsePromptResult {
  const [prompt, setPrompt] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const isStreaming = useAppStore((s) => s.isStreaming);
  const activePhase = useAppStore((s) => s.activePhase);
  const startStreaming = useAppStore((s) => s.startStreaming);
  const stopStreaming = useAppStore((s) => s.stopStreaming);
  const setError = useAppStore((s) => s.setError);
  const setPendingQuestions = useAppStore((s) => s.setPendingQuestions);

  const addAttachments = useCallback((files: FileList | File[]) => {
    try {
      const fileArray = Array.from(files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (fileArray.length === 0) return;

      for (const file of fileArray) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(",")[1] || "";
            setAttachments((prev) => [
              ...prev,
              {
                id: genId(),
                name: file.name,
                data: base64,
                mimeType: file.type || "image/png",
                dataUrl,
              },
            ]);
          } catch (err) {
            console.error("[AgentDash] Failed to process attachment:", err);
          }
        };
        reader.onerror = () => {
          console.error("[AgentDash] FileReader error for:", file.name);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error("[AgentDash] Failed to add attachments:", err);
    }
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  const submit = useCallback(() => {
    const text = prompt.trim();
    if ((!text && attachments.length === 0) || isStreaming) return;

    setError(null);
    setPendingQuestions(null);
    startStreaming(text || "(screenshot attached)");

    const msg: Record<string, unknown> = {
      type: "prompt",
      phase: activePhase,
      text: text || "Please analyze the attached screenshot(s).",
    };

    if (attachments.length > 0) {
      msg.attachments = attachments.map((a) => ({
        name: a.name,
        data: a.data,
        mimeType: a.mimeType,
      }));
    }

    const sent = sendWsMessage(msg);

    if (!sent) {
      stopStreaming();
      setError("WebSocket not connected. Waiting for reconnection...");
      return;
    }

    setPrompt("");
    clearAttachments();
  }, [prompt, attachments, isStreaming, activePhase, startStreaming, stopStreaming, setError, clearAttachments]);

  const submitResearch = useCallback(() => {
    const text = prompt.trim();
    if (!text || isStreaming) return;

    setError(null);
    startStreaming(text, true);

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

  return { prompt, setPrompt, submit, submitResearch, isStreaming, attachments, addAttachments, removeAttachment };
}
