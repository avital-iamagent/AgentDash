import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getActiveProjectDir } from "./project.js";

export const visualsRoutes = Router();

interface VisualEntry {
  id: string;
  filename: string;
  userPrompt: string;
  imagePrompt: string;
  createdAt: string;
}

interface VisualsIndex {
  images: VisualEntry[];
}

function getVisualsDir(projectDir: string): string {
  return path.join(projectDir, ".agentdash", "tasks", "visuals");
}

function getIndexPath(projectDir: string): string {
  return path.join(getVisualsDir(projectDir), "index.json");
}

async function readIndex(projectDir: string): Promise<VisualsIndex> {
  try {
    const raw = await fs.readFile(getIndexPath(projectDir), "utf-8");
    return JSON.parse(raw);
  } catch {
    return { images: [] };
  }
}

async function writeIndex(projectDir: string, index: VisualsIndex): Promise<void> {
  await fs.mkdir(getVisualsDir(projectDir), { recursive: true });
  await fs.writeFile(getIndexPath(projectDir), JSON.stringify(index, null, 2));
}

async function craftImagePrompt(userPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return userPrompt;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system:
          "You are an expert image prompt engineer specializing in UI/UX mockups. " +
          "Convert a plain-English UI component description into a detailed, vivid image generation prompt. " +
          "The prompt should describe visual appearance, colors, layout, typography, and style in detail. " +
          "Output ONLY the optimized prompt — no preamble, no explanation.",
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) return userPrompt;

    const data = (await response.json()) as any;
    const text = data.content?.[0]?.text;
    return typeof text === "string" && text.trim() ? text.trim() : userPrompt;
  } catch {
    return userPrompt;
  }
}

async function generateImage(prompt: string): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY not set in environment");

  const model = "gemini-3.1-flash-image-preview";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as any;
  const base64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64) throw new Error("No image data in Gemini response");
  return base64;
}

// POST /api/visuals/generate
visualsRoutes.post("/generate", async (req, res) => {
  const dir = getActiveProjectDir();
  if (!dir) { res.status(400).json({ error: "No active project" }); return; }

  const { userPrompt } = req.body as { userPrompt?: string };
  if (!userPrompt?.trim()) { res.status(400).json({ error: "userPrompt required" }); return; }

  try {
    const imagePrompt = await craftImagePrompt(userPrompt.trim());
    const base64 = await generateImage(imagePrompt);

    const id = crypto.randomUUID();
    const filename = `${id}.png`;
    const visualsDir = getVisualsDir(dir);
    await fs.mkdir(visualsDir, { recursive: true });
    await fs.writeFile(path.join(visualsDir, filename), Buffer.from(base64, "base64"));

    const entry: VisualEntry = {
      id,
      filename,
      userPrompt: userPrompt.trim(),
      imagePrompt,
      createdAt: new Date().toISOString(),
    };

    const index = await readIndex(dir);
    index.images.push(entry);
    await writeIndex(dir, index);

    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// GET /api/visuals/list
visualsRoutes.get("/list", async (_req, res) => {
  const dir = getActiveProjectDir();
  if (!dir) { res.status(400).json({ error: "No active project" }); return; }

  try {
    const index = await readIndex(dir);
    res.json(index);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// GET /api/visuals/image/:filename
visualsRoutes.get("/image/:filename", async (req, res) => {
  const dir = getActiveProjectDir();
  if (!dir) { res.status(400).json({ error: "No active project" }); return; }

  const { filename } = req.params;
  // Allow only UUID-named .png files
  if (!/^[0-9a-f-]{36}\.png$/.test(filename)) {
    res.status(400).json({ error: "Invalid filename" });
    return;
  }

  const filePath = path.join(getVisualsDir(dir), filename);
  res.sendFile(filePath);
});
