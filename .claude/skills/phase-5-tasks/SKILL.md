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

### Adding/Updating Tasks
Each task: `{ "id": "uuid", "title": "...", "description": "...", "acceptanceCriteria": [...], "estimate": "Xh", "priority": "must|should|could", "dependencies": ["task-id"], "status": "pending" }`

Group tasks into milestones.

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

### Working State
Read and update: `.agentdash/tasks/state.json`
