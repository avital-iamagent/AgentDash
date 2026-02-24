import { useState, useEffect, useCallback } from "react";
import { subscribeToFileChanges } from "../../hooks/useWebSocket";
import MarkdownRenderer from "../shared/MarkdownRenderer";

interface NoteCard {
  /** "phase/filename.md" as returned by the API */
  path: string;
  phase: string;
  title: string;
  date: string;
}

const PHASE_LABELS: Record<string, string> = {
  brainstorm: "Brainstorm",
  research: "Research",
  architecture: "Architecture",
  environment: "Environment",
  tasks: "Tasks",
};

function parseNote(notePath: string): NoteCard {
  // Format: "brainstorm/2025-01-15T12-00-00-some-topic-slug.md"
  const slashIdx = notePath.indexOf("/");
  const phase = slashIdx >= 0 ? notePath.slice(0, slashIdx) : "";
  const filename = slashIdx >= 0 ? notePath.slice(slashIdx + 1) : notePath;

  const stem = filename.replace(/\.md$/, "");
  const tsMatch = stem.match(/^(\d{4}-\d{2}-\d{2})T[\d-]+-(.*)/);
  if (tsMatch) {
    const date = tsMatch[1];
    const slug = tsMatch[2];
    const title = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return { path: notePath, phase, title, date };
  }
  const title = stem.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { path: notePath, phase, title, date: "" };
}

export default function ResearchNotesPanel() {
  const [notes, setNotes] = useState<NoteCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/research-notes");
      if (res.ok) {
        const data = await res.json();
        const parsed = (data.notes as string[]).map(parseNote);
        setNotes(parsed);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Auto-refresh when any phase's files change (notes live inside phase dirs)
  useEffect(() => {
    return subscribeToFileChanges((phase) => {
      if (phase && (phase in PHASE_LABELS)) {
        fetchNotes();
      }
    });
  }, [fetchNotes]);

  async function toggleNote(notePath: string) {
    if (expandedNote === notePath) {
      setExpandedNote(null);
      setNoteContent(null);
      return;
    }

    setExpandedNote(notePath);
    setContentLoading(true);
    setNoteContent(null);

    try {
      // notePath is "phase/filename.md"
      const res = await fetch(`/api/research-notes/${notePath}`);
      if (res.ok) {
        const data = await res.json();
        setNoteContent(data.content);
      }
    } catch {
      // silent
    } finally {
      setContentLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-ink-faint text-sm">
        Loading notes...
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg className="w-10 h-10 text-ink-faint/40 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
        </svg>
        <p className="text-sm text-ink-muted mb-1">No research notes yet.</p>
        <p className="text-xs text-ink-faint max-w-xs">
          Use the Research button in the sidebar to investigate any question.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {notes.map((note) => {
        const isExpanded = expandedNote === note.path;
        return (
          <div
            key={note.path}
            className={`rounded-lg border transition-all ${
              isExpanded
                ? "border-phase-research/40 bg-phase-research/5 col-span-full"
                : "border-edge bg-raised hover:border-phase-research/30 cursor-pointer"
            }`}
          >
            <button
              onClick={() => toggleNote(note.path)}
              className="w-full text-left px-4 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink truncate">
                    {note.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {note.phase && (
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `color-mix(in srgb, var(--color-phase-${note.phase}) 12%, transparent)`,
                          color: `var(--color-phase-${note.phase})`,
                        }}
                      >
                        {PHASE_LABELS[note.phase] || note.phase}
                      </span>
                    )}
                    {note.date && (
                      <span className="text-[11px] text-ink-faint font-mono">
                        {note.date}
                      </span>
                    )}
                  </div>
                </div>
                <svg
                  className={`w-4 h-4 shrink-0 text-ink-faint transition-transform mt-0.5 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-edge/50">
                {contentLoading ? (
                  <div className="py-4 text-xs text-ink-faint">Loading...</div>
                ) : noteContent ? (
                  <div className="pt-3">
                    <MarkdownRenderer content={noteContent} />
                  </div>
                ) : (
                  <div className="py-4 text-xs text-ink-faint">Failed to load note.</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
