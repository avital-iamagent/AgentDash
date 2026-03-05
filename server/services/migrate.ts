import fs from "fs/promises";
import path from "path";
import { INITIAL_STATES } from "../routes/project.js";

export const LATEST_VERSION = 2;

interface Migration {
  version: number;
  name: string;
  migrate: (projectDir: string, meta: Record<string, any>) => Promise<Record<string, any>>;
}

const DEFAULT_PHASE_META = {
  status: "locked",
  startedAt: null,
  completedAt: null,
  artifactApproved: false,
  reviewReport: null,
};

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "add-design-coding-phases",
    migrate: async (projectDir, meta) => {
      const agentdashDir = path.join(projectDir, ".agentdash");

      // Add design phase if missing
      if (!meta.phases.design) {
        meta.phases.design = { ...DEFAULT_PHASE_META };
      }

      // Add coding phase if missing
      if (!meta.phases.coding) {
        meta.phases.coding = { ...DEFAULT_PHASE_META };
      }

      // Create directories and state files for design and coding if missing
      for (const phase of ["design", "coding"] as const) {
        const phaseDir = path.join(agentdashDir, phase);
        await fs.mkdir(phaseDir, { recursive: true });

        const statePath = path.join(phaseDir, "state.json");
        try {
          await fs.access(statePath);
        } catch {
          const initial = INITIAL_STATES[phase];
          if (initial) {
            await fs.writeFile(statePath, JSON.stringify(initial, null, 2));
          }
        }
      }

      // Backfill gitDismissed if missing
      if (meta.git && meta.git.gitDismissed === undefined) {
        meta.git.gitDismissed = false;
      }

      return meta;
    },
  },
  {
    version: 2,
    name: "add-memory-directory",
    migrate: async (projectDir, meta) => {
      const memoryDir = path.join(projectDir, ".agentdash", "memory");
      await fs.mkdir(memoryDir, { recursive: true });
      return meta;
    },
  },
];

/**
 * Run pending migrations on a project's meta.json.
 * Returns the (possibly updated) meta object.
 */
export async function runMigrations(projectDir: string): Promise<Record<string, any>> {
  const metaPath = path.join(projectDir, ".agentdash", "meta.json");
  const raw = await fs.readFile(metaPath, "utf-8");
  let meta = JSON.parse(raw);

  const currentVersion: number = meta.schemaVersion ?? 0;
  if (currentVersion >= LATEST_VERSION) {
    return meta;
  }

  const pending = MIGRATIONS.filter((m) => m.version > currentVersion);
  for (const migration of pending) {
    console.log(`[AgentDash] Running migration v${migration.version}: ${migration.name}`);
    meta = await migration.migrate(projectDir, meta);
  }

  meta.schemaVersion = LATEST_VERSION;
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
  console.log(`[AgentDash] Migrated project from v${currentVersion} to v${LATEST_VERSION}`);

  return meta;
}
