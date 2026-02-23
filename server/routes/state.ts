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
      environment: "environment-ready.md",
      tasks: "task-breakdown.md",
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

// GET /api/research-notes
stateRoutes.get("/research-notes", async (_req, res) => {
  try {
    const dir = requireProject();
    const notesDir = path.join(dir, ".agentdash", "research-notes");
    const files = await fs.readdir(notesDir);
    const notes = files.filter((f) => f.endsWith(".md")).sort().reverse();
    res.json({ notes });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("ENOENT")) {
      res.json({ notes: [] });
    } else {
      res.status(500).json({ error: message });
    }
  }
});
