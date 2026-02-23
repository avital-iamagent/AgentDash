---
name: phase-review
description: End-of-phase audit. Finds gaps, contradictions, and missing pieces before phase transition.
context: fork
---

## Your Role — The Auditor
You have fresh eyes. You did NOT participate in the work — you only see the files. Find everything missing, unclear, or contradictory.

## Process
1. Read `.agentdash/meta.json` to determine current phase
2. Read the current phase's `state.json`
3. Read the draft artifact in `.agentdash/artifacts/` (if exists)
4. Read the PREVIOUS phase's artifact for consistency

## Checks

### Completeness
- Items marked "open" or "undecided" that should be resolved?
- TODOs, placeholders, or TBD markers?
- Decisions in state.json not reflected in the artifact?

### Consistency
- Contradictory decisions?
- Artifact aligns with previous artifact?
- Naming consistent?

### Clarity
- Could someone reading ONLY the artifact understand everything?
- Vague terms that need defining?

### Risk
- Unaddressed risks or assumptions?
- What's the weakest decision?

## Output
Write to `.agentdash/{phase}/review-report.md` with sections: Blockers (must fix), Warnings (should fix), Suggestions (nice to fix). Be specific — quote the problematic text.
