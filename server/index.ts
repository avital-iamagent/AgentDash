import express from "express";
import cors from "cors";
import { createServer } from "http";
import { createServer as createHttpsServer } from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { stateRoutes } from "./routes/state.js";
import { projectRoutes, setOnProjectOpen } from "./routes/project.js";
import { gitRoutes } from "./routes/git.js";
import { ttsRoutes } from "./routes/tts.js";
import { visualsRoutes } from "./routes/visuals.js";
import { setupPromptHandler } from "./ws/prompt.js";
import { setupFileWatcher, startWatching } from "./ws/filewatch.js";
import { userConfig } from "./config.js";

const app = express();

// CORS — restricted to localhost by default; override with CORS_ORIGIN env var
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : ["http://localhost:3141", "http://127.0.0.1:3141"];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "5mb" }));

// REST routes
app.use("/api/project", projectRoutes);
app.use("/api", stateRoutes);
app.use("/api/git", gitRoutes);
app.use("/api/tts", ttsRoutes);
app.use("/api/visuals", visualsRoutes);

// --- Resolve project root ---
// In production: AGENTDASH_ROOT is set by the CLI entry point
// In dev: fall back to __dirname/../ (server/ is one level below root)
const __dirnameServer = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = process.env.AGENTDASH_ROOT || path.resolve(__dirnameServer, "..");

// --- Serve static frontend in production ---
const distPath = path.join(projectRoot, "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[AgentDash] Server error:", err.message);
  res.status(500).json({ error: err.message });
});

// SPA catch-all: serve index.html for non-API routes (must come after error handler registration)
if (fs.existsSync(distPath)) {
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"), { dotfiles: "allow" });
  });
}

// Use HTTPS if local certs exist, otherwise fall back to HTTP
const certDir = path.join(projectRoot, ".certs");
const certPath = path.join(certDir, "cert.pem");
const keyPath = path.join(certDir, "key.pem");
const hasCerts = fs.existsSync(certPath) && fs.existsSync(keyPath);

const server = hasCerts
  ? createHttpsServer({ cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) }, app)
  : createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

// WebSocket handlers
setupPromptHandler(wss);
setupFileWatcher(wss);

// Re-initialize file watcher when a project is opened
setOnProjectOpen(() => startWatching(wss));

// WebSocket error handling
wss.on("error", (err) => {
  console.error("[AgentDash] WebSocket server error:", err.message);
});

const PORT = process.env.PORT || userConfig.port || 3001;
const HOST = process.env.HOST || userConfig.host || "127.0.0.1";
const proto = hasCerts ? "https" : "http";
server.listen(Number(PORT), HOST, () => {
  console.log(`AgentDash server running on ${proto}://${HOST}:${PORT}`);
});

export { server, wss };
