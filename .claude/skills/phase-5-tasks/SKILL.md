---
name: phase-5-tasks
description: Task planning and execution phase. Use when breaking down implementation into tasks, or when implementing those tasks. Clear-headed PM + Master Engineer mode.
---

## Your Role — Planning and Execution

This phase has two modes. You move between them naturally based on context.

---

## Mode 1: Planning (breaking down work)

The Clear-Headed PM. Every task must be small enough to complete in one sitting with a clear "done" definition.

- Break features into tasks completable in 1-4 hours
- Every task needs: description, acceptance criteria, dependencies
- Order tasks by dependency chain
- Separate must-have from nice-to-have ruthlessly
- Identify risk tasks (unknowns, new tech) and schedule them early
- Tasks can be added at any time, including mid-execution

### Context
Read ONLY: `.agentdash/artifacts/environment-ready.md` (Phase 4 output)

### How to Begin
1. Read environment-ready.md and verify the "Ready for Implementation" checklist is fully complete (all items done, no unresolved blockers). If anything is incomplete, pause and escalate to user before planning tasks.
2. Cross-reference two sources to build your task list:
   - **Architecture-spec components** (via environment-ready's "Repository > Structure") — ensure every component has implementation tasks
   - **Concept-brief core features** (carried through the artifact chain) — ensure every feature is covered by at least one task
3. Flag any feature or component that has no corresponding task — it's a coverage gap
4. Order tasks by dependency chain: foundational components first, then features that build on them

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
Generate `.agentdash/artifacts/task-breakdown.md` using template at `.agentdash/templates/task-breakdown.template.md`. Keep under 50 lines.

---

## Mode 2: Execution (implementing tasks)

The Master Engineer. Read the task list and work through tasks one by one. No task is done until its acceptance criteria pass.

- Work through tasks sequentially — complete one before starting the next
- After completing each task, commit with a descriptive message
- Update `tasks/state.json` after every task: set `status`, record `commits` (array of hashes), add `notes` if relevant
- Set `currentTask` to the ID of the task currently being worked on
- If blocked, set status to `"blocked"` and record why in `notes`
- New tasks can be added to the list at any time (user or Claude can add them)

### Execution state fields (per task)
```json
{
  "status": "pending | in-progress | done | blocked",
  "commits": ["abc1234"],
  "notes": "optional implementation notes or blocker description"
}
```

### Visual Generation (fire-and-forget)
When you complete a UI-related task, auto-generate a reference mockup by writing a request file:

**Path:** `.agentdash/tasks/visuals/queue/{uuid}.json`

```json
{
  "id": "uuid",
  "userPrompt": "A dark-themed sidebar with navigation icons and an active state highlight",
  "taskId": "the-task-id",
  "requestedAt": "ISO-8601"
}
```

- The server picks up the file automatically and generates the image in the background
- Do NOT wait for the result — continue to the next task immediately
- Describe visual appearance (colors, layout, typography), not code or implementation details
- Only generate visuals for tasks that produce visible UI — skip backend-only or config tasks

### Working State
Read and update: `.agentdash/tasks/state.json`
