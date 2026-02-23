import { useState, useEffect } from "react";
import { useAppStore } from "../../stores/appStore";
import type { Meta } from "../../types";
import GitSetupScreen from "./GitSetupScreen";
import GitRemoteScreen from "./GitRemoteScreen";

interface RecentProject {
  dir: string;
  name: string;
  lastOpened: string;
}

interface PendingProject {
  dir: string;
  name: string;
  meta: Meta;
  mode: "new" | "existing";
}

export default function StartScreen() {
  const setProject = useAppStore((s) => s.setProject);
  const setMeta = useAppStore((s) => s.setMeta);

  const [name, setName] = useState("");
  const [recent, setRecent] = useState<RecentProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wizard state
  const [wizardStep, setWizardStep] = useState<"start" | "gitSetup" | "gitRemote">("start");
  const [pendingProject, setPendingProject] = useState<PendingProject | null>(null);

  // Load recent projects
  useEffect(() => {
    fetch("/api/project/recent")
      .then((res) => res.json())
      .then((data) => setRecent(data.projects || []))
      .catch(() => {});
  }, []);

  /** Opens native macOS Finder dialog and returns selected path (or null if cancelled) */
  async function pickFolder(): Promise<string | null> {
    const res = await fetch("/api/project/pick-folder");
    const data = await res.json();
    return data.dir || null;
  }

  /** Navigate to dashboard with given project */
  function goToDashboard(dir: string, meta: Meta) {
    setProject(dir, meta.projectName);
    setMeta(meta);
  }

  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      const dir = await pickFolder();
      if (!dir) { setLoading(false); return; }

      const res = await fetch("/api/project/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dir, name: name.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create project");

      const meta: Meta = data.meta;

      // If folder already has .git, auto-detect was done in create
      if (meta.git.enabled) {
        // Has remote → dashboard; no remote and not dismissed → remote screen
        if (meta.git.remoteUrl || meta.git.gitDismissed) {
          goToDashboard(dir, meta);
        } else {
          setPendingProject({ dir, name: meta.projectName, meta, mode: "new" });
          setWizardStep("gitRemote");
        }
        return;
      }

      // Show git setup wizard
      setPendingProject({ dir, name: meta.projectName, meta, mode: "new" });
      setWizardStep("gitSetup");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenPicker() {
    setLoading(true);
    setError(null);
    try {
      const dir = await pickFolder();
      if (!dir) { setLoading(false); return; }
      await handleOpen(dir);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  async function handleOpen(targetDir: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/project/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dir: targetDir }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to open project");

      const meta: Meta = data.meta;

      // Git enabled: check if we need the remote step
      if (meta.git.enabled) {
        if (!meta.git.remoteUrl && !meta.git.gitDismissed) {
          setPendingProject({ dir: targetDir, name: meta.projectName, meta, mode: "existing" });
          setWizardStep("gitRemote");
        } else {
          goToDashboard(targetDir, meta);
        }
        return;
      }

      // Git dismissed (but not enabled) → dashboard
      if (meta.git.gitDismissed) {
        goToDashboard(targetDir, meta);
        return;
      }

      // Show git setup for existing project
      setPendingProject({ dir: targetDir, name: meta.projectName, meta, mode: "existing" });
      setWizardStep("gitSetup");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  // --- Git setup handlers ---

  async function handleGitInit() {
    if (!pendingProject) return;
    try {
      const res = await fetch("/api/git/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dir: pendingProject.dir }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initialize git");

      const updatedMeta: Meta = { ...pendingProject.meta, git: data.git };
      setPendingProject({ ...pendingProject, meta: updatedMeta });
      setWizardStep("gitRemote");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      // Stay on git setup screen so user can skip
    }
  }

  function handleGitSkip() {
    if (!pendingProject) return;
    goToDashboard(pendingProject.dir, pendingProject.meta);
  }

  async function handleGitDismiss() {
    if (!pendingProject) return;
    try {
      await fetch("/api/git/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dir: pendingProject.dir }),
      });
    } catch {
      // Best effort — still proceed to dashboard
    }
    const updatedMeta: Meta = {
      ...pendingProject.meta,
      git: { ...pendingProject.meta.git, gitDismissed: true },
    };
    goToDashboard(pendingProject.dir, updatedMeta);
  }

  // --- Git remote handlers ---

  async function handleAddRemote(url: string) {
    if (!pendingProject) return;
    const res = await fetch("/api/git/remote/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dir: pendingProject.dir, url }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to add remote");

    const updatedMeta: Meta = { ...pendingProject.meta, git: data.git };
    goToDashboard(pendingProject.dir, updatedMeta);
  }

  async function handleCreateRepo(name: string, visibility: "public" | "private") {
    if (!pendingProject) return;
    const res = await fetch("/api/git/gh-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dir: pendingProject.dir, repoName: name, visibility }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create repository");

    const updatedMeta: Meta = { ...pendingProject.meta, git: data.git };
    goToDashboard(pendingProject.dir, updatedMeta);
  }

  function handleRemoteSkip() {
    if (!pendingProject) return;
    goToDashboard(pendingProject.dir, pendingProject.meta);
  }

  // --- Render ---

  if (wizardStep === "gitRemote" && pendingProject) {
    return (
      <GitRemoteScreen
        dir={pendingProject.dir}
        projectName={pendingProject.name}
        onAddRemote={handleAddRemote}
        onCreateRepo={handleCreateRepo}
        onSkip={handleRemoteSkip}
      />
    );
  }

  if (wizardStep === "gitSetup" && pendingProject) {
    return (
      <GitSetupScreen
        dir={pendingProject.dir}
        projectName={pendingProject.name}
        mode={pendingProject.mode}
        onInitGit={handleGitInit}
        onSkip={handleGitSkip}
        onDismiss={handleGitDismiss}
      />
    );
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="w-full max-w-xl animate-fade-up">
        {/* Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-raised border border-edge flex items-center justify-center">
              <span className="text-lg font-bold text-phase-architecture">/</span>
            </div>
            <h1 className="text-3xl font-bold text-ink tracking-tight">AgentDash</h1>
          </div>
          <p className="text-ink-muted text-sm">
            Structured development workflows, powered by Claude
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleCreate}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-lg border bg-panel border-edge text-ink-muted hover:border-phase-environment hover:text-phase-environment transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "..." : "+ New Project"}
          </button>
          <button
            onClick={handleOpenPicker}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-lg border bg-panel border-edge text-ink-muted hover:border-accent hover:text-accent transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "..." : "Open Existing"}
          </button>
        </div>

        {/* Optional: project name for new projects */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-ink-faint font-mono uppercase tracking-wider mb-1.5">
            Project Name <span className="text-ink-faint">(optional, for new projects)</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-app"
            className="w-full bg-panel border border-edge rounded-md px-3 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-edge-bright transition-colors"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-phase-tasks/10 border border-phase-tasks/20 rounded-lg px-4 py-3 mb-6 text-sm text-phase-tasks animate-fade-up">
            {error}
          </div>
        )}

        {/* Recent projects */}
        {recent.length > 0 && (
          <div>
            <h2 className="text-xs font-medium text-ink-faint font-mono uppercase tracking-wider mb-3">
              Recent Projects
            </h2>
            <div className="space-y-1.5 stagger">
              {recent.map((project) => (
                <button
                  key={project.dir}
                  onClick={() => handleOpen(project.dir)}
                  disabled={loading}
                  className="w-full flex items-center justify-between px-4 py-3 bg-panel border border-edge rounded-lg hover:border-edge-bright hover:bg-raised transition-all text-left group disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-ink truncate">
                      {project.name}
                    </div>
                    <div className="text-xs text-ink-faint font-mono truncate mt-0.5">
                      {project.dir}
                    </div>
                  </div>
                  <div className="text-xs text-ink-faint ml-4 shrink-0 group-hover:text-ink-muted transition-colors">
                    {formatDate(project.lastOpened)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {recent.length === 0 && (
          <div className="text-center py-8">
            <p className="text-ink-faint text-sm">
              No recent projects. Create a new one to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
