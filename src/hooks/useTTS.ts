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
  const clean = prepareForSpeech(text).trim();
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

/**
 * Stage 1: Strip block-level content from the accumulated buffer.
 * Removes complete fenced code blocks and markdown tables.
 * Holds back partial (unclosed) code blocks so they don't leak into TTS.
 */
function stripBlockContent(text: string): { cleaned: string; heldBack: string } {
  // Remove complete fenced code blocks (``` ... ```)
  let cleaned = text.replace(/```[\s\S]*?```/g, " ");

  // Hold back partial code blocks — opening ``` with no closing match
  const openFence = cleaned.lastIndexOf("```");
  let heldBack = "";
  if (openFence !== -1) {
    heldBack = cleaned.slice(openFence);
    cleaned = cleaned.slice(0, openFence);
  }

  // Remove complete markdown tables (lines with | and separator rows)
  cleaned = cleaned.replace(/(?:^|\n)\|[^\n]*\|[ \t]*(?:\n\|[\s:|-]*\|[ \t]*)?(?:\n\|[^\n]*\|[ \t]*)*/g, " ");

  // Turn newlines into sentence boundaries so bullet points, headings, and
  // short paragraphs each become their own TTS sentence instead of running together.
  // If a line doesn't already end with sentence-ending punctuation, append a period.
  cleaned = cleaned.replace(/([^\n.!?])\s*\n/g, "$1.\n");

  return { cleaned, heldBack };
}

/**
 * Stage 2: Transform a single sentence into natural-sounding speech.
 * Replaces the old stripMarkdown(). Order of operations matters.
 */
function prepareForSpeech(text: string): string {
  let s = text;

  // --- A. Structural markdown removal ---

  // Markdown images ![alt](url) → removed
  s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, "");

  // Markdown links [text](url) → keep text (BEFORE bare URL removal)
  s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");

  // Bare URLs → removed
  s = s.replace(/https?:\/\/[^\s)>,]+/g, "");

  // HTML tags → removed
  s = s.replace(/<[^>]+>/g, "");

  // Backtick code: short identifiers (≤30 chars, single word-like) → keep text;
  // longer or multi-word expressions → removed
  s = s.replace(/`([^`]*)`/g, (_match, inner: string) => {
    return inner.length <= 30 && /^[\w.-]+$/.test(inner) ? inner : " ";
  });

  // Headers ### → remove markers, keep text
  s = s.replace(/^#{1,6}\s+/gm, "");

  // Bold **text** (BEFORE italic *)
  s = s.replace(/\*\*(.+?)\*\*/g, "$1");

  // Strikethrough ~~text~~
  s = s.replace(/~~(.+?)~~/g, "$1");

  // Italic *text*
  s = s.replace(/\*(.+?)\*/g, "$1");

  // Remove any leftover * or ~ markers (orphaned from split across sentences)
  s = s.replace(/\*+/g, "");
  s = s.replace(/~+/g, "");

  // Horizontal rules
  s = s.replace(/^[-*_]{3,}\s*$/gm, "");

  // Blockquotes > → removed
  s = s.replace(/^\s*>+\s?/gm, "");

  // Bullet and number list markers
  s = s.replace(/^\s*[-*+]\s+/gm, "");
  s = s.replace(/^\s*\d+\.\s+/gm, "");

  // --- B. Symbol-to-speech conversions ---

  // Multi-char arrows first (before single-char)
  s = s.replace(/==>/g, "gives");
  s = s.replace(/-->/g, "leads to");
  s = s.replace(/<--/g, "from");
  s = s.replace(/=>/g, " gives ");
  s = s.replace(/->/g, " leads to ");
  s = s.replace(/<-/g, " from ");

  // Spaced logical/comparison operators (BEFORE standalone |)
  s = s.replace(/ && /g, " and ");
  s = s.replace(/ \|\| /g, " or ");
  s = s.replace(/ !== /g, " is not equal to ");
  s = s.replace(/ != /g, " is not equal to ");
  s = s.replace(/ === /g, " equals ");
  s = s.replace(/ == /g, " equals ");

  // Comment markers // → removed
  s = s.replace(/\/\//g, " ");

  // Standalone | (pipe) → removed
  s = s.replace(/\s\|\s/g, " ");

  // --- C. Technical cleanup ---

  // File paths /foo/bar/Baz.tsx → Baz.tsx (keep just filename)
  s = s.replace(/(?:\/[\w.-]+){2,}\/([\w.-]+)/g, "$1");

  // JSON-like {…} blocks → removed
  s = s.replace(/\{[^}]*\}/g, " ");

  // Bracket references [1], [2], (a), (b) → removed
  s = s.replace(/\[\d+\]/g, "");
  s = s.replace(/\([a-z]\)/g, "");

  // Emoji → removed (covers most common emoji ranges)
  s = s.replace(
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu,
    ""
  );

  // --- D. Whitespace normalization (always last) ---

  // Collapse multiple spaces and newlines
  s = s.replace(/\s+/g, " ");

  // Remove orphaned punctuation (e.g., lonely periods, commas after removals)
  s = s.replace(/\s([.,;:!?])/g, "$1");
  s = s.replace(/([.,;:!?]){2,}/g, "$1");

  return s.trim();
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
  const heldBackRef = useRef("");
  const prevLengthRef = useRef(0);
  const wasStreamingRef = useRef(false);

  // Reset on new stream start
  useEffect(() => {
    if (isStreaming && !wasStreamingRef.current) {
      stopAll();
      sentenceBufferRef.current = "";
      heldBackRef.current = "";
      prevLengthRef.current = 0;
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming]);

  // Process each new chunk of streamed text
  useEffect(() => {
    if (!ttsEnabled || !isStreaming) return;

    const newText = streamingContent.slice(prevLengthRef.current);
    prevLengthRef.current = streamingContent.length;
    if (!newText) return;

    // Reassemble: previous remainder + previous heldBack + new text
    const rawBuffer = sentenceBufferRef.current + heldBackRef.current + newText;

    // Stage 1: strip block content (code blocks, tables, partial fences)
    const { cleaned, heldBack } = stripBlockContent(rawBuffer);
    heldBackRef.current = heldBack;

    // Stage 2 happens inside enqueue (prepareForSpeech per sentence)
    const { sentences, remainder } = extractSentences(cleaned);
    sentenceBufferRef.current = remainder;
    sentences.forEach(enqueue);
  }, [streamingContent, isStreaming, ttsEnabled, activePhase]);

  // Flush any remaining buffer when streaming ends (discard heldBack — unclosed code block)
  useEffect(() => {
    if (isStreaming || !wasStreamingRef.current) return;
    heldBackRef.current = ""; // discard partial code blocks
    if (ttsEnabled && sentenceBufferRef.current.trim()) {
      enqueue(sentenceBufferRef.current);
      sentenceBufferRef.current = "";
    }
  }, [isStreaming, ttsEnabled, activePhase]);

  // Stop audio immediately when TTS toggled off
  useEffect(() => {
    if (!ttsEnabled) stopAll();
  }, [ttsEnabled]);
}
