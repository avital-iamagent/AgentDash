import { z } from "zod";

// --- Phase status enum ---
const phaseStatusSchema = z.enum(["locked", "active", "completed"]);

// --- Per-phase metadata in meta.json ---
const phaseMetaSchema = z.object({
  status: phaseStatusSchema,
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  artifactApproved: z.boolean(),
  reviewReport: z.string().nullable(),
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
    enabled: z.boolean(),
    branch: z.string().nullable(),
    lastCommit: z.string().nullable(),
    remoteUrl: z.string().nullable(),
    authMethod: z.string().nullable(),
    gitDismissed: z.boolean(),
  }),
});

// --- brainstorm/state.json ---
const brainstormCardSchema = z.object({
  id: z.string(),
  text: z.string(),
  group: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["proposed", "accepted", "rejected"]),
  notes: z.string().optional(),
  createdBy: z.enum(["user", "claude-code"]),
  createdAt: z.string().optional(),
});

const brainstormGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional(),
});

export const brainstormStateSchema = z.object({
  updatedAt: z.string().nullable(),
  updatedBy: z.string(),
  cards: z.array(brainstormCardSchema),
  groups: z.array(brainstormGroupSchema),
  tags: z.array(z.string()),
});

// --- research/state.json ---
const researchSourceSchema = z.object({
  title: z.string(),
  url: z.string().optional(),
});

const researchItemSchema = z.object({
  id: z.string(),
  topic: z.string(),
  category: z.enum(["competitor", "tech-stack", "pattern", "risk"]),
  summary: z.string(),
  status: z.string(),
  verdict: z.enum(["adopt", "learn-from", "avoid", "needs-more-research"]),
  sources: z.array(researchSourceSchema),
  findingsFile: z.string().nullable().optional(),
});

export const researchStateSchema = z.object({
  updatedAt: z.string().nullable(),
  updatedBy: z.string(),
  items: z.array(researchItemSchema),
  categories: z.array(z.string()),
  verdicts: z.array(z.string()),
});

// --- architecture/state.json ---
const componentSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  type: z.string(),
  responsibility: z.string(),
  dependencies: z.array(z.string()).optional(),
});

const decisionSchema = z.object({
  id: z.string().optional(),
  choice: z.string(),
  rationale: z.string(),
  alternatives: z.array(z.string()).optional(),
});

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
  components: z.array(componentSchema),
  decisions: z.array(decisionSchema),
  diagrams: z.array(diagramSchema),
  risks: z.array(riskSchema),
});

// --- tasks/state.json ---
const taskItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  acceptanceCriteria: z.array(z.string()).optional(),
  estimate: z.string().optional(),
  priority: z.enum(["must", "should", "could"]),
  dependencies: z.array(z.string()).optional(),
  status: z.enum(["pending", "in-progress", "done", "blocked"]),
  milestone: z.string().optional(),
  commits: z.array(z.string()).optional(),
  notes: z.string().optional(),
  designNotes: z.string().optional(),
  visualId: z.string().optional(),
  verify: z.array(z.string()).optional(),
});

const milestoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  tasks: z.array(z.string()),
  verify: z.array(z.string()).optional(),
});

export const tasksStateSchema = z.object({
  updatedAt: z.string().nullable(),
  updatedBy: z.string(),
  tasks: z.array(taskItemSchema),
  milestones: z.array(milestoneSchema),
  currentTask: z.string().nullable(),
});

// --- design/state.json ---
export const designPhaseStateSchema = z.object({
  updatedAt: z.string().nullable(),
  updatedBy: z.string(),
  reviewedTasks: z.array(z.union([z.string(), z.record(z.unknown())])),
  designTheme: z.union([z.string(), z.record(z.unknown())]).nullable(),
  colorPalette: z.union([z.string(), z.record(z.unknown())]).nullable(),
  typography: z.union([z.string(), z.record(z.unknown())]).nullable(),
  notes: z.union([z.string(), z.record(z.unknown())]).nullable(),
}).passthrough();

// --- coding/state.json ---
export const codingStateSchema = z.object({
  updatedAt: z.string().nullable(),
  updatedBy: z.string(),
});

// --- Schema lookup by phase name ---
export const phaseSchemas = {
  brainstorm: brainstormStateSchema,
  research: researchStateSchema,
  architecture: architectureStateSchema,
  tasks: tasksStateSchema,
  design: designPhaseStateSchema,
  coding: codingStateSchema,
} as const;
