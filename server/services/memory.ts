import { query } from "@anthropic-ai/claude-agent-sdk";
import fs from "fs/promises";
import path from "path";

const PHASE_NAMES = ["brainstorm", "research", "architecture", "tasks", "design", "coding"] as const;
type PhaseName = (typeof PHASE_NAMES)[number];

const SUMMARY_THRESHOLD = 6; // regenerate after 6+ new entries
const CONTEXT_BUDGET = 12_000; // chars
const CURRENT_SUMMARY_BUDGET = 3000;
const CURRENT_RAW_BUDGET = 4000;
const ADJACENT_SUMMARY_BUDGET = 1500;
const DISTANT_SUMMARY_LIMIT = 200;
const DEFAULT_HALF_LIFE_DAYS = 14;
const SCORE_THRESHOLD = 0.05;

// ─── Helpers ──────────────────────────────────────────────

function memoryDir(projectDir: string): string {
  return path.join(projectDir, ".agentdash", "memory");
}

function summaryPath(projectDir: string, phase: string): string {
  return path.join(memoryDir(projectDir), `${phase}-summary.md`);
}

function indexPath(projectDir: string): string {
  return path.join(memoryDir(projectDir), "search-index.json");
}

async function readHistory(projectDir: string): Promise<{ role: string; content: string; phase: string; timestamp?: string }[]> {
  try {
    const raw = await fs.readFile(path.join(projectDir, ".agentdash", "history.json"), "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function phaseDistance(a: string, b: string): number {
  const ia = PHASE_NAMES.indexOf(a as PhaseName);
  const ib = PHASE_NAMES.indexOf(b as PhaseName);
  if (ia === -1 || ib === -1) return Infinity;
  return Math.abs(ia - ib);
}

// ─── Feature 1: AI Summarization ─────────────────────────

const MIN_SUMMARY_LENGTH = 200;
const STUB_PATTERNS = [
  /^let me (check|read|look|review|examine|verify|search|find|inspect)/i,
  /^i('ll| will| need to| should) (check|read|look|review|examine|verify|search|find|inspect)/i,
];

function isStubResponse(text: string): boolean {
  const trimmed = text.replace(/^#.*\n*/gm, "").trim();
  return STUB_PATTERNS.some((p) => p.test(trimmed));
}

function parseEntryCount(summary: string): number {
  const match = summary.match(/<!-- entryCount: (\d+) -->/);
  return match ? parseInt(match[1], 10) : 0;
}

function isSummaryValid(content: string): boolean {
  const body = content.replace(/^<!-- entryCount: \d+ -->\n/, "");
  return body.length >= MIN_SUMMARY_LENGTH && !isStubResponse(body);
}

export async function shouldRegenerateSummary(projectDir: string, phase: string): Promise<boolean> {
  const entries = await readHistory(projectDir);
  const phaseEntries = entries.filter((e) => e.phase === phase);
  if (phaseEntries.length === 0) return false;

  try {
    const existing = await fs.readFile(summaryPath(projectDir, phase), "utf-8");
    // Always regenerate if the existing summary is invalid (stub/too short)
    if (!isSummaryValid(existing)) return true;
    const lastCount = parseEntryCount(existing);
    return phaseEntries.length - lastCount >= SUMMARY_THRESHOLD;
  } catch {
    // No summary yet — generate if there are enough entries
    return phaseEntries.length >= SUMMARY_THRESHOLD;
  }
}

export async function generatePhaseSummary(projectDir: string, phase: string): Promise<void> {
  const entries = await readHistory(projectDir);
  const phaseEntries = entries.filter((e) => e.phase === phase);
  if (phaseEntries.length === 0) return;

  const conversationText = phaseEntries
    .map((e) => {
      const role = e.role === "user" ? "User" : "Assistant";
      const content = e.content.length > 2000 ? e.content.slice(0, 2000) + "…" : e.content;
      return `${role}: ${content}`;
    })
    .join("\n\n");

  // Truncate to fit Haiku context reasonably
  const truncated = conversationText.slice(0, 30_000);

  const MAX_ATTEMPTS = 2;

  try {
    let summaryText = "";

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      summaryText = "";
      const stream = query({
        prompt: `Below is the full conversation from the "${phase}" phase. Summarize it directly based on what you read below. Do NOT attempt to read files, check state, or take any actions — just summarize the conversation text provided.\n\nFocus on: key decisions made, open questions, important context for future work. Be concise (under 800 words). Use bullet points.\n\n---\n\n${truncated}`,
        options: {
          cwd: projectDir,
          model: "haiku",
          systemPrompt: "You are a conversation summarizer. You will be given a conversation transcript. Summarize it directly — do NOT say 'let me check' or 'let me read', do NOT attempt any actions. Output structured markdown with sections: ## Key Decisions, ## Open Questions, ## Important Context. Be concise.",
          maxTurns: 1,
          persistSession: false,
          allowedTools: [],
        },
      });

      for await (const msg of stream) {
        if (msg.type === "result") {
          const result = msg as any;
          if (typeof result.result === "string") {
            summaryText = result.result;
          }
        } else if (msg.type === "assistant") {
          const assistantMsg = msg as any;
          const text = assistantMsg.message?.content
            ?.filter((b: any) => b.type === "text")
            .map((b: any) => b.text)
            .join("");
          if (text) summaryText = text;
        }
      }

      // Validate: must be non-empty, at least 200 chars, and not a "thinking aloud" stub
      if (summaryText && summaryText.length >= 200 && !isStubResponse(summaryText)) {
        break;
      }

      console.warn(
        `[AgentDash] Summary attempt ${attempt}/${MAX_ATTEMPTS} for ${phase} produced invalid output (${summaryText.length} chars), ${attempt < MAX_ATTEMPTS ? "retrying" : "giving up"}`
      );
      summaryText = "";
    }

    if (!summaryText) {
      console.warn(`[AgentDash] Failed to generate valid summary for ${phase} after ${MAX_ATTEMPTS} attempts, skipping`);
      return;
    }

    await fs.mkdir(memoryDir(projectDir), { recursive: true });
    const header = `<!-- entryCount: ${phaseEntries.length} -->\n`;
    await fs.writeFile(summaryPath(projectDir, phase), header + summaryText);
    console.log(`[AgentDash] Generated summary for ${phase} (${phaseEntries.length} entries, ${summaryText.length} chars)`);

    await rebuildSearchIndex(projectDir);
  } catch (err) {
    console.warn(`[AgentDash] Failed to generate summary for ${phase}:`, err instanceof Error ? err.message : err);
  }
}

export async function readPhaseSummary(projectDir: string, phase: string): Promise<string> {
  try {
    const content = await fs.readFile(summaryPath(projectDir, phase), "utf-8");
    // Strip the entryCount header line
    return content.replace(/^<!-- entryCount: \d+ -->\n/, "");
  } catch {
    return "";
  }
}

// ─── Feature 2: Context Building ─────────────────────────

export function readRawTail(
  entries: { role: string; content: string; phase: string }[],
  phase: string,
  count: number,
  charLimit: number
): string {
  const phaseEntries = entries.filter((e) => e.phase === phase).slice(-count);
  if (phaseEntries.length === 0) return "";

  let result = "";
  for (const e of phaseEntries) {
    const role = e.role === "user" ? "User" : "Assistant";
    const content = e.content.length > 10_000 ? e.content.slice(0, 10_000) + "…" : e.content;
    const line = `${role}: ${content}\n\n`;
    if (result.length + line.length > charLimit) break;
    result += line;
  }
  return result;
}

export async function buildMemoryContext(projectDir: string, currentPhase: string): Promise<string> {
  let meta: any;
  try {
    const raw = await fs.readFile(path.join(projectDir, ".agentdash", "meta.json"), "utf-8");
    meta = JSON.parse(raw);
  } catch {
    return "";
  }

  const entries = await readHistory(projectDir);
  const parts: string[] = [];
  let budget = CONTEXT_BUDGET;

  // Current phase: summary + raw tail
  const currentSummary = await readPhaseSummary(projectDir, currentPhase);
  if (currentSummary) {
    const trimmed = currentSummary.slice(0, CURRENT_SUMMARY_BUDGET);
    parts.push(`### ${currentPhase} phase summary\n${trimmed}`);
    budget -= trimmed.length + 40;
  }

  const rawTail = readRawTail(entries, currentPhase, 4, Math.min(CURRENT_RAW_BUDGET, budget));
  if (rawTail) {
    parts.push(`### Recent conversation\n${rawTail}`);
    budget -= rawTail.length + 30;
  }

  // Other phases
  for (const phase of PHASE_NAMES) {
    if (phase === currentPhase || budget <= 0) continue;
    const phaseStatus = meta.phases?.[phase]?.status;
    if (!phaseStatus || phaseStatus === "locked") continue;

    const dist = phaseDistance(currentPhase, phase);
    const summary = await readPhaseSummary(projectDir, phase);
    if (!summary) continue;

    if (dist === 1 && (phaseStatus === "active" || phaseStatus === "completed")) {
      // Adjacent: full summary up to budget
      const trimmed = summary.slice(0, Math.min(ADJACENT_SUMMARY_BUDGET, budget));
      parts.push(`### ${phase} phase summary\n${trimmed}`);
      budget -= trimmed.length + 30;
    } else if (dist >= 2 && phaseStatus === "completed") {
      // Distant: truncated
      const trimmed = summary.slice(0, Math.min(DISTANT_SUMMARY_LIMIT, budget));
      parts.push(`### ${phase} phase (brief)\n${trimmed}…`);
      budget -= trimmed.length + 30;
    }
  }

  return parts.join("\n\n");
}

// ─── Feature 3: BM25 Search ──────────────────────────────

interface SearchEntry {
  id: string;
  phase: string;
  timestamp: number;
  tokens: string[];
  snippet: string;
}

interface SearchIndex {
  entries: SearchEntry[];
}

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "to", "of", "in", "for",
  "on", "with", "at", "by", "from", "as", "into", "through", "during",
  "before", "after", "above", "below", "between", "and", "but", "or",
  "nor", "not", "so", "yet", "both", "either", "neither", "each",
  "every", "all", "any", "few", "more", "most", "other", "some",
  "such", "no", "only", "own", "same", "than", "too", "very",
  "it", "its", "this", "that", "these", "those", "i", "we", "you",
  "he", "she", "they", "me", "us", "him", "her", "them", "my", "our",
  "your", "his", "their",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

function makeSnippet(content: string, maxLen = 200): string {
  const clean = content.replace(/\s+/g, " ").trim();
  return clean.length > maxLen ? clean.slice(0, maxLen) + "…" : clean;
}

export async function rebuildSearchIndex(projectDir: string): Promise<void> {
  const entries = await readHistory(projectDir);
  const indexEntries: SearchEntry[] = [];

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const tokens = tokenize(e.content);
    if (tokens.length === 0) continue;
    indexEntries.push({
      id: String(i),
      phase: e.phase,
      timestamp: e.timestamp ? new Date(e.timestamp).getTime() : Date.now() - (entries.length - i) * 60_000,
      tokens,
      snippet: makeSnippet(e.content),
    });
  }

  await fs.mkdir(memoryDir(projectDir), { recursive: true });
  await fs.writeFile(indexPath(projectDir), JSON.stringify({ entries: indexEntries }, null, 2));
}

export function temporalScore(baseScore: number, timestampMs: number, halfLifeDays = DEFAULT_HALF_LIFE_DAYS): number {
  const ageMs = Date.now() - timestampMs;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return baseScore * Math.exp((-Math.LN2 / halfLifeDays) * ageDays);
}

type Scorer = (queryTokens: string[], docTokens: string[]) => number;

function bm25Score(queryTokens: string[], docTokens: string[], avgDl: number, k1 = 1.5, b = 0.75): number {
  const dl = docTokens.length;
  const tf = new Map<string, number>();
  for (const t of docTokens) {
    tf.set(t, (tf.get(t) ?? 0) + 1);
  }

  let score = 0;
  for (const qt of queryTokens) {
    const freq = tf.get(qt) ?? 0;
    if (freq === 0) continue;
    const numerator = freq * (k1 + 1);
    const denominator = freq + k1 * (1 - b + b * (dl / avgDl));
    score += numerator / denominator;
  }
  return score;
}

export async function searchMemory(
  projectDir: string,
  queryText: string,
  topK = 5,
  scorer?: Scorer
): Promise<{ id: string; phase: string; snippet: string; score: number }[]> {
  let index: SearchIndex;
  try {
    const raw = await fs.readFile(indexPath(projectDir), "utf-8");
    index = JSON.parse(raw);
  } catch {
    return [];
  }

  if (index.entries.length === 0) return [];

  const queryTokens = tokenize(queryText);
  if (queryTokens.length === 0) return [];

  const avgDl = index.entries.reduce((sum, e) => sum + e.tokens.length, 0) / index.entries.length;
  const scoreFn = scorer ?? ((qt: string[], dt: string[]) => bm25Score(qt, dt, avgDl));

  const scored = index.entries
    .map((entry) => {
      const base = scoreFn(queryTokens, entry.tokens);
      const final = temporalScore(base, entry.timestamp);
      return { id: entry.id, phase: entry.phase, snippet: entry.snippet, score: final };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}

export async function findRelevantContext(
  projectDir: string,
  userMessage: string,
  topK = 3
): Promise<string> {
  const results = await searchMemory(projectDir, userMessage, topK);
  const relevant = results.filter((r) => r.score >= SCORE_THRESHOLD);
  if (relevant.length === 0) return "";

  return relevant
    .map((r) => `- [${r.phase}] ${r.snippet}`)
    .join("\n");
}
