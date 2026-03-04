# Architecture Spec
<!-- Phase 3 → Phase 4 handoff artifact. Max ~80 lines. -->

## System Overview
[1-2 sentence description of the overall architecture]

## Components
| Component | Type | Responsibility | Key Technologies |
|-----------|------|---------------|-----------------|
| [name] | frontend/backend/service/config | [what it does] | [tech used] |
| [name] | frontend/backend/service/config | [what it does] | [tech used] |

## Data Flow
[Concise description of how data moves through the system, or compact Mermaid diagram]

```mermaid
graph LR
    A[Component] --> B[Component] --> C[Component]
```

## API Contracts
| Endpoint/Channel | Method | Purpose | Key Payload Fields |
|-----------------|--------|---------|-------------------|
| [path] | GET/POST/WS | [purpose] | [fields] |

## File/Data Schemas
[Brief description of key data structures and where they live]

## Dependencies Between Components
- [A] → [B]: [why this dependency exists]
- [B] → [C]: [why this dependency exists]

## Key Architectural Patterns
- [Pattern]: [where applied, why chosen]
- [Pattern]: [where applied, why chosen]

## Key Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| [what] | [choice] | [why] |

## Known Risks
| Risk | Mitigation |
|------|------------|
| [risk] | [approach] |

## What Environment Setup Needs

### Dependencies
<!-- List each with exact version: package@version -->
- [package@version] — [purpose]
- [package@version] — [purpose]

### Configuration Files
- [filename] — [purpose and key settings]
- [filename] — [purpose and key settings]

### Folder Structure
- [path/] — [what lives here]
- [path/] — [what lives here]

### Dev Tooling
- [tool] — [purpose, e.g. "ESLint for linting", "Vitest for unit tests"]
- [tool] — [purpose]
