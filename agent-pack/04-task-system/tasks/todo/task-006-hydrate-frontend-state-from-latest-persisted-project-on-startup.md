---
id: task-006
title: Hydrate frontend state from latest persisted project on startup
type: task
status: todo
priority: P0
owner: unassigned
claim_owner: unassigned
claim_status: unclaimed
claim_expires_at: null
sla_due_at: 2026-04-10T23:59:00Z
depends_on:
  - task-004
acceptance_criteria:
  - Reloading app restores latest project when available.
  - No-data scenario shows clean initial state without errors.
  - Failure to fetch does not break normal app usage.
last_updated: 2026-03-19
---

# Task: Hydrate frontend state from latest persisted project on startup

## Task Goal
Restore project context automatically so users and agents can continue prior sessions.

## Parent Feature
- feature-001

## Implementation Steps
- Add startup fetch to request latest project from backend.
- Map API payload into existing pillars and initial idea/message state.
- Handle empty-project and fetch-failure cases gracefully.

## Dependencies
- task-004

## Acceptance Criteria
- Reloading app restores latest project when available.
- No-data scenario shows clean initial state without errors.
- Failure to fetch does not break normal app usage.

## Evidence Plan
- Frontend hydration diff.
- Manual restart and reload validation notes.
- Progress log entry with before and after behavior.

## Claim and SLA
- Claim this task before coding by setting claim_owner, claim_status, and claim_expires_at.
- Default claim window is 24 hours and must never exceed sla_due_at.
- If claim expires, set claim_status: expired, return task to 	odo, and allow re-claim.
- Any PR implementing this task must include this task file.