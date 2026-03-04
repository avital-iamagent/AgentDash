import { useState, useEffect, useCallback } from "react";
import { subscribeToFileChanges } from "../../hooks/useWebSocket";

interface VisualEntry {
  id: string;
  filename: string;
  userPrompt: string;
  imagePrompt: string;
  createdAt: string;
}

export default function VisualsPanel() {
  const [images, setImages] = useState<VisualEntry[]>([]);
  const [userPrompt, setUserPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchImages = useCallback(() => {
    fetch("/api/visuals/list")
      .then((r) => r.json())
      .then((data) => setImages(((data.images ?? []) as VisualEntry[]).slice().reverse()))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Refetch when visuals/index.json changes (auto-generated images)
  useEffect(() => {
    return subscribeToFileChanges((_phase, file) => {
      if (file.includes("visuals/index.json")) {
        fetchImages();
      }
    });
  }, [fetchImages]);

  async function handleGenerate() {
    if (!userPrompt.trim() || generating) return;

    setGenerating(true);
    setError(null);
    setStatus("Crafting prompt...");

    // Switch status message after 2s to reflect the image generation phase
    const statusTimer = setTimeout(() => setStatus("Generating image..."), 2000);

    try {
      const res = await fetch("/api/visuals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userPrompt: userPrompt.trim() }),
      });

      clearTimeout(statusTimer);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Generation failed");
      }

      const entry: VisualEntry = await res.json();
      setImages((prev) => [entry, ...prev]);
      setUserPrompt("");
    } catch (err) {
      clearTimeout(statusTimer);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
      setStatus(null);
    }
  }

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Input area */}
      <div className="rounded-xl border border-edge bg-raised p-4 space-y-3">
        <label className="block text-xs font-medium text-ink-muted uppercase tracking-wide">
          Describe a UI component
        </label>
        <textarea
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
          }}
          placeholder="e.g. A dark-themed dashboard card showing user metrics with a circular progress indicator..."
          rows={3}
          disabled={generating}
          className="w-full bg-canvas border border-edge rounded-lg px-3 py-2 text-sm text-ink placeholder:text-ink-faint resize-none outline-none focus:border-phase-tasks/50 transition-colors disabled:opacity-50"
        />
        <div className="flex items-center justify-between gap-3">
          {error && <p className="text-xs text-phase-tasks flex-1">{error}</p>}
          {status && !error && (
            <div className="flex items-center gap-2 text-xs text-ink-faint">
              <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
              {status}
            </div>
          )}
          {!status && !error && <span />}
          <button
            onClick={handleGenerate}
            disabled={generating || !userPrompt.trim()}
            className="shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40"
            style={{
              color: "var(--color-canvas)",
              backgroundColor: "var(--color-phase-tasks)",
            }}
          >
            Generate
          </button>
        </div>
      </div>

      {/* Gallery */}
      {images.length === 0 && !generating ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg
            className="w-10 h-10 text-ink-faint/40 mb-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-sm text-ink-muted mb-1">No visuals yet.</p>
          <p className="text-xs text-ink-faint max-w-xs">
            Describe a UI component above to generate a reference image.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((img) => {
            const isExpanded = expandedId === img.id;
            return (
              <div
                key={img.id}
                className={`rounded-xl border overflow-hidden transition-all ${
                  isExpanded
                    ? "border-phase-tasks/40 bg-phase-tasks/5 col-span-full"
                    : "border-edge bg-raised hover:border-phase-tasks/30 cursor-pointer"
                }`}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : img.id)}
                  className="w-full text-left"
                >
                  <img
                    src={`/api/visuals/image/${img.filename}`}
                    alt={img.userPrompt}
                    className={`w-full object-cover object-top ${isExpanded ? "max-h-[600px]" : "h-48"}`}
                  />
                  <div className="px-3 py-2">
                    <p className="text-xs text-ink truncate">{img.userPrompt}</p>
                    <p className="text-[10px] text-ink-faint font-mono mt-0.5">
                      {new Date(img.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-edge/50">
                    <p className="text-[11px] text-ink-faint mt-2 leading-relaxed">
                      <span className="text-ink-muted font-medium">Image prompt: </span>
                      <span className="italic">{img.imagePrompt}</span>
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
