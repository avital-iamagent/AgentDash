import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { metaSchema, phaseSchemas } from "../services/schema.js";
import { isValidPhase } from "../types/index.js";
import { getActiveProjectDir } from "./project.js";

export const stateRoutes = Router();

function requireProject(): string {
  const dir = getActiveProjectDir();
  if (!dir) throw new Error("No project is currently open");
  return dir;
}

// GET /api/meta
stateRoutes.get("/meta", async (_req, res) => {
  try {
    const dir = requireProject();
    const raw = await fs.readFile(path.join(dir, ".agentdash", "meta.json"), "utf-8");
    const parsed = metaSchema.parse(JSON.parse(raw));
    res.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "No project is currently open") {
      res.status(400).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

// GET /api/phase/:name/state
stateRoutes.get("/phase/:name/state", async (req, res) => {
  try {
    const dir = requireProject();
    const { name } = req.params;
    if (!isValidPhase(name)) {
      res.status(404).json({ error: `Unknown phase: ${name}` });
      return;
    }
    const raw = await fs.readFile(path.join(dir, ".agentdash", name, "state.json"), "utf-8");
    const json = JSON.parse(raw);
    const schema = phaseSchemas[name];
    const result = schema.safeParse(json);
    if (!result.success) {
      // Log for debugging but still return the raw data — don't block the UI
      console.warn(`[AgentDash] ${name}/state.json schema warning:`, result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; "));
      res.json(json);
    } else {
      res.json(result.data);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("ENOENT")) {
      res.status(404).json({ error: "State file not found" });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

// GET /api/phase/:name/artifact
stateRoutes.get("/phase/:name/artifact", async (req, res) => {
  try {
    const dir = requireProject();
    const { name } = req.params;
    if (!isValidPhase(name)) {
      res.status(404).json({ error: `Unknown phase: ${name}` });
      return;
    }

    const artifactNames: Record<string, string> = {
      brainstorm: "concept-brief.md",
      research: "research-decisions.md",
      architecture: "architecture-spec.md",
      tasks: "task-breakdown.md",
      design: "design-brief.md",
    };

    const artifactPath = path.join(dir, ".agentdash", "artifacts", artifactNames[name]);
    const content = await fs.readFile(artifactPath, "utf-8");
    res.json({ phase: name, content });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("ENOENT")) {
      res.status(404).json({ error: "No artifact yet for this phase" });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

// GET /api/phase/:name/review
stateRoutes.get("/phase/:name/review", async (req, res) => {
  try {
    const dir = requireProject();
    const { name } = req.params;
    if (!isValidPhase(name)) {
      res.status(404).json({ error: `Unknown phase: ${name}` });
      return;
    }

    const reviewPath = path.join(dir, ".agentdash", name, "review-report.md");
    const content = await fs.readFile(reviewPath, "utf-8");
    res.json({ phase: name, content });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("ENOENT")) {
      res.status(404).json({ error: "No review report yet for this phase" });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

// GET /api/templates/:name
stateRoutes.get("/templates/:name", async (req, res) => {
  try {
    const dir = requireProject();
    const { name } = req.params;
    const templatePath = path.join(dir, ".agentdash", "templates", `${name}.template.md`);
    const content = await fs.readFile(templatePath, "utf-8");
    res.json({ name, content });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("ENOENT")) {
      res.status(404).json({ error: "Template not found" });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

// GET /api/history
stateRoutes.get("/history", async (_req, res) => {
  try {
    const dir = requireProject();
    const historyPath = path.join(dir, ".agentdash", "history.json");
    const raw = await fs.readFile(historyPath, "utf-8");
    res.json(JSON.parse(raw));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("ENOENT")) {
      res.json([]);
    } else {
      res.status(500).json({ error: message });
    }
  }
});

// POST /api/history
stateRoutes.post("/history", async (req, res) => {
  try {
    const dir = requireProject();
    const historyPath = path.join(dir, ".agentdash", "history.json");
    await fs.writeFile(historyPath, JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// GET /api/research-notes — aggregates notes from all phase dirs
stateRoutes.get("/research-notes", async (_req, res) => {
  try {
    const dir = requireProject();
    const allNotes: string[] = [];
    const phases = ["brainstorm", "research", "architecture", "tasks", "design", "coding"];
    for (const phase of phases) {
      const notesDir = path.join(dir, ".agentdash", phase, "research-notes");
      try {
        const files = await fs.readdir(notesDir);
        for (const f of files) {
          if (f.endsWith(".md")) {
            allNotes.push(`${phase}/${f}`);
          }
        }
      } catch {
        // directory doesn't exist for this phase — skip
      }
    }
    allNotes.sort().reverse();
    res.json({ notes: allNotes });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "No project is currently open") {
      res.status(400).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

// POST /api/research-notes — save a note to a specific phase
stateRoutes.post("/research-notes", async (req, res) => {
  try {
    const dir = requireProject();
    const { phase, question, content } = req.body;

    const validPhases = ["brainstorm", "research", "architecture", "tasks", "design", "coding"];
    if (!phase || !validPhases.includes(phase)) {
      res.status(400).json({ error: "Invalid phase" });
      return;
    }
    if (!content || typeof content !== "string") {
      res.status(400).json({ error: "Content is required" });
      return;
    }

    // Generate filename: <timestamp>-<slug>.md
    const now = new Date();
    const ts = now.toISOString().replace(/:/g, "-").replace(/\.\d+Z$/, "");
    const slug = (typeof question === "string" && question.trim()
      ? question.trim()
      : "research-note"
    ).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
    const filename = `${ts}-${slug}.md`;

    const notesDir = path.join(dir, ".agentdash", phase, "research-notes");
    await fs.mkdir(notesDir, { recursive: true });

    const header = question ? `# ${question}\n\n` : "";
    await fs.writeFile(path.join(notesDir, filename), header + content);
    res.json({ ok: true, filename: `${phase}/${filename}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// GET /api/research-notes/:phase/:filename
stateRoutes.get("/research-notes/:phase/:filename", async (req, res) => {
  try {
    const dir = requireProject();
    const { phase, filename } = req.params;

    const validPhases = ["brainstorm", "research", "architecture", "tasks", "design", "coding"];
    if (!validPhases.includes(phase)) {
      res.status(400).json({ error: "Invalid phase" });
      return;
    }
    if (!filename.endsWith(".md") || filename.includes("/") || filename.includes("..")) {
      res.status(400).json({ error: "Invalid filename" });
      return;
    }

    const notePath = path.join(dir, ".agentdash", phase, "research-notes", filename);
    const content = await fs.readFile(notePath, "utf-8");
    res.json({ filename, phase, content });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("ENOENT")) {
      res.status(404).json({ error: "Note not found" });
    } else {
      res.status(500).json({ error: message });
    }
  }
});
