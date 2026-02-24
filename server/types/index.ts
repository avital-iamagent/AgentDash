export interface RecentProject {
  dir: string;
  name: string;
  lastOpened: string;
}

export interface RecentProjectsFile {
  projects: RecentProject[];
}

export const PHASE_NAMES = ["brainstorm", "research", "architecture", "environment", "tasks"] as const;
export type PhaseName = (typeof PHASE_NAMES)[number];

export function isValidPhase(name: string): name is PhaseName {
  return PHASE_NAMES.includes(name as PhaseName);
}
