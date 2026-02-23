import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { getActiveProjectDir } from "./project.js";

export const gitRoutes = Router();

// GET /api/git/status
gitRoutes.get("/status", async (_req, res) => {
  try {
    const dir = getActiveProjectDir();
    if (!dir) {
      res.status(400).json({ error: "No project is currently open" });
      return;
    }

    const raw = await fs.readFile(path.join(dir, ".agentdash", "meta.json"), "utf-8");
    const meta = JSON.parse(raw);
    res.json(meta.git || { enabled: false });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
