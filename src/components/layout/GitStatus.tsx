import { useAppStore } from "../../stores/appStore";

export default function GitStatus() {
  const git = useAppStore((s) => s.meta?.git);

  if (!git?.enabled) return null;

  return (
    <div className="px-4 py-2.5 border-t border-edge">
      <div className="text-[10px] font-mono uppercase tracking-wider text-ink-faint mb-1.5">
        Git
      </div>
      <div className="space-y-1">
        {git.branch && (
          <div className="flex items-center gap-1.5">
            <svg
              className="w-3 h-3 text-ink-muted shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            <span className="text-[11px] text-ink-muted font-mono truncate">
              {git.branch}
            </span>
          </div>
        )}
        {git.lastCommit && (
          <div className="text-[10px] text-ink-faint font-mono truncate" title={git.lastCommit}>
            {git.lastCommit}
          </div>
        )}
        {git.remoteUrl && (
          <div className="text-[10px] text-ink-faint font-mono truncate" title={git.remoteUrl}>
            {git.remoteUrl.replace(/^https?:\/\//, "").replace(/\.git$/, "")}
          </div>
        )}
      </div>
    </div>
  );
}
