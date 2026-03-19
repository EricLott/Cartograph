---
id: task-015
title: Add frontend automated tests for export and safe rendering paths
type: task
status: todo
priority: P1
owner: unassigned
claim_owner: unassigned
claim_status: unclaimed
claim_expires_at: null
sla_due_at: 2026-04-28T23:59:00Z
depends_on:
  - task-007
  - task-013
acceptance_criteria:
  - Automated tests run locally and cover safe rendering plus export structure behavior.
  - Tests fail when unsafe rendering or export regression is reintroduced.
last_updated: 2026-03-19
---

# Task: Add frontend automated tests for export and safe rendering paths

## Task Goal
Establish regression tests for high-risk frontend behavior.

## Parent Feature
- feature-005

## Implementation Steps
- Introduce frontend test tooling configuration if absent.
- Add tests for safe chat rendering behavior and multiline handling.
- Add tests for export structure generation helpers.

## Dependencies
- task-007
- task-013

## Acceptance Criteria
- Automated tests run locally and cover safe rendering plus export structure behavior.
- Tests fail when unsafe rendering or export regression is reintroduced.

## Evidence Plan
- Test file diffs and command output summary.
- Coverage notes for targeted behaviors.
- Progress log entry with pass and fail outcomes.

## Claim and SLA
- Claim this task before coding by setting claim_owner, claim_status, and claim_expires_at.
- Default claim window is 24 hours and must never exceed sla_due_at.
- If claim expires, set claim_status: expired, return task to 	odo, and allow re-claim.
- Any PR implementing this task must include this task file.