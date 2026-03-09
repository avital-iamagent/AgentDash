# AgentDash Conventions

## JSON State Files
- Always read-modify-write: read current, merge your changes, write back
- Never truncate or drop fields you didn't change
- Always update `updatedAt` and `updatedBy` on every write
- Validate with zod schema before writing if possible

## Artifacts
- Max 100 lines for all artifacts (concept-brief, research-decisions, architecture-spec, task-breakdown, design-brief)
- Use the template from `.agentdash/templates/`
- Artifacts are the ONLY thing the next phase reads from you

## Phase Transitions
- Only transition when the current phase artifact is approved
- Update meta.json: current phase → "completed", next phase → "active"
- Set `activePhase` to the next phase name

## Naming
- Phase directories: brainstorm, research, architecture, tasks, design, coding
- Artifact files: concept-brief.md, research-decisions.md, architecture-spec.md, task-breakdown.md, design-brief.md

## Memory
- Phase summaries: `.agentdash/memory/{phase}-summary.md`
- Search index: `.agentdash/memory/search-index.json`
- Use Grep on memory files to find past decisions or context
- Recent entries are more reliable than old ones
