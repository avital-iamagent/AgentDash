import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  tags?: string[];
  status?: { label: string; color: string };
  accentColor?: string;
  highlight?: boolean;
  children?: ReactNode;
  className?: string;
}

export default function Card({
  title,
  tags,
  status,
  accentColor,
  highlight,
  children,
  className = "",
}: CardProps) {
  return (
    <div
      className={`rounded-lg border bg-raised p-4 transition-colors ${
        highlight ? "ring-1" : ""
      } ${className}`}
      style={{
        borderColor: highlight && accentColor
          ? accentColor
          : "var(--color-edge)",
        ...(highlight && accentColor
          ? { ringColor: accentColor, boxShadow: `0 0 0 1px ${accentColor}` }
          : {}),
        ...(accentColor
          ? { borderLeftWidth: "3px", borderLeftColor: accentColor }
          : {}),
      }}
    >
      {/* Header row: title + status */}
      {(title || status) && (
        <div className="flex items-start justify-between gap-2 mb-2">
          {title && (
            <h4 className="text-sm font-medium text-ink leading-tight">
              {title}
            </h4>
          )}
          {status && (
            <span
              className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
              style={{
                color: status.color,
                backgroundColor: `color-mix(in srgb, ${status.color} 12%, transparent)`,
              }}
            >
              {status.label}
            </span>
          )}
        </div>
      )}

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono text-ink-muted bg-overlay"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Body */}
      {children}
    </div>
  );
}
