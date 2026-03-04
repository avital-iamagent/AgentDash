import { watch } from "chokidar";
import { WebSocketServer } from "ws";
import path from "path";
import { getActiveProjectDir } from "../routes/project.js";
import { processVisualRequest } from "../routes/visuals.js";
import { PHASE_NAMES } from "../types/index.js";

let watcher: ReturnType<typeof watch> | null = null;

export function setupFileWatcher(wss: WebSocketServer) {
  // Re-initialize watcher when project changes
  startWatching(wss);
}

export function startWatching(wss: WebSocketServer) {
  const dir = getActiveProjectDir();
  if (!dir) return;

  // Clean up previous watcher
  if (watcher) {
    watcher.close();
    watcher = null;
  }

  const agentdashDir = path.join(dir, ".agentdash");

  watcher = watch(agentdashDir, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });

  watcher.on("change", (filePath) => {
    const relative = path.relative(agentdashDir, filePath);
    const phase = detectPhase(relative);

    const message = JSON.stringify({
      type: "file_changed",
      file: relative,
      phase,
    });

    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    }
  });

  watcher.on("add", (filePath) => {
    const relative = path.relative(agentdashDir, filePath);

    // Auto-process visual queue requests
    const queuePrefix = path.join("tasks", "visuals", "queue");
    if (relative.startsWith(queuePrefix + path.sep) && relative.endsWith(".json")) {
      const projectDir = getActiveProjectDir();
      if (projectDir) {
        processVisualRequest(projectDir, filePath);
      }
      return; // Don't broadcast queue files — the index.json update will trigger a broadcast
    }

    const phase = detectPhase(relative);

    const message = JSON.stringify({
      type: "file_changed",
      file: relative,
      phase,
    });

    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    }
  });

  console.log(`[AgentDash] Watching ${agentdashDir} for changes`);
}

function detectPhase(relativePath: string): string | null {
  for (const phase of PHASE_NAMES) {
    if (relativePath.startsWith(phase + path.sep) || relativePath.startsWith(phase + "/")) {
      return phase;
    }
  }
  if (relativePath === "meta.json") return "meta";
  if (relativePath.startsWith("artifacts")) return "artifacts";
  if (relativePath.startsWith("research-notes")) return "research-notes";
  return null;
}
