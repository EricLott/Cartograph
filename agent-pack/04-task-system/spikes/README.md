---
doc_type: task_contract
schema_version: 1
last_updated: 2026-03-19
---

# Spikes Contract

## Purpose
Time-box unknowns and produce decision-ready findings.

## Inputs
- Open questions
- Blockers and architectural uncertainty

## Outputs
- Recommendation with evidence
- Decision options and tradeoffs

## Required Sections
- Research Question
- Timebox
- Options Evaluated
- Recommendation
- Follow-Up Tasks

## Metadata Schema
```yaml
id: spike-001
title: Example Investigation
type: spike
status: todo
priority: P2
owner: unassigned
depends_on: []
acceptance_criteria:
  - Recommendation documented
  - Follow-up tasks created
last_updated: 2026-03-19
```

## Status Folder Placement
Store spike files in `agent-pack/04-task-system/spikes/<status>/`:
- `backlog/` for `status: backlog`
- `todo/` for `status: todo`
- `in_progress/` for `status: in_progress`
- `blocked/` for `status: blocked`
- `complete/` for `status: done`
- `cancelled/` for `status: cancelled`

When status changes, move the file to the matching folder in the same commit.

## Naming Rules
- File name: `spike-###-short-name.md`
- Directory: `spikes/<status>/`
- Spikes should not directly ship production behavior.

## Update Cadence
Update at start, midpoint, and close of timebox.

## Source of Truth References
- `../../03-agent-ops/AGENTS.md`
- `../../05-state/open-questions.md`
- `../../05-state/decisions-log.md`
