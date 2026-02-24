import { useEffect, useRef } from "react";
import { useAppStore } from "../stores/appStore";

// --- Audio queue (module-level singleton) ---

const queue: string[] = [];
let isProcessing = false;
let currentAudio: HTMLAudioElement | null = null;

function stopAll() {
  queue.length = 0;
  isProcessing = false;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;
  while (queue.length > 0) {
    const text = queue.shift()!;
    await playText(text);
  }
  isProcessing = false;
}

function enqueue(text: string) {
  const clean = stripMarkdown(text).trim();
  if (clean.length < 5) return;
  queue.push(clean);
  processQueue();
}

async function playText(text: string): Promise<void> {
  return new Promise((resolve) => {
    fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then((res) => {
        if (!res.ok) { resolve(); return; }
        return res.blob();
      })
      .then((blob) => {
        if (!blob) { resolve(); return; }
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        currentAudio = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          if (currentAudio === audio) currentAudio = null;
          resolve();
        };
        audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
        audio.play().catch(() => resolve());
      })
      .catch(() => resolve());
  });
}

/** Remove markdown syntax before sending to TTS */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "");
}

/**
 * Split text into complete sentences and a leftover partial sentence.
 * Batches short sentences (< 60 chars) with the next one to avoid tiny TTS requests.
 */
function extractSentences(text: string): { sentences: string[]; remainder: string } {
  const sentenceRegex = /([^.!?]*[.!?]+)\s*/g;
  const sentences: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = sentenceRegex.exec(text)) !== null) {
    const s = match[1].trim();
    if (s) sentences.push(s);
    lastIndex = match.index + match[0].length;
  }

  // Merge very short sentences with the next to reduce round-trips
  const merged: string[] = [];
  let buffer = "";
  for (const s of sentences) {
    buffer = buffer ? `${buffer} ${s}` : s;
    if (buffer.length >= 60) {
      merged.push(buffer);
      buffer = "";
    }
  }
  if (buffer) merged.push(buffer); // flush remaining complete sentences

  return { sentences: merged, remainder: text.slice(lastIndex) };
}

// --- Hook ---

export function useTTS() {
  const isStreaming = useAppStore((s) => s.isStreaming);
  const ttsEnabled = useAppStore((s) => s.ttsEnabled);
  const activePhase = useAppStore((s) => s.activePhase);
  const streamingContent = useAppStore((s) => s.streamingContent);

  const sentenceBufferRef = useRef("");
  const prevLengthRef = useRef(0);
  const wasStreamingRef = useRef(false);

  // Reset on new stream start
  useEffect(() => {
    if (isStreaming && !wasStreamingRef.current) {
      stopAll();
      sentenceBufferRef.current = "";
      prevLengthRef.current = 0;
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming]);

  // Process each new chunk of streamed text
  useEffect(() => {
    if (!ttsEnabled || activePhase !== "brainstorm" || !isStreaming) return;

    const newText = streamingContent.slice(prevLengthRef.current);
    prevLengthRef.current = streamingContent.length;
    if (!newText) return;

    sentenceBufferRef.current += newText;
    const { sentences, remainder } = extractSentences(sentenceBufferRef.current);
    sentenceBufferRef.current = remainder;
    sentences.forEach(enqueue);
  }, [streamingContent, isStreaming, ttsEnabled, activePhase]);

  // Flush any remaining buffer when streaming ends
  useEffect(() => {
    if (isStreaming || !wasStreamingRef.current) return;
    if (ttsEnabled && activePhase === "brainstorm" && sentenceBufferRef.current.trim()) {
      enqueue(sentenceBufferRef.current);
      sentenceBufferRef.current = "";
    }
  }, [isStreaming, ttsEnabled, activePhase]);

  // Stop audio immediately when TTS toggled off
  useEffect(() => {
    if (!ttsEnabled) stopAll();
  }, [ttsEnabled]);
}
