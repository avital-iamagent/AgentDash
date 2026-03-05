import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import type { RecentProject, RecentProjectsFile } from "../types/index.js";
import { detectGitStatus } from "./git.js";

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
    projectName,
    createdAt: new Date().toISOString(),
    activePhase: "brainstorm",
    phases: {
      brainstorm: { status: "active", startedAt: new Date().toISOString(), completedAt: null, artifactApproved: false, reviewReport: null },
      research: { status: "locked", startedAt: null, completedAt: null, artifactApproved: false, reviewReport: null },
      architecture: { status: "locked", startedAt: null, completedAt: null, artifactApproved: false, reviewReport: null },
      environment: { status: "locked", startedAt: null, completedAt: null, artifactApproved: false, reviewReport: null },
      tasks: { status: "locked", startedAt: null, completedAt: null, artifactApproved: false, reviewReport: null },
      design: { status: "locked", startedAt: null, completedAt: null, artifactApproved: false, reviewReport: null },
      coding: { status: "locked", startedAt: null, completedAt: null, artifactApproved: false, reviewReport: null },
    },
    git: { enabled: false, branch: null, lastCommit: null, remoteUrl: null, authMethod: null, gitDismissed: false },
  };
}

const INITIAL_STATES: Record<string, object> = {
  brainstorm: { updatedAt: null, updatedBy: "claude-code", cards: [], groups: [], tags: [] },
  research: { updatedAt: null, updatedBy: "claude-code", items: [], categories: ["competitor", "tech-stack", "pattern", "risk"], verdicts: ["adopt", "learn-from", "avoid", "needs-more-research"] },
  architecture: { updatedAt: null, updatedBy: "claude-code", components: [], decisions: [], diagrams: [], risks: [] },
  environment: { updatedAt: null, updatedBy: "claude-code", checklist: [], dependencies: [], configs: [], verification: [] },
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
    const metaRaw = await fs.readFile(metaPath, "utf-8");
    const meta = JSON.parse(metaRaw);

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

    // Ensure gitDismissed field exists (backfill for older projects)
    if (meta.git && meta.git.gitDismissed === undefined) {
      meta.git.gitDismissed = false;
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
    }



    await scaffoldClaudeDir(resolvedDir);
    setActiveProject(resolvedDir);
    await addToRecent(resolvedDir, meta.projectName || path.basename(resolvedDir));
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
      path.join(agentdashDir, "environment"),
      path.join(agentdashDir, "tasks"),
      path.join(agentdashDir, "design"),
      path.join(agentdashDir, "coding"),
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
    const ownTemplatesDir = path.join(AGENTDASH_ROOT, ".agentdash", "templates");
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

    await scaffoldClaudeDir(resolvedDir);
    setActiveProject(resolvedDir);
    await addToRecent(resolvedDir, projectName);
    res.json({ ok: true, meta });
  } catch (err) {
    res.status(500).json({ error: `Failed to create project: ${err instanceof Error ? err.message : String(err)}` });
  }
});
