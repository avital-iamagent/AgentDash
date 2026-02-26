import { Router } from "express";
import { KokoroTTS } from "kokoro-js";

export const ttsRoutes = Router();

const DEFAULT_VOICE = "af_heart";
let ttsInstance: Promise<KokoroTTS> | null = null;

function getTTS(): Promise<KokoroTTS> {
  if (!ttsInstance) {
    ttsInstance = KokoroTTS.from_pretrained(
      "onnx-community/Kokoro-82M-v1.0-ONNX",
      { dtype: "fp32" }
    );
  }
  return ttsInstance;
}

function float32ToWav(samples: Float32Array, sampleRate: number): Buffer {
  const buf = Buffer.alloc(44 + samples.length * 2);
  // RIFF header
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write("WAVE", 8, "ascii");
  // fmt chunk
  buf.write("fmt ", 12, "ascii");
  buf.writeUInt32LE(16, 16);        // chunk size
  buf.writeUInt16LE(1, 20);         // PCM format
  buf.writeUInt16LE(1, 22);         // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32);         // block align
  buf.writeUInt16LE(16, 34);        // bits per sample
  // data chunk
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
}

// POST /api/tts — local Kokoro inference, returns audio/wav
ttsRoutes.post("/", async (req, res) => {
  const { text } = req.body as { text?: string };
  if (!text) { res.status(400).json({ error: "text required" }); return; }

  try {
    const tts = await getTTS();
    const audio = await tts.generate(text, { voice: DEFAULT_VOICE, speed: 1.25 });
    const wavBuffer = float32ToWav(audio.audio, 24000);
    res.setHeader("Content-Type", "audio/wav");
    res.send(wavBuffer);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
