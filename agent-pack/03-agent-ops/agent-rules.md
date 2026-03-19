# Agent Rules

## Purpose
Define day-to-day behavioral rules for autonomous execution consistent with `AGENTS.md`.

## Inputs
- `./AGENTS.md`
- Active task metadata and quality gates

## Outputs
- Predictable execution behavior and logging discipline

## Required Sections
- Core Execution Rules
- Safe Assumption Rules
- Blocker Handling Rules
- Completion Rules

## Core Execution Rules
- Work one atomic task at a time unless explicitly marked parallel-safe.
- Respect dependency order from `../02-execution/dependency-map.md`.
- Keep changes aligned to active task acceptance criteria.

## Safe Assumption Rules
- Use conservative assumptions only for non-critical ambiguity.
- Log assumptions immediately in `../00-context/assumptions.md`.

## Blocker Handling Rules
- If a mandatory stop condition is hit, stop implementation immediately.
- Log blocker and open question before switching tasks.

## Completion Rules
- Evidence must exist in progress log before marking `done`.
- Missing validation means task remains `in_progress` or `blocked`.

## Update Cadence
Update when operational behavior or risk policy changes.

## Source of Truth References
- `./AGENTS.md`
- `./escalation-rules.md`
- `../05-state/progress-log.md`