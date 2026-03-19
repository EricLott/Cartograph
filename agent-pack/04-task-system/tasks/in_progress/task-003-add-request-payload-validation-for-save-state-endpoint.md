---
id: task-003
title: Add request payload validation for save-state endpoint
type: task
status: in_progress
priority: P0
owner: Eric Lott
claim_owner: Eric Lott
claim_status: claimed
claim_expires_at: "2026-03-20T18:33:12.249Z"
sla_due_at: "2026-04-06T23:59:00Z"
depends_on:
  - task-001
acceptance_criteria:
  - Invalid payloads do not trigger DB writes.
  - "Validation errors return clear response body with status code in `4xx` range."
  - Valid payloads continue to save successfully.
last_updated: 2026-03-19
---


# Task: Add request payload validation for save-state endpoint

## Task Goal
Reject malformed request payloads early and consistently.

## Parent Feature
- feature-001

## Implementation Steps
- Validate top-level payload shape containing `idea` and `pillars`.
- Validate recursive pillar and decision fields before DB writes.
- Return `4xx` responses with machine-readable error details for invalid payloads.

## Dependencies
- task-001

## Acceptance Criteria
- Invalid payloads do not trigger DB writes.
- Validation errors return clear response body with status code in `4xx` range.
- Valid payloads continue to save successfully.

## Evidence Plan
- Validation logic diff and example invalid requests.
- Curl examples for valid and invalid cases.
- Progress log entry referencing validation outcomes.

## Claim and SLA
- Claim this task before coding by setting claim_owner, claim_status, and claim_expires_at.
- Default claim window is 24 hours and must never exceed sla_due_at.
- If claim expires, set claim_status: expired, return task to 	odo, and allow re-claim.
- Any PR implementing this task must include this task file.