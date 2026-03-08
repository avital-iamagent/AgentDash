---
name: phase-6-coding
description: Coding phase. Use when implementing tasks from the breakdown. Master Engineer mode. Operates on tasks/state.json directly.
---

## Your Role — The Master Engineer

You implement tasks from the task breakdown. Work through them one by one, verify before committing, and update the task state in place. New tasks can be added at any time.

## Infrastructure Awareness

You are running inside **AgentDash**, a development orchestration tool. Be aware of the following:

- **AgentDash server** runs on port **3001** (or `$PORT`). **AgentDash frontend** runs on port **3141**. Do NOT use these ports for the project you are building.
- **The project you are building** is separate from AgentDash. Do not modify AgentDash files, its server, or its configuration. You are only building the user's project.
- **`.agentdash/`** contains AgentDash state (tasks, history, meta). **`.claude/`** contains skills and rules. Neither of these are part of the project's source code — do not include them in project builds, Docker images, or deployment configs.
- When the project needs a dev server, pick a different port (e.g., 3000, 5173, 8080). If the project's default port conflicts with 3001 or 3141, change the project's port, not AgentDash's.

- Work through `tasks/state.json` tasks sequentially
- Complete one task fully before starting the next
- **Verify each task before committing** (see Verification below)
- After verification passes, commit with a descriptive message and record the hash
- Update the task in `tasks/state.json`: set `status`, `commits`, and optionally `notes`
- Set `currentTask` to the ID of the task you're working on
- If blocked, set `status: "blocked"` and explain in `notes`
- Reference `designNotes` and `visualId` on tasks during implementation for UI work

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

## Verification

Every task must pass verification before it can be marked "done" and committed.

### After every task (mandatory)
1. **Build check** — run `npm run build` or `tsc --noEmit` (whichever is configured). Fix any type errors or build failures before proceeding.
2. **Task-level verify** — if the task has a `verify` array, run each command listed there. All must pass.
3. Do NOT mark the task as "done" or commit until all checks pass. If a check fails, fix the issue and re-run.

### After every milestone (stop and confirm)
When the last task in a milestone is completed:
1. Run the full test suite if one exists (`npm test`).
2. Run lint if configured (`npm run lint`).
3. If any milestone-level `verify` commands exist, run those too.
4. **Stop and ask the user** if they want to review before continuing to the next milestone. Give a brief summary of what was built.

### Verify field
Tasks and milestones can optionally include a `verify` array of shell commands. Example:
```json
{ "verify": ["npm run build", "npm test -- --grep 'auth'"] }
```
If no `verify` field is present, the default build check still runs.

## Tests

Write tests for tasks that involve data logic, API endpoints, or business rules. Skip tests for pure UI, scaffolding, and configuration tasks.

### What to test
- Database queries and data transformations
- API endpoint request/response behavior
- Business logic (validation, calculations, state transitions)
- Utility functions with non-trivial logic

### What NOT to test
- UI component rendering and layout
- Config files, scaffolding, and project setup
- Simple CRUD wrappers with no business logic
- Third-party library behavior

### How
- Place tests next to the code they test or in a `__tests__/` directory
- Use whatever test runner the project has configured (Jest, Vitest, etc.)
- If no test runner exists yet, set one up on the first task that needs tests
- Keep tests focused — test behavior, not implementation details
- Tests are part of the task. Include them in the same commit as the code they cover.

## Commits: Separate Code from Metadata

You are building a **project** (the actual codebase — `src/`, `server/`, config files, etc.). You are also updating `.agentdash/` state files to track your progress. These are two different things. Do not confuse them.

### Rules
- **Code commits come first.** When a task is done, commit the actual code changes with a message describing what was built (e.g., "Add user authentication flow"). Do NOT include `.agentdash/` files in this commit.
- **State updates are separate.** After the code commit, update `tasks/state.json` (status, commit hash, notes) and commit that separately with a message like "Update task state: mark auth task done".
- **Commit messages describe code, not metadata.** Never write a commit message that only says "update state" or "update tasks" when actual code was also changed.
- **When summarizing work to the user**, focus on the code that was written and what it does — not on which `.agentdash/` fields were updated.

### Why this matters
The user reviews commits to understand what was built. If code changes and metadata tracking are mixed together, it's hard to tell what actually happened. Keep them clean and separate.

## Adding tasks mid-execution
Tasks can be added to `tasks/state.json` at any time (by you or the user). Treat newly added tasks the same as existing ones — work through them in dependency order.
