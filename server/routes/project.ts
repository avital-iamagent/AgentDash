import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import type { RecentProject, RecentProjectsFile } from "../types/index.js";
import { detectGitStatus } from "./git.js";
import { runMigrations, LATEST_VERSION } from "../services/migrate.js";
import { checkAuth } from "../services/claude.js";

const execFileAsync = promisify(execFile);

/** Resolve the AgentDash installation root (where .claude/ and .agentdash/templates/ live) */
const __dirnameRoutes = path.dirname(fileURLToPath(import.meta.url));
const AGENTDASH_ROOT = process.env.AGENTDASH_ROOT || path.resolve(__dirnameRoutes, "..", "..");

export const projectRoutes = Router();

const RECENT_FILE = path.join(os.homedir(), ".agentdash", "recent.json");

// Active project directory — set when a project is opened
let activeProjectDir: string | null = null;

// Callback invoked when the active project changes
let onProjectOpenCallback: (() => void) | null = null;

export function getActiveProjectDir(): string | null {
  return activeProjectDir;
}

export function setOnProjectOpen(cb: () => void) {
  onProjectOpenCallback = cb;
}

function setActiveProject(dir: string) {
  activeProjectDir = dir;
  onProjectOpenCallback?.();
}

// --- Helpers ---

/** Path to AgentDash's own .claude/ directory (source of truth for skills/rules) */
const AGENTDASH_CLAUDE_DIR = path.join(AGENTDASH_ROOT, ".claude");

/**
 * Ensure .agentdash/ is listed in the project's .gitignore.
 * Prevents accidental commits that could lead to data loss on revert.
 */
async function ensureGitignore(projectDir: string): Promise<void> {
  const gitignorePath = path.join(projectDir, ".gitignore");
  let content = "";
  try {
    content = await fs.readFile(gitignorePath, "utf-8");
  } catch {
    // No .gitignore yet
  }
  if (!content.split("\n").some((line) => line.trim() === ".agentdash/" || line.trim() === ".agentdash")) {
    const newline = content.length > 0 && !content.endsWith("\n") ? "\n" : "";
    await fs.writeFile(gitignorePath, content + newline + ".agentdash/\n");
  }
}

/**
 * Scaffold .claude/ directory into a user project so the SDK can find
 * skills, CLAUDE.md, and rules when running with cwd = projectDir.
 * Overwrites existing files to keep them in sync with the AgentDash install.
 */
async function scaffoldClaudeDir(projectDir: string): Promise<void> {
  const targetClaude = path.join(projectDir, ".claude");

  // Copy CLAUDE.md
  const srcClaude = path.join(AGENTDASH_CLAUDE_DIR, "CLAUDE.md");
  await fs.mkdir(targetClaude, { recursive: true });
  await fs.copyFile(srcClaude, path.join(targetClaude, "CLAUDE.md"));

  // Copy rules/
  const srcRules = path.join(AGENTDASH_CLAUDE_DIR, "rules");
  const targetRules = path.join(targetClaude, "rules");
  await fs.mkdir(targetRules, { recursive: true });
  const ruleFiles = await fs.readdir(srcRules);
  for (const f of ruleFiles) {
    await fs.copyFile(path.join(srcRules, f), path.join(targetRules, f));
  }

  // Copy skills/ (each skill is a directory with SKILL.md)
  const srcSkills = path.join(AGENTDASH_CLAUDE_DIR, "skills");
  const targetSkills = path.join(targetClaude, "skills");
  const skillDirs = await fs.readdir(srcSkills);
  for (const skillDir of skillDirs) {
    const srcSkillDir = path.join(srcSkills, skillDir);
    const stat = await fs.stat(srcSkillDir);
    if (!stat.isDirectory()) continue;
    const targetSkillDir = path.join(targetSkills, skillDir);
    await fs.mkdir(targetSkillDir, { recursive: true });
    const skillFiles = await fs.readdir(srcSkillDir);
    for (const f of skillFiles) {
      await fs.copyFile(path.join(srcSkillDir, f), path.join(targetSkillDir, f));
    }
  }
}

/**
 * Sync template files from AgentDash install into the project's .agentdash/templates/.
 */
async function syncTemplates(projectDir: string): Promise<void> {
  const ownTemplatesDir = path.join(AGENTDASH_ROOT, ".agentdash", "templates");
  const targetTemplatesDir = path.join(projectDir, ".agentdash", "templates");
  await fs.mkdir(targetTemplatesDir, { recursive: true });
  try {
    const templateFiles = await fs.readdir(ownTemplatesDir);
    for (const f of templateFiles) {
      if (f.endsWith(".template.md")) {
        const content = await fs.readFile(path.join(ownTemplatesDir, f), "utf-8");
        await fs.writeFile(path.join(targetTemplatesDir, f), content);
      }
    }
  } catch {
    // Templates dir might not exist in dev
  }
}

/** Expand ~ to home directory and resolve to absolute path */
function resolvePath(input: string): string {
  let resolved = input.trim();
  if (resolved.startsWith("~/") || resolved === "~") {
    resolved = path.join(os.homedir(), resolved.slice(1));
  }
  return path.resolve(resolved);
}

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
    schemaVersion: LATEST_VERSION,
    projectName,
    createdAt: new Date().toISOString(),
    activePhase: "brainstorm",
    phases: {
      brainstorm: { status: "active", startedAt: new Date().toISOString(), completedAt: null, artifactApproved: false, reviewReport: null },
      research: { status: "locked", startedAt: null, completedAt: null, artifactApproved: false, reviewReport: null },
      architecture: { status: "locked", startedAt: null, completedAt: null, artifactApproved: false, reviewReport: null },
      tasks: { status: "locked", startedAt: null, completedAt: null, artifactApproved: false, reviewReport: null },
      design: { status: "locked", startedAt: null, completedAt: null, artifactApproved: false, reviewReport: null },
      coding: { status: "locked", startedAt: null, completedAt: null, artifactApproved: false, reviewReport: null },
    },
    git: { enabled: false, branch: null, lastCommit: null, remoteUrl: null, authMethod: null, gitDismissed: false },
  };
}

export const INITIAL_STATES: Record<string, object> = {
  brainstorm: { updatedAt: null, updatedBy: "claude-code", cards: [], groups: [], tags: [] },
  research: { updatedAt: null, updatedBy: "claude-code", items: [], categories: ["competitor", "tech-stack", "pattern", "risk"], verdicts: ["adopt", "learn-from", "avoid", "needs-more-research"] },
  architecture: { updatedAt: null, updatedBy: "claude-code", components: [], decisions: [], diagrams: [], risks: [] },
  tasks: { updatedAt: null, updatedBy: "claude-code", tasks: [], milestones: [], currentTask: null },
  design: { updatedAt: null, updatedBy: "claude-code", reviewedTasks: [], designTheme: null, colorPalette: null, typography: null, notes: null },
  coding: { updatedAt: null, updatedBy: "claude-code" },
};

// --- Routes ---

// GET /api/project/recent
projectRoutes.get("/recent", async (_req, res) => {
  const recent = await readRecentFile();
  res.json(recent);
});

// DELETE /api/project/recent — remove a single entry by dir
projectRoutes.delete("/recent", async (req, res) => {
  const { dir } = req.body as { dir?: string };
  if (!dir) { res.status(400).json({ error: "dir required" }); return; }
  const recent = await readRecentFile();
  recent.projects = recent.projects.filter((p) => p.dir !== dir);
  await writeRecentFile(recent);
  res.json({ ok: true });
});

// GET /api/project/pick-folder — open native macOS Finder dialog
projectRoutes.get("/pick-folder", async (_req, res) => {
  try {
    const { stdout } = await execFileAsync("osascript", [
      "-e",
      'POSIX path of (choose folder with prompt "Select project directory")',
    ]);
    const dir = stdout.trim().replace(/\/$/, ""); // remove trailing slash
    res.json({ dir });
  } catch {
    // User cancelled the dialog
    res.json({ dir: null });
  }
});

// POST /api/project/check-auth — verify Claude Code authentication is valid
projectRoutes.post("/check-auth", async (req, res) => {
  const dir = req.body?.dir || activeProjectDir;
  if (!dir) {
    res.status(400).json({ ok: false, error: "No project directory available" });
    return;
  }
  try {
    const result = await checkAuth(dir);
    res.json(result);
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/project/open
projectRoutes.post("/open", async (req, res) => {
  const { dir } = req.body;
  if (!dir || typeof dir !== "string") {
    res.status(400).json({ error: "dir is required" });
    return;
  }

  const resolvedDir = resolvePath(dir);
  const agentdashDir = path.join(resolvedDir, ".agentdash");
  const metaPath = path.join(agentdashDir, "meta.json");

  try {
    // Check if .agentdash/ exists
    try {
      await fs.access(agentdashDir);
    } catch {
      res.status(404).json({ error: "No .agentdash/ found in this directory. Use /api/project/create first." });
      return;
    }

    // If meta.json is missing but .agentdash/ exists, regenerate it
    try {
      await fs.access(metaPath);
    } catch {
      console.log("[AgentDash] meta.json missing, regenerating from existing project state...");
      const projectName = path.basename(resolvedDir);
      const meta = initialMeta(projectName);
      // Try to detect which phases have state files and mark them accordingly
      for (const phase of ["brainstorm", "research", "architecture", "tasks", "design", "coding"] as const) {
        const statePath = path.join(agentdashDir, phase, "state.json");
        try {
          await fs.access(statePath);
          // State file exists — ensure the directory is there
        } catch {
          // Create missing phase dir and state file
          await fs.mkdir(path.join(agentdashDir, phase), { recursive: true });
          const initial = INITIAL_STATES[phase];
          if (initial) {
            await fs.writeFile(statePath, JSON.stringify(initial, null, 2));
          }
        }
      }
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
    }

    // Run migrations first (upgrades schema, adds missing phases/dirs)
    const meta = await runMigrations(resolvedDir);

    // Auto-detect git: if directory is a git repo but meta says disabled, populate git fields
    if (!meta.git?.enabled) {
      const gitInfo = await detectGitStatus(resolvedDir);
      if (gitInfo.isGitRepo) {
        meta.git = {
          ...meta.git,
          enabled: true,
          branch: gitInfo.branch,
          lastCommit: gitInfo.lastCommit,
          remoteUrl: gitInfo.remoteUrl,
          gitDismissed: meta.git?.gitDismissed ?? false,
        };
        await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
      }
    }

    await scaffoldClaudeDir(resolvedDir);
    await syncTemplates(resolvedDir);
    await ensureGitignore(resolvedDir);
    setActiveProject(resolvedDir);
    await addToRecent(resolvedDir, meta.projectName || path.basename(resolvedDir));
    res.json({ ok: true, meta });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[AgentDash] Error opening project:", err);
    res.status(500).json({ error: `Failed to open project: ${message}` });
  }
});

// POST /api/project/create
projectRoutes.post("/create", async (req, res) => {
  const { dir, name } = req.body;
  if (!dir || typeof dir !== "string") {
    res.status(400).json({ error: "dir is required" });
    return;
  }

  const resolvedDir = resolvePath(dir);
  const projectName = name || path.basename(resolvedDir);
  const agentdashDir = path.join(resolvedDir, ".agentdash");

  try {
    // Create directory structure
    const dirs = [
      agentdashDir,
      path.join(agentdashDir, "brainstorm"),
      path.join(agentdashDir, "research"),
      path.join(agentdashDir, "architecture"),
      path.join(agentdashDir, "tasks"),
      path.join(agentdashDir, "design"),
      path.join(agentdashDir, "coding"),
      path.join(agentdashDir, "artifacts"),
      path.join(agentdashDir, "research-notes"),
      path.join(agentdashDir, "templates"),
      path.join(agentdashDir, "memory"),
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

    await syncTemplates(resolvedDir);
    await scaffoldClaudeDir(resolvedDir);
    await ensureGitignore(resolvedDir);
    setActiveProject(resolvedDir);
    await addToRecent(resolvedDir, projectName);
    res.json({ ok: true, meta });
  } catch (err) {
    res.status(500).json({ error: `Failed to create project: ${err instanceof Error ? err.message : String(err)}` });
  }
});
