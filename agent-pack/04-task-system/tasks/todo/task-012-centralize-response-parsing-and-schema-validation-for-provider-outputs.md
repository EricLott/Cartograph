---
id: task-012
title: Centralize response parsing and schema validation for provider outputs
type: task
status: todo
priority: P1
owner: unassigned
claim_owner: unassigned
claim_status: unclaimed
claim_expires_at: null
sla_due_at: 2026-04-14T23:59:00Z
depends_on:
  - task-011
acceptance_criteria:
  - Malformed provider payloads fail with explicit user-visible errors.
  - Lint issues in touched agent-service paths are resolved.
last_updated: 2026-03-19
---

# Task: Centralize response parsing and schema validation for provider outputs

## Task Goal
Make model-output parsing deterministic and failure modes actionable.

## Parent Feature
- feature-003

## Implementation Steps
- Add response-shape guards for expected JSON array and object structures.
- Standardize parse error messages returned to UI.
- Remove dead or unused branches and cleanup lint issues in `agentService.js`.

## Dependencies
- task-011

## Acceptance Criteria
- Malformed provider payloads fail with explicit user-visible errors.
- Lint issues in touched agent-service paths are resolved.

## Evidence Plan
- Parser and validation diff.
- Sample malformed payload handling notes.
- Progress log entry with lint and behavior verification.

## Claim and SLA
- Claim this task before coding by setting claim_owner, claim_status, and claim_expires_at.
- Default claim window is 24 hours and must never exceed sla_due_at.
- If claim expires, set claim_status: expired, return task to 	odo, and allow re-claim.
- Any PR implementing this task must include this task file.