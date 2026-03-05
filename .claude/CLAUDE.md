# AgentDash Project

This project uses AgentDash for structured development workflow.

## State Location
All project state is in `.agentdash/`. See `meta.json` for current phase.

## File Conventions
- All JSON uses camelCase keys
- Timestamps: ISO 8601 (UTC)
- IDs: UUIDs (use crypto.randomUUID() format)
- When you modify state, set `updatedBy: "claude-code"` and `updatedAt` to now
- Preserve all existing fields — only update what's needed

## Skills
Use /phase-1-brainstorm through /phase-7-coding for phase work.
Use /phase-review for end-of-phase audit (optional).
Use /research-assistant for ad-hoc research in any phase.

## Important: Only YOU write files
The UI is read-only. You are the sole writer of all `.agentdash/` files.
The user communicates only through prompts. Every state change goes through you.

## Artifacts
Compact handoff documents live in `.agentdash/artifacts/`.
Templates are in `.agentdash/templates/`.
Each phase reads ONLY the previous phase's artifact for context.
