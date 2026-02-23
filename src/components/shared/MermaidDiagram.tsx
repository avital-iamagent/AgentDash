import { useEffect, useRef, useState, useId } from "react";
import mermaid from "mermaid";

// Module-level init guard — safe with StrictMode double-mount
let mermaidInitialized = false;

function ensureMermaidInit() {
  if (mermaidInitialized) return;
  mermaidInitialized = true;
  mermaid.initialize({
    startOnLoad: false,
    darkMode: true,
    theme: "dark",
    themeVariables: {
      darkMode: true,
      primaryColor: "#1a1a24",
      primaryTextColor: "#e8e8ed",
      primaryBorderColor: "#3a3a4e",
      lineColor: "#3a3a4e",
      secondaryColor: "#22222e",
      tertiaryColor: "#111118",
      fontFamily: "'Sora', system-ui, sans-serif",
      fontSize: "13px",
    },
  });
}

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

export default function MermaidDiagram({ chart, className = "" }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const uniqueId = useId().replace(/:/g, "-");

  useEffect(() => {
    if (!chart.trim() || !containerRef.current) return;

    ensureMermaidInit();

    let cancelled = false;
    const id = `mermaid-${uniqueId}`;

    (async () => {
      try {
        const { svg } = await mermaid.render(id, chart.trim());
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to render diagram");
          // Clean up any leftover element mermaid may have inserted
          document.getElementById(`d${id}`)?.remove();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart, uniqueId]);

  if (error) {
    return (
      <div className={`rounded-lg border border-edge bg-canvas p-4 ${className}`}>
        <p className="text-xs text-phase-tasks font-mono mb-2">Diagram render error</p>
        <pre className="text-xs text-ink-muted font-mono whitespace-pre-wrap">{error}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`rounded-lg border border-edge bg-canvas p-4 overflow-x-auto [&_svg]:mx-auto ${className}`}
    />
  );
}
