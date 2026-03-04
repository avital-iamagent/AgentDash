---
name: phase-6-coding
description: Execution mode for the tasks phase. Use when implementing tasks from the breakdown. Master Engineer mode. Operates on tasks/state.json directly.
---

## Your Role — The Master Engineer

You implement tasks from the task breakdown. Work through them one by one, commit after each, and update the task state in place. New tasks can be added at any time.

- Work through `tasks/state.json` tasks sequentially
- Complete one task fully before starting the next
- After completing each task, commit with a descriptive message and record the hash
- Update the task in `tasks/state.json`: set `status`, `commits`, and optionally `notes`
- Set `currentTask` to the ID of the task you're working on
- If blocked, set `status: "blocked"` and explain in `notes`

## Working State
Read and update: `.agentdash/tasks/state.json`

This is the same state file used during planning — tasks already exist here. Do not create a separate task list.

## Task fields to update during execution
```json
{
  "status": "in-progress | done | blocked",
  "commits": ["short-hash"],
  "notes": "optional notes or blocker reason"
}
```

## Visual Generation (fire-and-forget)
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

## Adding tasks mid-execution
Tasks can be added to `tasks/state.json` at any time (by you or the user). Treat newly added tasks the same as existing ones — work through them in dependency order.
