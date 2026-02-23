import { WebSocketServer, WebSocket } from "ws";
import { sendPrompt, runResearch, runReview } from "../services/claude.js";
import { getActiveProjectDir } from "../routes/project.js";

interface PromptMessage {
  type: "prompt";
  phase: string;
  text: string;
}

interface ResearchMessage {
  type: "research";
  text: string;
}

interface ReviewMessage {
  type: "review";
  phase: string;
}

type IncomingMessage = PromptMessage | ResearchMessage | ReviewMessage;

// Track in-flight requests per client
const inFlight = new WeakMap<WebSocket, boolean>();

function send(ws: WebSocket, data: object) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

async function streamToClient(
  ws: WebSocket,
  generator: AsyncGenerator<{ type: string; [key: string]: unknown }, void, unknown>
) {
  try {
    for await (const msg of generator) {
      send(ws, msg);
    }
  } catch (err) {
    send(ws, {
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
    send(ws, { type: "response_done" });
  } finally {
    inFlight.set(ws, false);
  }
}

export function setupPromptHandler(wss: WebSocketServer) {
  wss.on("connection", (ws: WebSocket) => {
    console.log("[AgentDash] WebSocket client connected");
    inFlight.set(ws, false);

    ws.on("message", async (data) => {
      let msg: IncomingMessage;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        send(ws, { type: "error", message: "Invalid JSON" });
        return;
      }

      // Reject concurrent prompts
      if (inFlight.get(ws)) {
        send(ws, {
          type: "error",
          message: "A request is already in progress. Wait for it to complete.",
        });
        return;
      }

      const projectDir = getActiveProjectDir();
      if (!projectDir) {
        send(ws, { type: "error", message: "No project is currently open" });
        return;
      }

      inFlight.set(ws, true);

      switch (msg.type) {
        case "prompt":
          await streamToClient(ws, sendPrompt(msg.text, msg.phase, projectDir));
          break;

        case "research":
          await streamToClient(ws, runResearch(msg.text, projectDir));
          break;

        case "review":
          await streamToClient(ws, runReview(msg.phase, projectDir));
          break;

        default:
          send(ws, { type: "error", message: "Unknown message type" });
          inFlight.set(ws, false);
      }
    });

    ws.on("close", () => {
      console.log("[AgentDash] WebSocket client disconnected");
    });

    ws.on("error", (err) => {
      console.error("[AgentDash] WebSocket client error:", err.message);
    });
  });
}
