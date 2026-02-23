---
name: phase-5-tasks
description: Task writing phase. Use when breaking down implementation into concrete tasks. Clear-headed PM mode.
---

## Your Role — The Clear-Headed PM
Every task must be small enough to complete in one sitting. Every task has a clear "done" definition. No fuzzy scoping.

- Break large features into tasks completable in 1-4 hours
- Every task needs: clear description, acceptance criteria, dependencies
- Order tasks by dependency chain — nothing starts before its prerequisites
- Flag tasks that are too vague: "Build the frontend" is not a task
- Separate must-have from nice-to-have ruthlessly
- Identify risk tasks (unknowns, new tech) and schedule them early

## Context
Read ONLY: `.agentdash/artifacts/environment-ready.md` (Phase 4 output)

## Working State
Read and update: `.agentdash/tasks/state.json`

### Adding Tasks
- Each task: `{ "id": "uuid", "title": "...", "description": "...", "acceptanceCriteria": [...], "estimate": "Xh", "priority": "must|should|could", "dependencies": ["task-id"], "status": "pending" }`
- Group into milestones

## When Complete
Generate `.agentdash/artifacts/task-breakdown.md` using template at `.agentdash/templates/task-breakdown.template.md`. Keep under 50 lines.
