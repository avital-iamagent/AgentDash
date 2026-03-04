# AgentDash Conventions

## JSON State Files
- Always read-modify-write: read current, merge your changes, write back
- Never truncate or drop fields you didn't change
- Always update `updatedAt` and `updatedBy` on every write
- Validate with zod schema before writing if possible

## Artifacts
- Max 50 lines for concept-brief, 45 for research-decisions
- Max 80 lines for architecture-spec, 40 for environment-ready
- Max 50 lines for task-breakdown
- Use the template from `.agentdash/templates/`
- Artifacts are the ONLY thing the next phase reads from you

## Phase Transitions
- Only transition when the current phase artifact is approved
- Update meta.json: current phase → "completed", next phase → "active"
- Set `activePhase` to the next phase name

## Naming
- Phase directories: brainstorm, research, architecture, environment, tasks
- Artifact files: concept-brief.md, research-decisions.md, architecture-spec.md, environment-ready.md, task-breakdown.md
