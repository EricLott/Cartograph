---
id: task-002
title: Wrap recursive pillar and decision writes in database transaction
type: task
status: pull_requested
priority: P0
owner: Eric Lott
claim_owner: Eric Lott
claim_status: claimed
claim_expires_at: null
sla_due_at: "2026-04-06T23:59:00Z"
depends_on:
  - task-001
acceptance_criteria:
  - Any error during nested save leaves database in pre-request state.
  - Successful saves commit full hierarchy in one transaction.
  - Rollback path is covered by integration test plan entry.
last_updated: 2026-03-19
---


# Task: Wrap recursive pillar and decision writes in database transaction

## Task Goal
Guarantee save-state writes are all-or-nothing to protect data integrity.

## Parent Feature
- feature-001

## Implementation Steps
- Wrap project plus pillar plus decision creation in Sequelize transaction context.
- Thread transaction through recursive save helper.
- Ensure failures trigger rollback and return structured error response.

## Dependencies
- task-001

## Acceptance Criteria
- Any error during nested save leaves database in pre-request state.
- Successful saves commit full hierarchy in one transaction.
- Rollback path is covered by integration test plan entry.

## Evidence Plan
- Transaction implementation diff.
- Failure simulation notes demonstrating rollback.
- Progress log entry with rollback verification details.

## Claim and SLA
- Claim this task before coding by setting claim_owner, claim_status, and claim_expires_at.
- Default claim window is 24 hours and must never exceed sla_due_at.
- If claim expires, set claim_status: expired, return task to 	odo, and allow re-claim.
- Any PR implementing this task must include this task file.