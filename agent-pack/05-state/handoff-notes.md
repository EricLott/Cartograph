---
doc_type: state_log
schema_version: 1
last_updated: 2026-03-19
---

# Handoff Notes

## Purpose
Provide concise state transfer notes between agents or operators.

## Inputs
- Current task status
- Active blockers and pending decisions

## Outputs
- Fast onboarding context for the next execution cycle

## Required Sections
- Handoff Entry Schema
- Current Snapshot
- Next Actions
- Risks to Watch

## Handoff Entry Schema
```yaml
handoff_id: handoff-001
timestamp: 2026-03-19T10:00:00-05:00
summary: What was completed in this cycle.
active_tasks:
  - task-001
blockers:
  - blkr-001
next_actions:
  - Start task-002 after blocker resolution.
```

## Current Snapshot
- No execution handoff recorded yet.

## Next Actions
- Begin task authoring phase in `../04-task-system/tasks/`.

## Risks to Watch
- Ensure future tasks maintain atomicity and dependency integrity.

## Update Cadence
Update at end of each working session or before ownership transfer.

## Source of Truth References
- `./progress-log.md`
- `./blockers.md`
- `../03-agent-ops/AGENTS.md`