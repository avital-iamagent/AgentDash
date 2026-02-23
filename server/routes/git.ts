import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { getActiveProjectDir } from "./project.js";

const execFileAsync = promisify(execFile);

export const gitRoutes = Router();

// --- Exported helper: detect git status in a directory ---

export interface GitDetectResult {
  isGitRepo: boolean;
  branch: string | null;
  lastCommit: string | null;
  remoteUrl: string | null;
}

export async function detectGitStatus(dir: string): Promise<GitDetectResult> {
  try {
    await execFileAsync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: dir });
  } catch {
    return { isGitRepo: false, branch: null, lastCommit: null, remoteUrl: null };
  }

  let branch: string | null = null;
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: dir });
    branch = stdout.trim() || null;
  } catch {
    // Unborn HEAD — try init.defaultBranch config, fall back to "main"
    try {
      const { stdout } = await execFileAsync("git", ["config", "init.defaultBranch"], { cwd: dir });
      branch = stdout.trim() || "main";
    } catch {
      branch = "main";
    }
  }

  let lastCommit: string | null = null;
  try {
    const { stdout } = await execFileAsync("git", ["log", "-1", "--format=%s"], { cwd: dir });
    lastCommit = stdout.trim() || null;
  } catch {
    // No commits yet
  }

  let remoteUrl: string | null = null;
  try {
    const { stdout } = await execFileAsync("git", ["remote", "get-url", "origin"], { cwd: dir });
    remoteUrl = stdout.trim() || null;
  } catch {
    // No remote configured
  }

  return { isGitRepo: true, branch, lastCommit, remoteUrl };
}

// --- Helper: read and write meta.json for active project ---

async function readMeta(dir: string) {
  const raw = await fs.readFile(path.join(dir, ".agentdash", "meta.json"), "utf-8");
  return JSON.parse(raw);
}

async function writeMeta(dir: string, meta: Record<string, unknown>) {
  await fs.writeFile(path.join(dir, ".agentdash", "meta.json"), JSON.stringify(meta, null, 2));
}

// GET /api/git/status
gitRoutes.get("/status", async (_req, res) => {
  try {
    const dir = getActiveProjectDir();
    if (!dir) {
      res.status(400).json({ error: "No project is currently open" });
      return;
    }

    const meta = await readMeta(dir);
    res.json(meta.git || { enabled: false });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/git/init — initialize git in a directory, update meta
gitRoutes.post("/init", async (req, res) => {
  const { dir } = req.body;
  if (!dir || typeof dir !== "string") {
    res.status(400).json({ error: "dir is required" });
    return;
  }

  try {
    await execFileAsync("git", ["init"], { cwd: dir });
    const gitInfo = await detectGitStatus(dir);

    const meta = await readMeta(dir);
    meta.git = {
      ...meta.git,
      enabled: true,
      branch: gitInfo.branch,
      lastCommit: gitInfo.lastCommit,
      remoteUrl: gitInfo.remoteUrl,
      gitDismissed: meta.git?.gitDismissed ?? false,
    };
    await writeMeta(dir, meta);

    res.json({ ok: true, git: meta.git });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/git/gh-status — check gh CLI availability and auth
gitRoutes.post("/gh-status", async (_req, res) => {
  try {
    let installed = false;
    let authenticated = false;
    let username: string | null = null;

    try {
      const { stdout, stderr } = await execFileAsync("gh", ["auth", "status"]);
      installed = true;
      // gh auth status outputs to stderr on success
      const output = stdout + stderr;
      authenticated = true;
      const match = output.match(/Logged in to github\.com account (\S+)/);
      if (match) username = match[1];
    } catch (err: unknown) {
      const execErr = err as { code?: string; stderr?: string };
      if (execErr.code === "ENOENT") {
        // gh not installed
        installed = false;
      } else {
        // gh installed but not authenticated (exit code 1)
        installed = true;
        authenticated = false;
      }
    }

    res.json({ installed, authenticated, username });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/git/remote/add — add a remote URL
gitRoutes.post("/remote/add", async (req, res) => {
  const { dir, url } = req.body;
  if (!dir || typeof dir !== "string") {
    res.status(400).json({ error: "dir is required" });
    return;
  }
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }

  // Validate URL format
  if (!url.startsWith("https://github.com/") && !url.startsWith("git@github.com:")) {
    res.status(400).json({ error: "URL must start with https://github.com/ or git@github.com:" });
    return;
  }

  try {
    // Check if origin already exists
    try {
      await execFileAsync("git", ["remote", "get-url", "origin"], { cwd: dir });
      res.status(409).json({ error: "Remote 'origin' already exists" });
      return;
    } catch {
      // No origin — good, proceed
    }

    await execFileAsync("git", ["remote", "add", "origin", url], { cwd: dir });

    const gitInfo = await detectGitStatus(dir);
    const meta = await readMeta(dir);
    meta.git = {
      ...meta.git,
      remoteUrl: gitInfo.remoteUrl,
    };
    await writeMeta(dir, meta);

    res.json({ ok: true, git: meta.git });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/git/gh-create — create a GitHub repo via gh CLI
gitRoutes.post("/gh-create", async (req, res) => {
  const { dir, repoName, visibility } = req.body;
  if (!dir || typeof dir !== "string") {
    res.status(400).json({ error: "dir is required" });
    return;
  }
  if (!repoName || typeof repoName !== "string") {
    res.status(400).json({ error: "repoName is required" });
    return;
  }
  if (visibility !== "public" && visibility !== "private") {
    res.status(400).json({ error: "visibility must be 'public' or 'private'" });
    return;
  }

  // Validate repo name
  if (!/^[a-zA-Z0-9._-]+$/.test(repoName) || repoName.length > 100) {
    res.status(400).json({ error: "Invalid repo name. Use letters, numbers, dots, hyphens, underscores (max 100 chars)." });
    return;
  }

  try {
    await execFileAsync(
      "gh",
      ["repo", "create", repoName, `--${visibility}`, "--source=.", "--remote=origin"],
      { cwd: dir },
    );

    const gitInfo = await detectGitStatus(dir);
    const meta = await readMeta(dir);
    meta.git = {
      ...meta.git,
      remoteUrl: gitInfo.remoteUrl,
    };
    await writeMeta(dir, meta);

    res.json({ ok: true, git: meta.git });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Pass through gh CLI error messages (e.g. name collision)
    res.status(500).json({ error: msg });
  }
});

// POST /api/git/dismiss — set gitDismissed in meta
gitRoutes.post("/dismiss", async (req, res) => {
  const { dir } = req.body;
  if (!dir || typeof dir !== "string") {
    res.status(400).json({ error: "dir is required" });
    return;
  }

  try {
    const meta = await readMeta(dir);
    if (!meta.git) {
      meta.git = { enabled: false, branch: null, lastCommit: null, remoteUrl: null, authMethod: null, gitDismissed: true };
    } else {
      meta.git.gitDismissed = true;
    }
    await writeMeta(dir, meta);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
