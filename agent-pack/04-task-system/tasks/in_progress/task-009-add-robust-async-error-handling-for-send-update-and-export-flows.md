---
id: task-009
title: Add robust async error handling for send update and export flows
type: task
status: in_progress
priority: P1
owner: Eric Lott
claim_owner: Eric Lott
claim_status: claimed
claim_expires_at: "2026-03-20T23:13:24.669Z"
sla_due_at: "2026-04-11T23:59:00Z"
depends_on:
  - task-008
acceptance_criteria:
  - "Provider, backend, and export errors are surfaced to users with clear messaging."
  - App does not get stuck in loading state after failures.
last_updated: 2026-03-19
---


# Task: Add robust async error handling for send update and export flows

## Task Goal
Prevent unhandled async failures from silently breaking user flow.

## Parent Feature
- feature-002

## Implementation Steps
- Wrap major async actions in `App.jsx` with try/catch and consistent fallback behavior.
- Expose user-visible error feedback in workspace or chat area.
- Ensure waiting flags reset correctly on failures.

## Dependencies
- task-008

## Acceptance Criteria
- Provider, backend, and export errors are surfaced to users with clear messaging.
- App does not get stuck in loading state after failures.

## Evidence Plan
- App state handling diff.
- Manual failure-path test notes with invalid key or network interruption.
- Progress log entry with failure-path outcomes.

## Claim and SLA
- Claim this task before coding by setting claim_owner, claim_status, and claim_expires_at.
- Default claim window is 24 hours and must never exceed sla_due_at.
- If claim expires, set claim_status: expired, return task to 	odo, and allow re-claim.
- Any PR implementing this task must include this task file.