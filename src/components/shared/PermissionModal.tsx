import { useAppStore } from "../../stores/appStore";
import { sendWsMessage } from "../../hooks/useWebSocket";

const TOOL_ICONS: Record<string, string> = {
  Write: "✎",
  Edit:  "✎",
  Bash:  "$",
  Read:  "👁",
  Grep:  "⌕",
  Glob:  "⌕",
  Skill: "◈",
};

function formatInput(toolName: string, input: Record<string, unknown>): string {
  if (toolName === "Write" || toolName === "Edit" || toolName === "Read") {
    return String(input.file_path ?? input.path ?? "");
  }
  if (toolName === "Bash") {
    const cmd = String(input.command ?? "");
    return cmd.length > 120 ? cmd.slice(0, 120) + "…" : cmd;
  }
  if (toolName === "Grep" || toolName === "Glob") {
    const pattern = String(input.pattern ?? "");
    const path = input.path ? ` in ${input.path}` : "";
    return pattern + path;
  }
  if (toolName === "Skill") {
    return String(input.skill ?? "");
  }
  // Fallback: show first string value
  const first = Object.values(input).find((v) => typeof v === "string");
  return first ? String(first) : "";
}

export default function PermissionModal() {
  const req = useAppStore((s) => s.permissionRequest);
  const autoApprove = useAppStore((s) => s.autoApprovePermissions);
  const setPermissionRequest = useAppStore((s) => s.setPermissionRequest);
  const setAutoApprovePermissions = useAppStore((s) => s.setAutoApprovePermissions);

  if (!req) return null;

  function respond(allowed: boolean, autoApproveAll = false) {
    if (!req) return;
    if (autoApproveAll) {
      setAutoApprovePermissions(true);
    }
    sendWsMessage({ type: "permission_response", requestId: req.requestId, allowed });
    setPermissionRequest(null);
  }

  const icon = TOOL_ICONS[req.toolName] ?? "?";
  const detail = formatInput(req.toolName, req.input);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => respond(false)}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm mx-4 bg-panel border border-edge rounded-xl shadow-2xl animate-fade-up">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-edge flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-mono text-base"
            style={{
              color: "var(--color-phase-coding)",
              backgroundColor: "color-mix(in srgb, var(--color-phase-coding) 12%, transparent)",
            }}
          >
            {icon}
          </div>
          <div>
            <div className="text-sm font-medium text-ink">
              Claude wants to use{" "}
              <span style={{ color: "var(--color-phase-coding)" }}>{req.toolName}</span>
            </div>
            <div className="text-[11px] text-ink-faint font-mono mt-0.5">
              permission required
            </div>
          </div>
        </div>

        {/* Detail */}
        {detail && (
          <div className="px-5 py-3 border-b border-edge">
            <div className="text-[11px] text-ink-faint font-mono mb-1 uppercase tracking-wide">
              {req.toolName === "Bash" ? "command" : "path"}
            </div>
            <div className="text-xs text-ink-muted font-mono bg-raised rounded px-3 py-2 break-all">
              {detail}
            </div>
          </div>
        )}

        {/* Auto-approve toggle */}
        <div className="px-5 py-3 border-b border-edge">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                autoApprove
                  ? "border-phase-coding bg-phase-coding"
                  : "border-edge group-hover:border-ink-faint"
              }`}
              onClick={() => setAutoApprovePermissions(!autoApprove)}
            >
              {autoApprove && (
                <svg className="w-2.5 h-2.5 text-canvas" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 5l2.5 2.5 4.5-4" />
                </svg>
              )}
            </div>
            <span className="text-xs text-ink-muted">
              Auto-approve all tool uses this session
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 flex gap-2 justify-end">
          <button
            onClick={() => respond(false)}
            className="px-4 py-1.5 text-sm rounded-lg border border-edge text-ink-muted hover:text-ink hover:border-ink-faint transition-colors"
          >
            Deny
          </button>
          <button
            onClick={() => respond(true, autoApprove)}
            className="px-4 py-1.5 text-sm rounded-lg font-medium transition-colors"
            style={{
              color: "var(--color-canvas)",
              backgroundColor: "var(--color-phase-coding)",
            }}
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}
