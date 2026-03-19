---
id: task-011
title: Implement shared provider request helper with timeout and retry
type: task
status: todo
priority: P1
owner: unassigned
claim_owner: unassigned
claim_status: unclaimed
claim_expires_at: null
sla_due_at: 2026-04-13T23:59:00Z
depends_on: []
acceptance_criteria:
  - All provider request paths use shared helper.
  - Transient failures retry within defined bounds and surface clear errors when exhausted.
last_updated: 2026-03-19
---

# Task: Implement shared provider request helper with timeout and retry

## Task Goal
Reduce duplication and improve resilience across provider API calls.

## Parent Feature
- feature-003

## Implementation Steps
- Create shared helper for provider fetch calls with timeout control.
- Add bounded retry policy for transient failures.
- Refactor provider-specific branches to use helper consistently.

## Dependencies
- None.

## Acceptance Criteria
- All provider request paths use shared helper.
- Transient failures retry within defined bounds and surface clear errors when exhausted.

## Evidence Plan
- Service-layer diff showing helper adoption.
- Manual test notes with simulated transient failure path.
- Progress log entry with retry behavior summary.

## Claim and SLA
- Claim this task before coding by setting claim_owner, claim_status, and claim_expires_at.
- Default claim window is 24 hours and must never exceed sla_due_at.
- If claim expires, set claim_status: expired, return task to 	odo, and allow re-claim.
- Any PR implementing this task must include this task file.