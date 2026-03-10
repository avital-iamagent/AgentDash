import { useAppStore } from "../../stores/appStore";

export default function AuthErrorModal() {
  const authError = useAppStore((s) => s.authError);
  const setAuthError = useAppStore((s) => s.setAuthError);

  if (!authError) return null;

  function dismiss() {
    setAuthError(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={dismiss}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm mx-4 bg-panel border border-edge rounded-xl shadow-2xl animate-fade-up">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-edge flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-phase-tasks/12 text-phase-tasks">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-ink">
              Authentication Required
            </div>
            <div className="text-[11px] text-ink-faint font-mono mt-0.5">
              claude code session expired
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-ink-muted leading-relaxed">
            Claude Code needs to re-authenticate. Run the following command inside Claude Code:
          </p>
          <code className="block bg-raised border border-edge rounded-lg px-4 py-2.5 text-sm font-mono text-ink">
            /login
          </code>
          <p className="text-xs text-ink-faint">
            Once logged in, dismiss this and try your prompt again.
          </p>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-edge flex gap-2 justify-end">
          <button
            onClick={dismiss}
            className="px-4 py-1.5 text-sm rounded-lg border border-edge text-ink-muted hover:text-ink hover:border-ink-faint transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
