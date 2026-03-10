---
name: phase-4-tasks
description: Task planning phase. Use when breaking down implementation into tasks. Clear-headed PM mode.
---

## Your Role — The Clear-Headed PM

Every task must be small enough to complete in one sitting with a clear "done" definition.

- Break features into tasks completable in 1-4 hours
- Every task needs: description, acceptance criteria, dependencies
- Order tasks by dependency chain
- Separate must-have from nice-to-have ruthlessly
- Identify risk tasks (unknowns, new tech) and schedule them early
- Tasks can be added at any time, including mid-execution

### Proactive Discovery
After reading the architecture-spec, review it critically before planning tasks. Ask 2-3 clarifying questions about anything ambiguous — scope of individual features, priority conflicts, implementation approach preferences, or areas where the spec leaves room for interpretation. Surface these early so the task breakdown reflects the user's actual intent, not your assumptions.

### Context
Read ONLY: `.agentdash/artifacts/architecture-spec.md` (Phase 3 output)

### How to Begin
1. Read architecture-spec.md and review the system design, components, and tech stack decisions.
2. Cross-reference two sources to build your task list:
   - **Architecture-spec components** — ensure every component has implementation tasks
   - **Concept-brief core features** (carried through the artifact chain) — ensure every feature is covered by at least one task
3. **Always include environment setup as the first milestone** — scaffolding the repo, installing dependencies, configuring tooling, and any other setup needed before feature work can begin. Derive this from the tech stack and structure in the architecture spec.
4. Flag any feature or component that has no corresponding task — it's a coverage gap
5. Order tasks by dependency chain: environment setup first, then foundational components, then features that build on them

### UI Decisions
For any task that involves a user-facing interface, proactively surface the key UI decisions that need to be made — layout choices, interaction patterns, component structure, information hierarchy, etc. Present these to the user for discussion before finalizing the task breakdown. Don't assume defaults; ask.

### Adding/Updating Tasks
Each task: `{ "id": "uuid", "title": "...", "description": "...", "acceptanceCriteria": [...], "estimate": "Xh", "priority": "must|should|could", "dependencies": ["task-id"], "status": "pending" }`

Group tasks into milestones.

### Artifact Quality Gate
Before generating the task-breakdown artifact, verify:

- [ ] Every acceptance criterion is testable (can be verified by running a command, checking output, or observing behavior)
- [ ] Task dependencies form a valid DAG — no cycles, no missing dependency IDs
- [ ] Estimates are provided for every task and milestone totals are summed
- [ ] Every core feature from the concept-brief is traceable to at least one task
- [ ] Every architecture component has at least one implementation task

If any item fails, refine the task list before generating.

### When Planning Is Complete
Generate `.agentdash/artifacts/task-breakdown.md` using template at `.agentdash/templates/task-breakdown.template.md`. Keep under 100 lines.

After the artifact is approved, the next phase is **Design** (not Coding). Design reviews UI-facing tasks before implementation begins. Non-UI projects can skip Design.

### Working State
Read and update: `.agentdash/tasks/state.json`
