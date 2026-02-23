import { useState, useEffect, useCallback } from "react";

interface GhStatus {
  installed: boolean;
  authenticated: boolean;
  username: string | null;
}

interface GitRemoteScreenProps {
  dir: string;
  projectName: string;
  onAddRemote: (url: string) => Promise<void>;
  onCreateRepo: (name: string, visibility: "public" | "private") => Promise<void>;
  onSkip: () => void;
}

export default function GitRemoteScreen({
  dir,
  projectName,
  onAddRemote,
  onCreateRepo,
  onSkip,
}: GitRemoteScreenProps) {
  const [mode, setMode] = useState<"choose" | "paste" | "create">("choose");
  const [ghStatus, setGhStatus] = useState<GhStatus | null>(null);
  const [ghChecking, setGhChecking] = useState(true);

  // Paste mode state
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

  // Create mode state
  const [repoName, setRepoName] = useState(() =>
    projectName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, ""),
  );
  const [visibility, setVisibility] = useState<"public" | "private">("private");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkGh = useCallback(async () => {
    setGhChecking(true);
    try {
      const res = await fetch("/api/git/gh-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dir }),
      });
      const data = await res.json();
      setGhStatus(data);
    } catch {
      setGhStatus({ installed: false, authenticated: false, username: null });
    } finally {
      setGhChecking(false);
    }
  }, [dir]);

  useEffect(() => {
    checkGh();
  }, [checkGh]);

  function validateUrl(value: string): boolean {
    if (!value.startsWith("https://github.com/") && !value.startsWith("git@github.com:")) {
      setUrlError("URL must start with https://github.com/ or git@github.com:");
      return false;
    }
    setUrlError(null);
    return true;
  }

  async function handleConnect() {
    if (!validateUrl(url)) return;
    setLoading(true);
    setError(null);
    try {
      await onAddRemote(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!repoName.trim()) {
      setError("Repository name is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onCreateRepo(repoName.trim(), visibility);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  // --- Sub-views ---

  function renderChoose() {
    return (
      <>
        <div className="space-y-3 mb-6">
          {/* Paste URL option */}
          <button
            onClick={() => { setMode("paste"); setError(null); }}
            className="w-full flex items-center gap-4 px-4 py-4 bg-raised border border-edge rounded-lg hover:border-phase-environment/50 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-phase-environment/10 border border-phase-environment/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-phase-environment" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-ink group-hover:text-phase-environment transition-colors">
                Paste Repository URL
              </div>
              <div className="text-xs text-ink-faint mt-0.5">
                Connect to an existing GitHub repository
              </div>
            </div>
          </button>

          {/* Create repo option */}
          <button
            onClick={() => { setMode("create"); setError(null); }}
            className="w-full flex items-center gap-4 px-4 py-4 bg-raised border border-edge rounded-lg hover:border-phase-environment/50 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-phase-environment/10 border border-phase-environment/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-phase-environment" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-ink group-hover:text-phase-environment transition-colors">
                Create New Repository
              </div>
              <div className="text-xs text-ink-faint mt-0.5">
                {ghChecking
                  ? "Checking gh CLI..."
                  : ghStatus?.installed
                    ? "Create a new repo on GitHub"
                    : "Requires gh CLI"}
              </div>
            </div>
          </button>
        </div>

        <button
          onClick={onSkip}
          className="w-full text-center text-xs text-ink-faint hover:text-ink-muted transition-colors"
        >
          Skip for now
        </button>
      </>
    );
  }

  function renderPaste() {
    return (
      <>
        <div className="mb-6">
          <label className="block text-xs font-medium text-ink-faint font-mono uppercase tracking-wider mb-1.5">
            Repository URL
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setUrlError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter" && url.trim()) handleConnect(); }}
            placeholder="https://github.com/username/repo.git"
            className="w-full bg-panel border border-edge rounded-md px-3 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-phase-environment/50 transition-colors"
            autoFocus
          />
          {urlError && (
            <p className="text-xs text-phase-tasks mt-1.5">{urlError}</p>
          )}
        </div>

        {error && (
          <div className="bg-phase-tasks/10 border border-phase-tasks/20 rounded-lg px-4 py-3 mb-4 text-sm text-phase-tasks animate-fade-up">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleConnect}
            disabled={loading || !url.trim()}
            className="flex-1 px-4 py-3 rounded-lg bg-phase-environment/15 border border-phase-environment/30 text-phase-environment hover:bg-phase-environment/25 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Connecting..." : "Connect"}
          </button>
          <button
            onClick={() => { setMode("choose"); setError(null); setUrlError(null); }}
            disabled={loading}
            className="px-4 py-3 rounded-lg border bg-panel border-edge text-ink-muted hover:border-edge-bright hover:text-ink transition-all text-sm font-medium disabled:opacity-50"
          >
            Back
          </button>
        </div>
      </>
    );
  }

  function renderCreate() {
    // gh not installed
    if (ghStatus && !ghStatus.installed) {
      return (
        <>
          <div className="bg-raised border border-edge rounded-lg px-4 py-3 mb-6 text-sm text-ink-muted leading-relaxed">
            <p className="font-medium text-ink mb-2">GitHub CLI not found</p>
            <p className="mb-2">
              Install it with Homebrew:
            </p>
            <code className="block bg-canvas border border-edge rounded px-3 py-2 text-xs font-mono text-ink">
              brew install gh
            </code>
            <p className="mt-2 text-xs text-ink-faint">
              Then run <code className="text-ink-muted">gh auth login</code> to authenticate.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setGhStatus(null); checkGh(); }}
              className="flex-1 px-4 py-3 rounded-lg bg-phase-environment/15 border border-phase-environment/30 text-phase-environment hover:bg-phase-environment/25 transition-all text-sm font-medium"
            >
              Check Again
            </button>
            <button
              onClick={() => { setMode("choose"); setError(null); }}
              className="px-4 py-3 rounded-lg border bg-panel border-edge text-ink-muted hover:border-edge-bright hover:text-ink transition-all text-sm font-medium"
            >
              Back
            </button>
          </div>
        </>
      );
    }

    // gh not authenticated
    if (ghStatus && !ghStatus.authenticated) {
      return (
        <>
          <div className="bg-raised border border-edge rounded-lg px-4 py-3 mb-6 text-sm text-ink-muted leading-relaxed">
            <p className="font-medium text-ink mb-2">Not authenticated</p>
            <p className="mb-2">
              Run the following to log in:
            </p>
            <code className="block bg-canvas border border-edge rounded px-3 py-2 text-xs font-mono text-ink">
              gh auth login
            </code>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setGhStatus(null); checkGh(); }}
              className="flex-1 px-4 py-3 rounded-lg bg-phase-environment/15 border border-phase-environment/30 text-phase-environment hover:bg-phase-environment/25 transition-all text-sm font-medium"
            >
              Check Again
            </button>
            <button
              onClick={() => { setMode("choose"); setError(null); }}
              className="px-4 py-3 rounded-lg border bg-panel border-edge text-ink-muted hover:border-edge-bright hover:text-ink transition-all text-sm font-medium"
            >
              Back
            </button>
          </div>
        </>
      );
    }

    // gh checking
    if (!ghStatus || ghChecking) {
      return (
        <div className="text-center py-6 text-sm text-ink-muted">Checking gh CLI...</div>
      );
    }

    // Authenticated — show create form
    return (
      <>
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-ink-faint font-mono uppercase tracking-wider mb-1.5">
              Repository Name
            </label>
            <input
              type="text"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && repoName.trim()) handleCreate(); }}
              placeholder="my-project"
              className="w-full bg-panel border border-edge rounded-md px-3 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-phase-environment/50 transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-faint font-mono uppercase tracking-wider mb-1.5">
              Visibility
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setVisibility("private")}
                className={`flex-1 px-3 py-2 rounded-md border text-sm font-medium transition-all ${
                  visibility === "private"
                    ? "border-phase-environment/40 bg-phase-environment/10 text-phase-environment"
                    : "border-edge bg-panel text-ink-muted hover:border-edge-bright"
                }`}
              >
                Private
              </button>
              <button
                onClick={() => setVisibility("public")}
                className={`flex-1 px-3 py-2 rounded-md border text-sm font-medium transition-all ${
                  visibility === "public"
                    ? "border-phase-environment/40 bg-phase-environment/10 text-phase-environment"
                    : "border-edge bg-panel text-ink-muted hover:border-edge-bright"
                }`}
              >
                Public
              </button>
            </div>
          </div>

          <p className="text-xs text-ink-faint">
            Creating as <span className="text-ink-muted font-medium">@{ghStatus.username}</span>
          </p>
        </div>

        {error && (
          <div className="bg-phase-tasks/10 border border-phase-tasks/20 rounded-lg px-4 py-3 mb-4 text-sm text-phase-tasks animate-fade-up">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleCreate}
            disabled={loading || !repoName.trim()}
            className="flex-1 px-4 py-3 rounded-lg bg-phase-environment/15 border border-phase-environment/30 text-phase-environment hover:bg-phase-environment/25 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Repository"}
          </button>
          <button
            onClick={() => { setMode("choose"); setError(null); }}
            disabled={loading}
            className="px-4 py-3 rounded-lg border bg-panel border-edge text-ink-muted hover:border-edge-bright hover:text-ink transition-all text-sm font-medium disabled:opacity-50"
          >
            Back
          </button>
        </div>
      </>
    );
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
                  d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-ink mb-1">
              Connect to GitHub
            </h2>
            <p className="text-sm text-ink-muted">
              Link{" "}
              <span className="font-medium text-ink">{projectName}</span>{" "}
              to a GitHub repository
            </p>
          </div>

          {mode === "choose" && renderChoose()}
          {mode === "paste" && renderPaste()}
          {mode === "create" && renderCreate()}
        </div>
      </div>
    </div>
  );
}
