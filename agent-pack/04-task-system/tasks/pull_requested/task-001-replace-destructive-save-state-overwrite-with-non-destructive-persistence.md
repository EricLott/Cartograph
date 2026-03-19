---
id: task-001
title: Replace destructive save-state overwrite with non-destructive persistence
type: task
status: pull_requested
priority: P0
owner: Eric Lott
claim_owner: Eric Lott
claim_status: claimed
claim_expires_at: null
sla_due_at: "2026-04-05T23:59:00Z"
depends_on: []
acceptance_criteria:
  - Saving new state no longer deletes unrelated project records.
  - Endpoint response still returns success payload with valid project ID.
  - Repeated saves preserve expected latest project data without global data loss.
last_updated: 2026-03-19
---


# Task: Replace destructive save-state overwrite with non-destructive persistence

## Task Goal
Stop wiping all projects on each save by implementing a safe persistence path for the active project snapshot.

## Parent Feature
- feature-001

## Implementation Steps
- Remove global `Project.destroy({ where: {} })` behavior from `POST /api/save-state`.
- Implement project-targeted replacement strategy that only updates/rebuilds the intended snapshot.
- Return stable project identifier in API response for downstream retrieval.

## Dependencies
- None.

## Acceptance Criteria
- Saving new state no longer deletes unrelated project records.
- Endpoint response still returns success payload with valid project ID.
- Repeated saves preserve expected latest project data without global data loss.

## Evidence Plan
- Backend diff summary for persistence logic.
- Manual API smoke test with two consecutive saves and DB record verification.
- Progress log entry referencing command outputs and observed behavior.

## Claim and SLA
- Claim this task before coding by setting claim_owner, claim_status, and claim_expires_at.
- Default claim window is 24 hours and must never exceed sla_due_at.
- If claim expires, set claim_status: expired, return task to 	odo, and allow re-claim.
- Any PR implementing this task must include this task file.