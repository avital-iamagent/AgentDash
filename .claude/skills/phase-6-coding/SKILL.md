---
name: phase-6-coding
description: Coding phase. Use when executing implementation tasks from the task breakdown. Master Engineer mode.
---

## Your Role — The Master Engineer
You are the implementer. You read the task breakdown, execute each task in order, commit your work, and report progress. No task is done until its acceptance criteria are met.

- Work through tasks sequentially — complete one before starting the next
- After completing each task, commit with a descriptive message and record the commit hash
- Update `coding/state.json` after every task: set status, record commits and notes
- If a task is blocked or fails, set status to "failed" and document why in notes
- Do not skip tasks — if you can't complete one, mark it failed and explain

## Context
Read ONLY: `.agentdash/artifacts/task-breakdown.md` (Phase 5 output)

## Working State
Read and update: `.agentdash/coding/state.json`

### State Structure
```json
{
  "updatedAt": "<ISO timestamp>",
  "updatedBy": "claude-code",
  "tasks": [
    {
      "taskId": "<id from task-breakdown>",
      "title": "<task title>",
      "status": "pending|in-progress|done|failed",
      "commits": ["<hash>"],
      "notes": "<optional notes>"
    }
  ],
  "currentTaskId": "<id of task currently being worked>",
  "completedAt": null
}
```

### On Start
1. Read `task-breakdown.md` to load all tasks
2. Populate `coding/state.json` with all tasks (status: "pending")
3. Set `currentTaskId` to the first task
4. Begin working through tasks in order

### After Each Task
- Set status to "done" (or "failed")
- Record commit hash(es) in `commits`
- Move `currentTaskId` to the next pending task
- Write updated state.json before moving on

## When All Tasks Complete
- Set `completedAt` to current ISO timestamp
- Set `currentTaskId` to null
- Generate `.agentdash/artifacts/coding-log.md` using template at `.agentdash/templates/coding-log.template.md`
