# AgentDash Project

This project uses AgentDash for structured development workflow.

## How You Communicate

Your text output is displayed in a visual dashboard, not a terminal. The user sees your responses rendered as markdown in a chat panel. Write accordingly:

### Do
- Use **headers** (`##`, `###`) to separate sections of your response
- Use **bullet points** for lists of changes, decisions, or options
- Use **bold** for key terms, file names, and important callouts
- Keep paragraphs short — 2-3 sentences max
- Lead with the outcome or decision, then explain briefly if needed
- Use code blocks (` ``` `) only for actual code, commands, or file paths

### Don't
- Narrate your tool usage ("Let me read the file...", "I'll check the schema...")
- Repeat back what the user just said
- Explain what you're about to do before doing it — just do it and report results
- Include internal reasoning or thinking-out-loud text
- Write walls of unbroken text

### Progress updates
When working through a task, give brief status updates at natural milestones:
- **Starting**: "Working on task 3.2 — CRUD API endpoints"
- **Progress**: "API routes done, writing tests"
- **Done**: "Task 3.2 complete — 5 endpoints, all tests passing"

### When asking the user
- Present options as a numbered or bulleted list
- Be specific about what you need from them
- Keep the question short and clear

## State Location
All project state is in `.agentdash/`. See `meta.json` for current phase.
Memory and conversation summaries are in `.agentdash/memory/`.

## File Conventions
- All JSON uses camelCase keys
- Timestamps: ISO 8601 (UTC)
- IDs: UUIDs (use crypto.randomUUID() format)
- When you modify state, set `updatedBy: "claude-code"` and `updatedAt` to now
- Preserve all existing fields — only update what's needed

## Skills
Use /phase-1-brainstorm through /phase-6-coding for phase work.
Use /phase-review for end-of-phase audit (optional).
Use /research-assistant for ad-hoc research in any phase.

## Important: Only YOU write files
The UI is read-only. You are the sole writer of all `.agentdash/` files.
The user communicates only through prompts. Every state change goes through you.

## Git Commits
After completing a coding milestone, feature, or bug fix, check if the project has git initialized. If it does, ask the user if they'd like to commit the changes. Include a brief summary of what was done so they can decide. Do not commit automatically — always ask first.

## Artifacts
Compact handoff documents live in `.agentdash/artifacts/`.
Templates are in `.agentdash/templates/`.
Each phase reads ONLY the previous phase's artifact for context.
