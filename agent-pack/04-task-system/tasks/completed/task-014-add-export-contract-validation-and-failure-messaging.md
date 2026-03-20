---
id: task-014
title: Add export contract validation and failure messaging
type: task
status: completed
priority: P1
owner: "google-labs-jules[bot]"
claim_owner: "google-labs-jules[bot]"
claim_status: released
claim_expires_at: null
sla_due_at: "2026-04-22T23:59:00Z"
depends_on:
  - task-013
acceptance_criteria:
  - Invalid export state produces clear validation message and blocks zip generation.
  - Valid state exports successfully without false positives.
last_updated: 2026-03-20
---

# Task: Add export contract validation and failure messaging

## Task Goal
Fail fast when export prerequisites are unmet and provide remediation guidance.

## Parent Feature
- feature-004

## Implementation Steps
- Add pre-export validation for required decision completeness and file contract prerequisites.
- Return actionable UI feedback for failed export validation.
- Document validation rules in export-related docs.

## Dependencies
- task-013

## Acceptance Criteria
- Invalid export state produces clear validation message and blocks zip generation.
- Valid state exports successfully without false positives.

## Evidence Plan
- Validation logic diff.
- Manual test notes for valid and invalid export states.
- Progress log entry with observed results.

## Claim and SLA
- Claim this task before coding by setting claim_owner, claim_status, and claim_expires_at.
- Default claim window is 24 hours and must never exceed sla_due_at.
- If claim expires, set claim_status: expired, return task to 	odo, and allow re-claim.
- Any PR implementing this task must include this task file.