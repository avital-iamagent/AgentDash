import { useState } from "react";

interface GitSetupScreenProps {
  dir: string;
  projectName: string;
  mode: "new" | "existing";
  onInitGit: () => void;
  onSkip: () => void;
  onDismiss: () => void;
}

export default function GitSetupScreen({
  projectName,
  mode,
  onInitGit,
  onSkip,
  onDismiss,
}: GitSetupScreenProps) {
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleInit() {
    setLoading(true);
    setError(null);
    try {
      onInitGit();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  function handleSkip() {
    if (dontAskAgain) {
      onDismiss();
    } else {
      onSkip();
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="w-full max-w-xl animate-fade-up">
        <div className="bg-panel border border-edge rounded-xl p-8">
          {/* Icon + heading */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-raised border border-edge mb-4">
              <svg
                className="w-6 h-6 text-phase-environment"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 3v12m0 0a3 3 0 106 0 3 3 0 00-6 0zm12-4a3 3 0 10-6 0v7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-ink mb-1">
              Initialize Git Repository
            </h2>
            <p className="text-sm text-ink-muted">
              Track changes for{" "}
              <span className="font-medium text-ink">{projectName}</span> with
              version control
            </p>
          </div>

          {/* Description */}
          <div className="bg-raised border border-edge rounded-lg px-4 py-3 mb-6 text-sm text-ink-muted leading-relaxed">
            Git enables version control, branch management, and collaboration.
            AgentDash can display your branch, recent commits, and remote status
            in the sidebar.
          </div>

          {/* Error */}
          {error && (
            <div className="bg-phase-tasks/10 border border-phase-tasks/20 rounded-lg px-4 py-3 mb-6 text-sm text-phase-tasks animate-fade-up">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleInit}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-lg bg-phase-environment/15 border border-phase-environment/30 text-phase-environment hover:bg-phase-environment/25 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Initializing..." : "Initialize Git"}
            </button>
            <button
              onClick={handleSkip}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-lg border bg-panel border-edge text-ink-muted hover:border-edge-bright hover:text-ink transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Skip
            </button>
          </div>

          {/* Don't ask again checkbox — only for existing projects */}
          {mode === "existing" && (
            <label className="flex items-center gap-2 mt-4 cursor-pointer group">
              <input
                type="checkbox"
                checked={dontAskAgain}
                onChange={(e) => setDontAskAgain(e.target.checked)}
                className="w-4 h-4 rounded border-edge bg-panel text-phase-environment focus:ring-phase-environment/30 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs text-ink-faint group-hover:text-ink-muted transition-colors">
                Don't ask me again for this project
              </span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
