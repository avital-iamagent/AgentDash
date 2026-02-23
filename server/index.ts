import express from "express";
import cors from "cors";
import { createServer } from "http";
import { stateRoutes } from "./routes/state.js";
import { projectRoutes } from "./routes/project.js";
import { gitRoutes } from "./routes/git.js";

const app = express();

// CORS — permissive for local dev, lock down in production
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

// REST routes
app.use("/api/project", projectRoutes);
app.use("/api", stateRoutes);
app.use("/api/git", gitRoutes);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[AgentDash] Server error:", err.message);
  res.status(500).json({ error: err.message });
});

const server = createServer(app);

// WebSocket will be added in Task 1.5
// const wss = new WebSocketServer({ server, path: "/ws" });

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`AgentDash server running on http://localhost:${PORT}`);
});

export { server };
