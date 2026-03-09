import { z } from "zod";

// --- Phase status enum ---
const phaseStatusSchema = z.enum(["locked", "active", "completed"]);

// --- Per-phase metadata in meta.json ---
const phaseMetaSchema = z.object({
  status: phaseStatusSchema.catch("locked"),
  startedAt: z.string().nullable().optional().default(null),
  completedAt: z.string().nullable().optional().default(null),
  artifactApproved: z.boolean().optional().default(false),
  reviewReport: z.string().nullable().optional().default(null),
});

// --- meta.json ---
export const metaSchema = z.object({
  schemaVersion: z.number().optional().default(0),
  projectName: z.string(),
  createdAt: z.string(),
  activePhase: z.enum(["brainstorm", "research", "architecture", "tasks", "design", "coding"]),
  phases: z.object({
    brainstorm: phaseMetaSchema,
    research: phaseMetaSchema,
    architecture: phaseMetaSchema,
    tasks: phaseMetaSchema,
    design: phaseMetaSchema,
    coding: phaseMetaSchema,
  }),
  git: z.object({
    enabled: z.boolean().optional().default(false),
    branch: z.string().nullable().optional().default(null),
    lastCommit: z.string().nullable().optional().default(null),
    remoteUrl: z.string().nullable().optional().default(null),
    authMethod: z.string().nullable().optional().default(null),
    gitDismissed: z.boolean().optional().default(false),
  }).optional().default({}),
});

// --- brainstorm/state.json ---
const brainstormCardSchema = z.object({
  id: z.string(),
  // Accept text/content/description/idea as the card body
  text: z.string().optional(),
  content: z.string().optional(),
  description: z.string().optional(),
  idea: z.string().optional(),
  group: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  status: z.string().optional().default("proposed"),
  notes: z.string().optional(),
  createdBy: z.string().optional().default("claude-code"),
  createdAt: z.string().optional(),
}).passthrough().transform(c => ({
  ...c,
  text: c.text || c.content || c.description || c.idea || "",
  status: (["proposed", "accepted", "rejected"].includes(c.status ?? "") ? c.status : "proposed") as "proposed" | "accepted" | "rejected",
  createdBy: (["user", "claude-code"].includes(c.createdBy ?? "") ? c.createdBy : "claude-code") as "user" | "claude-code",
}));

const brainstormGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional(),
}).passthrough();

export const brainstormStateSchema = z.object({
  updatedAt: z.string().nullable(),
  updatedBy: z.string(),
  // Accept cards/ideas/items as the array name
  cards: z.array(z.unknown()).optional(),
  ideas: z.array(z.unknown()).optional(),
  items: z.array(z.unknown()).optional(),
  groups: z.array(brainstormGroupSchema).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
}).passthrough().transform(raw => {
  type Card = z.infer<typeof brainstormCardSchema>;
  const rawCards = raw.cards || raw.ideas || raw.items || [];
  const cards: Card[] = rawCards.map(c => {
    const result = brainstormCardSchema.safeParse(c);
    return result.success ? result.data : c as Card;
  });
  return {
    updatedAt: raw.updatedAt,
    updatedBy: raw.updatedBy,
    cards,
    groups: raw.groups || [],
    tags: raw.tags || [],
  };
});

// --- research/state.json ---
const researchSourceSchema = z.object({
  title: z.string().optional().default(""),
  name: z.string().optional(),
  url: z.string().optional(),
  link: z.string().optional(),
}).passthrough().transform(s => ({
  title: s.title || s.name || "",
  url: s.url || s.link || undefined,
}));

const VALID_CATEGORIES = ["competitor", "tech-stack", "pattern", "risk"] as const;
const VALID_VERDICTS = ["adopt", "learn-from", "avoid", "needs-more-research"] as const;

const researchItemSchema = z.object({
  id: z.string(),
  topic: z.string().optional().default(""),
  name: z.string().optional(),
  title: z.string().optional(),
  category: z.string().optional().default("tech-stack"),
  summary: z.string().optional().default(""),
  description: z.string().optional(),
  status: z.string().optional().default("researched"),
  verdict: z.string().optional().default("needs-more-research"),
  recommendation: z.string().optional(),
  sources: z.array(z.unknown()).optional().default([]),
  findingsFile: z.string().nullable().optional(),
}).passthrough().transform(item => {
  const sources = (item.sources || []).map(s => {
    const result = researchSourceSchema.safeParse(s);
    return result.success ? result.data : { title: String(s), url: undefined };
  });
  return {
    ...item,
    topic: item.topic || item.name || item.title || "",
    category: (VALID_CATEGORIES.includes(item.category as typeof VALID_CATEGORIES[number]) ? item.category : "tech-stack") as typeof VALID_CATEGORIES[number],
    summary: item.summary || item.description || "",
    verdict: (VALID_VERDICTS.includes((item.verdict || item.recommendation || "") as typeof VALID_VERDICTS[number])
      ? (item.verdict || item.recommendation) : "needs-more-research") as typeof VALID_VERDICTS[number],
    sources,
  };
});

export const researchStateSchema = z.object({
  updatedAt: z.string().nullable(),
  updatedBy: z.string(),
  // Accept items/research/findings/entries as the array name
  items: z.array(z.unknown()).optional(),
  research: z.array(z.unknown()).optional(),
  findings: z.array(z.unknown()).optional(),
  entries: z.array(z.unknown()).optional(),
  categories: z.array(z.string()).optional().default([]),
  verdicts: z.array(z.string()).optional().default([]),
}).passthrough().transform(raw => {
  type ResearchItem = z.infer<typeof researchItemSchema>;
  const rawItems = raw.items || raw.research || raw.findings || raw.entries || [];
  const items: ResearchItem[] = rawItems.map(i => {
    const result = researchItemSchema.safeParse(i);
    return result.success ? result.data : i as ResearchItem;
  });
  return {
    updatedAt: raw.updatedAt,
    updatedBy: raw.updatedBy,
    items,
    categories: raw.categories || [],
    verdicts: raw.verdicts || [],
  };
});

// --- architecture/state.json ---
const componentSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  type: z.string().optional().default("service"),
  responsibility: z.string().optional(),
  description: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  deps: z.array(z.string()).optional(),
}).passthrough().transform(c => ({
  ...c,
  responsibility: c.responsibility || c.description || "",
  dependencies: c.dependencies || c.deps || [],
}));

const decisionSchema = z.object({
  id: z.string().optional(),
  choice: z.string().optional(),
  decision: z.string().optional(),
  selected: z.string().optional(),
  rationale: z.string().optional(),
  reason: z.string().optional(),
  why: z.string().optional(),
  alternatives: z.array(z.string()).optional(),
}).passthrough().transform(d => ({
  ...d,
  choice: d.choice || d.decision || d.selected || "",
  rationale: d.rationale || d.reason || d.why || "",
  alternatives: d.alternatives || [],
}));

const diagramSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  name: z.string().optional(),
  mermaid: z.string().optional(),
  content: z.string().optional(),
  type: z.string().optional(),
}).transform(d => ({
  id: d.id,
  title: d.title || d.name || "",
  mermaid: d.mermaid || d.content || "",
}));

const riskSchema = z.object({
  id: z.string().optional(),
  description: z.string().optional(),
  risk: z.string().optional(),
  severity: z.enum(["high", "medium", "low"]),
  mitigation: z.string(),
}).transform(r => ({
  id: r.id,
  description: r.description || r.risk || "",
  severity: r.severity,
  mitigation: r.mitigation,
}));

export const architectureStateSchema = z.object({
  updatedAt: z.string().nullable(),
  updatedBy: z.string(),
  components: z.array(componentSchema).optional().default([]),
  decisions: z.array(decisionSchema).optional().default([]),
  diagrams: z.array(diagramSchema).optional().default([]),
  risks: z.array(riskSchema).optional().default([]),
}).passthrough();

// --- tasks/state.json ---
// Permissive task schema: accepts both canonical fields and common alternatives
const taskItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional().default(""),
  acceptanceCriteria: z.array(z.string()).optional(),
  estimate: z.string().optional(),
  priority: z.enum(["must", "should", "could"]).optional(),
  // Accept alternative field names Claude may use
  risk: z.string().optional(),
  deps: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  status: z.string().default("pending"),
  milestone: z.string().optional(),
  commits: z.array(z.string()).optional(),
  notes: z.string().optional(),
  designNotes: z.string().optional(),
  visualId: z.string().optional(),
  verify: z.array(z.string()).optional(),
}).passthrough().transform(t => ({
  ...t,
  description: t.description || "",
  priority: t.priority || (t.risk === "high" ? "must" : t.risk === "medium" ? "should" : "could") as "must" | "should" | "could",
  dependencies: t.dependencies || t.deps || [],
  status: (["pending", "in-progress", "done", "blocked"].includes(t.status) ? t.status : "pending") as "pending" | "in-progress" | "done" | "blocked",
}));

// Milestones: tasks can be string IDs or inline task objects
const milestoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string().optional(),
  tasks: z.array(z.union([z.string(), z.record(z.unknown())])),
  verify: z.array(z.string()).optional(),
}).passthrough();

// The main transform: if no top-level `tasks`, extract them from milestones
export const tasksStateSchema = z.object({
  updatedAt: z.string().nullable(),
  updatedBy: z.string(),
  tasks: z.array(z.unknown()).optional(),
  milestones: z.array(milestoneSchema).optional().default([]),
  currentTask: z.string().nullable().optional().default(null),
}).passthrough().transform(raw => {
  const milestones = raw.milestones || [];
  let tasks = raw.tasks as unknown[];

  // If no top-level tasks, extract from inline milestone tasks
  if (!tasks || tasks.length === 0) {
    const extracted: unknown[] = [];
    for (const ms of milestones) {
      for (const t of ms.tasks) {
        if (typeof t === "object" && t !== null) {
          extracted.push({ ...(t as Record<string, unknown>), milestone: ms.id });
        }
      }
    }
    tasks = extracted;
  }

  // Parse each task through the permissive schema
  type TaskItem = z.infer<typeof taskItemSchema>;
  const parsedTasks: TaskItem[] = tasks.map(t => {
    const result = taskItemSchema.safeParse(t);
    return result.success ? result.data : t as TaskItem;
  });

  // Normalize milestone.tasks to string IDs
  const normalizedMilestones = milestones.map(ms => ({
    ...ms,
    tasks: ms.tasks.map(t =>
      typeof t === "string" ? t : (t as Record<string, unknown>).id as string ?? ""
    ),
  }));

  return {
    updatedAt: raw.updatedAt,
    updatedBy: raw.updatedBy,
    tasks: parsedTasks,
    milestones: normalizedMilestones,
    currentTask: raw.currentTask,
  };
});

// --- design/state.json ---
export const designPhaseStateSchema = z.object({
  updatedAt: z.string().nullable(),
  updatedBy: z.string(),
  reviewedTasks: z.array(z.union([z.string(), z.record(z.unknown())])).optional().default([]),
  designTheme: z.union([z.string(), z.record(z.unknown())]).nullable().optional().default(null),
  colorPalette: z.union([z.string(), z.record(z.unknown())]).nullable().optional().default(null),
  typography: z.union([z.string(), z.record(z.unknown())]).nullable().optional().default(null),
  notes: z.union([z.string(), z.record(z.unknown())]).nullable().optional().default(null),
}).passthrough();

// --- coding/state.json ---
export const codingStateSchema = z.object({
  updatedAt: z.string().nullable(),
  updatedBy: z.string(),
}).passthrough();

// --- Schema lookup by phase name ---
export const phaseSchemas = {
  brainstorm: brainstormStateSchema,
  research: researchStateSchema,
  architecture: architectureStateSchema,
  tasks: tasksStateSchema,
  design: designPhaseStateSchema,
  coding: codingStateSchema,
} as const;
