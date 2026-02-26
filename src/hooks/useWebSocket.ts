import { useEffect } from "react";
import { useAppStore } from "../stores/appStore";

type FileChangedListener = (phase: string | null, file: string) => void;

// Module-level state — singleton WebSocket shared by all consumers
let socket: WebSocket | null = null;
const MAX_RECONNECT_DELAY = 30000;

const fileChangedListeners = new Set<FileChangedListener>();

/**
 * Subscribe to file_changed events from the server.
 * Returns an unsubscribe function.
 */
export function subscribeToFileChanges(cb: FileChangedListener): () => void {
  fileChangedListeners.add(cb);
  return () => {
    fileChangedListeners.delete(cb);
  };
}

/**
 * Send a message through the WebSocket connection.
 */
export function sendWsMessage(data: object): boolean {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
    return true;
  }
  return false;
}

function handleMessage(event: MessageEvent) {
  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(event.data);
  } catch {
    return;
  }

  const store = useAppStore.getState();

  switch (msg.type) {
    case "file_changed":
      fileChangedListeners.forEach((cb) =>
        cb(msg.phase as string | null, msg.file as string)
      );
      break;

    case "response_chunk":
      if (typeof msg.content === "string") {
        store.appendStreamContent(msg.content);
      }
      break;

    case "assistant_message":
      // Full message text — fill in if streaming chunks were incomplete
      if (typeof msg.content === "string" && msg.content) {
        const current = useAppStore.getState().streamingContent;
        if (!current || current.length < msg.content.length) {
          useAppStore.setState({ streamingContent: msg.content });
        }
      }
      break;

    case "response_done":
      store.stopStreaming();
      break;

    case "tool_activity":
      store.setToolActivity({
        toolName: msg.toolName as string,
        elapsedSeconds: msg.elapsedSeconds as number,
      });
      break;

    case "permission_request": {
      const { requestId, toolName, input } = msg as {
        requestId: string;
        toolName: string;
        input: Record<string, unknown>;
      };
      // If auto-approve is on, respond immediately without showing the modal
      if (store.autoApprovePermissions) {
        sendWsMessage({ type: "permission_response", requestId, allowed: true });
      } else {
        store.setPermissionRequest({ requestId, toolName, input });
      }
      break;
    }

    case "error":
      store.setError(
        typeof msg.message === "string" ? msg.message : "An error occurred"
      );
      store.stopStreaming();
      break;
  }
}

/**
 * Hook that manages the WebSocket connection lifecycle.
 * Mount this once at the app root when a project is loaded.
 *
 * StrictMode-safe: uses a local `disposed` flag scoped to each
 * effect invocation so the first mount's async onclose doesn't
 * clobber the second mount's socket.
 */
export function useWebSocket() {
  const setWsConnected = useAppStore((s) => s.setWsConnected);

  useEffect(() => {
    let disposed = false;
    let localSocket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelay = 1000;

    function connect() {
      if (disposed) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      localSocket = new WebSocket(`${protocol}//${window.location.host}/ws`);

      // Update module-level reference so sendWsMessage works
      socket = localSocket;

      localSocket.onopen = () => {
        if (disposed) return;
        setWsConnected(true);
        reconnectDelay = 1000;
      };

      localSocket.onclose = () => {
        if (disposed) return;
        setWsConnected(false);
        // Only null out module socket if it's still ours
        if (socket === localSocket) {
          socket = null;
        }
        reconnectTimer = setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
      };

      localSocket.onerror = () => {
        // onclose fires after this — reconnect handled there
      };

      localSocket.onmessage = handleMessage;
    }

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (localSocket) {
        localSocket.close();
        // Only clear module socket if it's still this instance
        if (socket === localSocket) {
          socket = null;
        }
      }
    };
  }, [setWsConnected]);
}
