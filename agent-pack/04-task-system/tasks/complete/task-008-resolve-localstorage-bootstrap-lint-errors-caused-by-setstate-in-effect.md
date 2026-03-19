---
id: task-008
title: Resolve localStorage bootstrap lint errors caused by setState in effect
type: task
status: done
priority: P0
owner: codex
claim_owner: unassigned
claim_status: released
claim_expires_at: null
sla_due_at: "2026-04-07T23:59:00Z"
depends_on: []
acceptance_criteria:
  - Lint errors for setState-in-effect are removed.
  - Settings still load saved keys and provider correctly.
last_updated: 2026-03-19
---


# Task: Resolve localStorage bootstrap lint errors caused by setState in effect

## Task Goal
Refactor initial config loading to satisfy React lint rules and reduce cascading render risk.

## Parent Feature
- feature-002

## Implementation Steps
- Refactor `App.jsx` llmConfig initialization to avoid synchronous setState inside effect.
- Refactor `SettingsModal.jsx` initialization similarly.
- Verify lint no longer reports `react-hooks/set-state-in-effect` for these files.

## Dependencies
- None.

## Acceptance Criteria
- Lint errors for setState-in-effect are removed.
- Settings still load saved keys and provider correctly.

## Evidence Plan
- Code diff for initialization refactor.
- `npm run lint` output snippet showing resolved errors.
- Progress log entry with validation summary.

## Claim and SLA
- Claim this task before coding by setting claim_owner, claim_status, and claim_expires_at.
- Default claim window is 24 hours and must never exceed sla_due_at.
- If claim expires, set claim_status: expired, return task to 	odo, and allow re-claim.
- Any PR implementing this task must include this task file.
