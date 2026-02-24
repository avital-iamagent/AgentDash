import type { WebSocket } from "ws";

interface PendingRequest {
  resolve: (allowed: boolean) => void;
  timer: ReturnType<typeof setTimeout>;
}

const pending = new Map<string, PendingRequest>();

const PERMISSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Send a permission request to the frontend client and wait for their response.
 * Resolves to true (allow) or false (deny).
 * Times out after 5 minutes and denies automatically.
 */
export async function askClientPermission(
  ws: WebSocket,
  toolName: string,
  input: Record<string, unknown>
): Promise<boolean> {
  if (ws.readyState !== ws.OPEN) return false;

  const requestId = crypto.randomUUID();

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(requestId);
      resolve(false);
    }, PERMISSION_TIMEOUT_MS);

    pending.set(requestId, { resolve, timer });

    ws.send(JSON.stringify({ type: "permission_request", requestId, toolName, input }));
  });
}

/**
 * Called when the client sends back a permission_response message.
 */
export function resolvePermission(requestId: string, allowed: boolean): void {
  const entry = pending.get(requestId);
  if (entry) {
    clearTimeout(entry.timer);
    pending.delete(requestId);
    entry.resolve(allowed);
  }
}
