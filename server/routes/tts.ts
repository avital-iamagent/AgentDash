import { Router } from "express";

export const ttsRoutes = Router();

// POST /api/tts — proxy text to ElevenLabs, return audio/mpeg
ttsRoutes.post("/", async (req, res) => {
  const { text } = req.body as { text?: string };
  if (!text) { res.status(400).json({ error: "text required" }); return; }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    res.status(500).json({ error: "ELEVENLABS_API_KEY not configured" });
    return;
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB"; // Adam

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );

    if (!upstream.ok) {
      const errText = await upstream.text();
      res.status(upstream.status).json({ error: errText });
      return;
    }

    const audioBuffer = await upstream.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(Buffer.from(audioBuffer));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
