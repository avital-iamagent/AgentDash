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
import { setupPromptHandler } from "./ws/prompt.js";
import { setupFileWatcher, startWatching } from "./ws/filewatch.js";

const app = express();

// CORS — permissive for local dev, lock down in production
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json());

// REST routes
app.use("/api/project", projectRoutes);
app.use("/api", stateRoutes);
app.use("/api/git", gitRoutes);
app.use("/api/tts", ttsRoutes);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[AgentDash] Server error:", err.message);
  res.status(500).json({ error: err.message });
});

// Use HTTPS if local certs exist, otherwise fall back to HTTP
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certDir = path.resolve(__dirname, "..", ".certs");
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

const PORT = process.env.PORT || 3001;
const proto = hasCerts ? "https" : "http";
server.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`AgentDash server running on ${proto}://0.0.0.0:${PORT}`);
});

export { server, wss };
