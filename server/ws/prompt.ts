import { WebSocketServer, WebSocket } from "ws";
import { sendPrompt, runResearch, runReview } from "../services/claude.js";
import { getActiveProjectDir } from "../routes/project.js";
import { askClientPermission, resolvePermission } from "../services/permissions.js";

interface AttachmentPayload {
  name: string;
  data: string; // base64
  mimeType: string;
}

interface PromptMessage {
  type: "prompt";
  phase: string;
  text: string;
  attachments?: AttachmentPayload[];
}

interface ResearchMessage {
  type: "research";
  text: string;
}

interface ReviewMessage {
  type: "review";
  phase: string;
}

interface PermissionResponseMessage {
  type: "permission_response";
  requestId: string;
  allowed: boolean;
}

interface AbortMessage {
  type: "abort";
}

type IncomingMessage = PromptMessage | ResearchMessage | ReviewMessage | PermissionResponseMessage | AbortMessage;

// Track in-flight requests per client
const inFlight = new WeakMap<WebSocket, boolean>();

function send(ws: WebSocket, data: object) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

export function setupPromptHandler(wss: WebSocketServer) {
  wss.on("connection", (ws: WebSocket) => {
    console.log("[AgentDash] WebSocket client connected");
    inFlight.set(ws, false);

    // Per-connection abort function — replaced each time a new stream starts
    let abort: (() => void) | null = null;

    ws.on("message", async (data) => {
      let msg: IncomingMessage;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        send(ws, { type: "error", message: "Invalid JSON" });
        return;
      }

      // Permission responses bypass inFlight — they unblock a paused stream
      if (msg.type === "permission_response") {
        resolvePermission(msg.requestId, msg.allowed);
        return;
      }

      // Abort bypasses inFlight — cancels the current stream immediately
      if (msg.type === "abort") {
        abort?.();
        return;
      }

      if (inFlight.get(ws)) {
        send(ws, { type: "error", message: "A request is already in progress. Wait for it to complete." });
        return;
      }

      const projectDir = getActiveProjectDir();
      if (!projectDir) {
        send(ws, { type: "error", message: "No project is currently open" });
        return;
      }

      inFlight.set(ws, true);

      const controller = new AbortController();
      const onPermissionRequest = (toolName: string, input: Record<string, unknown>) =>
        askClientPermission(ws, toolName, input);

      let generator: AsyncGenerator<{ type: string; [key: string]: unknown }, void, unknown> | null = null;

      switch (msg.type) {
        case "prompt":
          generator = sendPrompt(msg.text, msg.phase, projectDir, onPermissionRequest, controller.signal, msg.attachments);
          break;
        case "research":
          generator = runResearch(msg.text, projectDir);
          break;
        case "review":
          generator = runReview(msg.phase, projectDir);
          break;
        default:
          send(ws, { type: "error", message: "Unknown message type" });
          inFlight.set(ws, false);
          return;
      }

      // Track whether response_done has been sent to prevent duplicates
      let responseDoneSent = false;

      function sendResponseDone() {
        if (!responseDoneSent) {
          responseDoneSent = true;
          send(ws, { type: "response_done" });
        }
      }

      // Set the abort function for this stream:
      // 1. Signal the SDK to stop (if it supports it)
      // 2. Force-terminate the generator so the for-await loop exits immediately
      // 3. Send response_done to the client right away
      abort = () => {
        abort = null;
        controller.abort();
        generator?.return(undefined).catch(() => {});
        sendResponseDone();
        inFlight.set(ws, false);
      };

      try {
        for await (const chunk of generator) {
          if (responseDoneSent) break; // abort already handled
          send(ws, chunk);
          if (chunk.type === "response_done") {
            responseDoneSent = true;
          }
        }

      } catch (err) {
        const isAbort = err instanceof Error &&
          (err.name === "AbortError" || err.message.toLowerCase().includes("abort"));
        if (!isAbort) {
          send(ws, { type: "error", message: err instanceof Error ? err.message : String(err) });
        }
        sendResponseDone();
      } finally {
        abort = null;
        sendResponseDone(); // ensure it's sent if the generator ended without yielding it
        inFlight.set(ws, false); // always reset — this was the bug
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
