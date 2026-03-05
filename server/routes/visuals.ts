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

export async function readIndex(projectDir: string): Promise<VisualsIndex> {
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

/**
 * Auto-generate a visual from a UI description (fire-and-forget).
 * Called by the prompt handler when Claude's response describes UI components.
 */
export async function autoGenerateVisual(projectDir: string, uiDescription: string): Promise<string | null> {
  try {
    console.log(`[AgentDash] Auto-generating visual: ${uiDescription.slice(0, 60)}...`);

    const imagePrompt = await craftImagePrompt(uiDescription);
    const base64 = await generateImage(imagePrompt);

    const id = crypto.randomUUID();
    const filename = `${id}.png`;
    const visualsDir = getVisualsDir(projectDir);
    await fs.mkdir(visualsDir, { recursive: true });
    await fs.writeFile(path.join(visualsDir, filename), Buffer.from(base64, "base64"));

    const entry: VisualEntry = {
      id,
      filename,
      userPrompt: uiDescription,
      imagePrompt,
      createdAt: new Date().toISOString(),
    };

    const index = await readIndex(projectDir);
    index.images.push(entry);
    await writeIndex(projectDir, index);

    console.log(`[AgentDash] Visual auto-generated: ${filename}`);
    return id;
  } catch (err) {
    console.error(`[AgentDash] Auto-visual generation failed:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Use Haiku to match a UI description to the most relevant task.
 * Returns the task ID or null if no match.
 */
export async function matchTaskForDesign(projectDir: string, uiDescription: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const statePath = path.join(projectDir, ".agentdash", "tasks", "state.json");
    const raw = await fs.readFile(statePath, "utf-8");
    const state = JSON.parse(raw);
    const tasks = state.tasks as { id: string; title: string; description: string }[];
    if (!tasks || tasks.length === 0) return null;

    const taskList = tasks.map((t) => `${t.id}: ${t.title}`).join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        system:
          "You match a UI design description to the most relevant task from a list. " +
          "Respond with ONLY the task ID (UUID) of the best match. " +
          "If no task is a reasonable match, respond with exactly: NO_MATCH",
        messages: [{
          role: "user",
          content: `UI description:\n${uiDescription.slice(0, 2000)}\n\nTasks:\n${taskList}`,
        }],
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as any;
    const result = data.content?.[0]?.text?.trim();
    if (!result || result === "NO_MATCH") return null;

    // Validate that the returned ID actually exists in the task list
    const matched = tasks.find((t) => t.id === result);
    return matched ? result : null;
  } catch {
    return null;
  }
}

/**
 * Link a visual to a task by updating the task's designNotes and visualId in state.json.
 */
export async function linkVisualToTask(
  projectDir: string,
  taskId: string,
  visualId: string,
  designNotes: string
): Promise<void> {
  try {
    const statePath = path.join(projectDir, ".agentdash", "tasks", "state.json");
    const raw = await fs.readFile(statePath, "utf-8");
    const state = JSON.parse(raw);

    const task = state.tasks?.find((t: any) => t.id === taskId);
    if (!task) return;

    task.designNotes = designNotes;
    task.visualId = visualId;
    state.updatedAt = new Date().toISOString();
    state.updatedBy = "claude-code";

    await fs.writeFile(statePath, JSON.stringify(state, null, 2));
    console.log(`[AgentDash] Linked visual ${visualId.slice(0, 8)}... to task "${task.title}"`);
  } catch (err) {
    console.error(`[AgentDash] Failed to link visual to task:`, err instanceof Error ? err.message : err);
  }
}

/**
 * Use Haiku to detect if text describes UI components and extract a visual description.
 * Returns the description to visualize, or null if the text isn't UI-related.
 */
export async function detectUIDescription(text: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  // Skip very short responses
  if (text.length < 100) return null;

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
        max_tokens: 300,
        system:
          "You analyze text to determine if it describes a UI component, screen, or visual interface design. " +
          "If it does, extract a concise visual description suitable for image generation — focus on appearance " +
          "(layout, colors, typography, spacing, visual elements) not code or logic. " +
          "If the text does NOT describe any UI or visual interface, respond with exactly: NO_UI\n" +
          "If it DOES, respond with ONLY the visual description — no preamble.",
        messages: [{ role: "user", content: text.slice(0, 4000) }],
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as any;
    const result = data.content?.[0]?.text?.trim();
    if (!result || result === "NO_UI") return null;
    return result;
  } catch {
    return null;
  }
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
