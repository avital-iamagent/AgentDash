import type { z } from "zod";
import type {
  metaSchema,
  brainstormStateSchema,
  researchStateSchema,
  architectureStateSchema,
  tasksStateSchema,
  designPhaseStateSchema,
  codingStateSchema,
} from "@server/services/schema";

export type Meta = z.infer<typeof metaSchema>;
export type BrainstormState = z.infer<typeof brainstormStateSchema>;
export type ResearchState = z.infer<typeof researchStateSchema>;
export type ArchitectureState = z.infer<typeof architectureStateSchema>;
export type TasksState = z.infer<typeof tasksStateSchema>;
export type DesignPhaseState = z.infer<typeof designPhaseStateSchema>;
export type CodingState = z.infer<typeof codingStateSchema>;

export type PhaseName = "brainstorm" | "research" | "architecture" | "tasks" | "design" | "coding";
export type PhaseStatus = "locked" | "active" | "completed";

export type PhaseState =
  | BrainstormState
  | ResearchState
  | ArchitectureState
  | TasksState
  | DesignPhaseState
  | CodingState;
