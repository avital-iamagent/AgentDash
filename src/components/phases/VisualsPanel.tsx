import { useState, useEffect, useCallback } from "react";
import { subscribeToFileChanges } from "../../hooks/useWebSocket";

interface VisualEntry {
  id: string;
  filename: string;
  userPrompt: string;
  imagePrompt: string;
  createdAt: string;
}

function Lightbox({
  image,
  onClose,
}: {
  image: VisualEntry;
  onClose: () => void;
}) {
  const imageUrl = `/api/visuals/image/${image.filename}`;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleDownload() {
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = image.filename;
    a.click();
  }

  function handlePopOut() {
    const w = window.open("", "_blank", "width=1000,height=700,resizable=yes,scrollbars=yes");
    if (!w) return;
    w.document.write(`<!DOCTYPE html>
<html><head><title>${image.userPrompt.slice(0, 60)}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh}img{max-width:100%;max-height:100vh;object-fit:contain}</style>
</head><body><img src="${window.location.origin}${imageUrl}" /></body></html>`);
    w.document.close();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-[90vw] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-white/60 truncate max-w-[60vw]">
            {image.userPrompt}
          </p>
          <div className="flex items-center gap-1 shrink-0 ml-3">
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Download"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
            <button
              onClick={handlePopOut}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Open in new window"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Close (Esc)"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
        {/* Image */}
        <img
          src={imageUrl}
          alt={image.userPrompt}
          className="max-w-[90vw] max-h-[calc(90vh-2rem)] object-contain rounded-lg"
        />
      </div>
    </div>
  );
}

export default function VisualsPanel() {
  const [images, setImages] = useState<VisualEntry[]>([]);
  const [userPrompt, setUserPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<VisualEntry | null>(null);

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
      {lightboxImage && (
        <Lightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}

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
          {images.map((img) => (
            <div
              key={img.id}
              className="rounded-xl border border-edge bg-raised overflow-hidden hover:border-phase-tasks/30 cursor-pointer transition-all"
              onClick={() => setLightboxImage(img)}
            >
              <img
                src={`/api/visuals/image/${img.filename}`}
                alt={img.userPrompt}
                className="w-full h-48 object-cover object-top"
              />
              <div className="px-3 py-2">
                <p className="text-xs text-ink truncate">{img.userPrompt}</p>
                <p className="text-[10px] text-ink-faint font-mono mt-0.5">
                  {new Date(img.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
