import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import os from "os";
import type { RecentProject, RecentProjectsFile } from "../types/index.js";

export const projectRoutes = Router();

const RECENT_FILE = path.join(os.homedir(), ".agentdash", "recent.json");

// Active project directory — set when a project is opened
let activeProjectDir: string | null = null;

export function getActiveProjectDir(): string | null {
  return activeProjectDir;
}

// --- Helpers ---

async function readRecentFile(): Promise<RecentProjectsFile> {
  try {
    const data = await fs.readFile(RECENT_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return { projects: [] };
  }
}

async function writeRecentFile(data: RecentProjectsFile): Promise<void> {
  await fs.mkdir(path.dirname(RECENT_FILE), { recursive: true });
  await fs.writeFile(RECENT_FILE, JSON.stringify(data, null, 2));
}

async function addToRecent(dir: string, name: string): Promise<void> {
  const recent = await readRecentFile();
  // Remove existing entry for this dir, then prepend
  recent.projects = recent.projects.filter((p) => p.dir !== dir);
  recent.projects.unshift({ dir, name, lastOpened: new Date().toISOString() });
  // Keep max 20 recent projects
  recent.projects = recent.projects.slice(0, 20);
  await writeRecentFile(recent);
}

// Initial state files for a new project
function initialMeta(projectName: string): object {
  return {
    projectName,
    createdAt: new Date().toISOString(),
    activePhase: "brainstorm",
    phases: {
      brainstorm: { status: "active", startedAt: new Date().toISOString(), completedAt: null, artifactApproved: false, reviewReport: null },
      research: { status: "locked", startedAt: null, completedAt: null, artifactApproved: false, reviewReport: null },
      architecture: { status: "locked", startedAt: null, completedAt: null, artifactApproved: false, reviewReport: null },
      environment: { status: "locked", startedAt: null, completedAt: null, artifactApproved: false, reviewReport: null },
      tasks: { status: "locked", startedAt: null, completedAt: null, artifactApproved: false, reviewReport: null },
    },
    git: { enabled: false, branch: null, lastCommit: null, remoteUrl: null, authMethod: null },
  };
}

const INITIAL_STATES: Record<string, object> = {
  brainstorm: { updatedAt: null, updatedBy: "claude-code", cards: [], groups: [], tags: [] },
  research: { updatedAt: null, updatedBy: "claude-code", items: [], categories: ["competitor", "tech-stack", "pattern", "risk"], verdicts: ["adopt", "learn-from", "avoid", "needs-more-research"] },
  architecture: { updatedAt: null, updatedBy: "claude-code", components: [], decisions: [], diagrams: [], risks: [] },
  environment: { updatedAt: null, updatedBy: "claude-code", checklist: [], dependencies: [], configs: [], verification: [] },
  tasks: { updatedAt: null, updatedBy: "claude-code", tasks: [], milestones: [], currentTask: null },
};

// --- Routes ---

// GET /api/project/recent
projectRoutes.get("/recent", async (_req, res) => {
  const recent = await readRecentFile();
  res.json(recent);
});

// POST /api/project/open
projectRoutes.post("/open", async (req, res) => {
  const { dir } = req.body;
  if (!dir || typeof dir !== "string") {
    res.status(400).json({ error: "dir is required" });
    return;
  }

  const agentdashDir = path.join(dir, ".agentdash");
  const metaPath = path.join(agentdashDir, "meta.json");

  try {
    const metaRaw = await fs.readFile(metaPath, "utf-8");
    const meta = JSON.parse(metaRaw);
    activeProjectDir = dir;
    await addToRecent(dir, meta.projectName || path.basename(dir));
    res.json({ ok: true, meta });
  } catch {
    res.status(404).json({ error: "No .agentdash/ found in this directory. Use /api/project/create first." });
  }
});

// POST /api/project/create
projectRoutes.post("/create", async (req, res) => {
  const { dir, name } = req.body;
  if (!dir || typeof dir !== "string") {
    res.status(400).json({ error: "dir is required" });
    return;
  }

  const projectName = name || path.basename(dir);
  const agentdashDir = path.join(dir, ".agentdash");

  try {
    // Create directory structure
    const dirs = [
      agentdashDir,
      path.join(agentdashDir, "brainstorm"),
      path.join(agentdashDir, "research"),
      path.join(agentdashDir, "architecture"),
      path.join(agentdashDir, "environment"),
      path.join(agentdashDir, "tasks"),
      path.join(agentdashDir, "artifacts"),
      path.join(agentdashDir, "research-notes"),
      path.join(agentdashDir, "templates"),
    ];
    for (const d of dirs) {
      await fs.mkdir(d, { recursive: true });
    }

    // Write meta.json
    const meta = initialMeta(projectName);
    await fs.writeFile(path.join(agentdashDir, "meta.json"), JSON.stringify(meta, null, 2));

    // Write phase state files
    for (const [phase, state] of Object.entries(INITIAL_STATES)) {
      await fs.writeFile(path.join(agentdashDir, phase, "state.json"), JSON.stringify(state, null, 2));
    }

    // Write .gitkeep files
    await fs.writeFile(path.join(agentdashDir, "artifacts", ".gitkeep"), "");
    await fs.writeFile(path.join(agentdashDir, "research-notes", ".gitkeep"), "");

    // Copy templates from the AgentDash install
    const ownTemplatesDir = path.join(process.cwd(), ".agentdash", "templates");
    try {
      const templateFiles = await fs.readdir(ownTemplatesDir);
      for (const f of templateFiles) {
        if (f.endsWith(".template.md")) {
          const content = await fs.readFile(path.join(ownTemplatesDir, f), "utf-8");
          await fs.writeFile(path.join(agentdashDir, "templates", f), content);
        }
      }
    } catch {
      // Templates dir might not exist if creating in the same dir
    }

    activeProjectDir = dir;
    await addToRecent(dir, projectName);
    res.json({ ok: true, meta });
  } catch (err) {
    res.status(500).json({ error: `Failed to create project: ${err instanceof Error ? err.message : String(err)}` });
  }
});
