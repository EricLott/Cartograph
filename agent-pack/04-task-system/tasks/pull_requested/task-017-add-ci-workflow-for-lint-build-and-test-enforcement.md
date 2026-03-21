---
id: task-017
title: Add CI workflow for lint build and test enforcement
type: task
status: pull_requested
priority: P1
owner: Eric Lott
claim_owner: Eric Lott
claim_status: claimed
claim_expires_at: "2026-03-22T02:33:32.384Z"
sla_due_at: "2026-05-05T23:59:00Z"
depends_on:
  - task-015
  - task-016
acceptance_criteria:
  - PRs run required quality checks automatically.
  - Failed checks block merge readiness until resolved.
  - Contributor docs reflect CI expectations.
last_updated: 2026-03-21
---


# Task: Add CI workflow for lint build and test enforcement

## Task Goal
Enforce contribution quality and prevent regressions on pull requests.

## Parent Feature
- feature-006

## Implementation Steps
- Add CI workflow file to run frontend lint and build plus automated tests.
- Ensure workflow fails on unmet checks and reports clear diagnostics.
- Include task traceability check in contribution guidance or workflow docs.

## Dependencies
- task-015
- task-016

## Acceptance Criteria
- PRs run required quality checks automatically.
- Failed checks block merge readiness until resolved.
- Contributor docs reflect CI expectations.

## Evidence Plan
- CI workflow diff and sample run summary.
- README and AGENTS and task docs alignment notes.
- Progress log entry confirming gate coverage.

## Claim and SLA
- Claim this task before coding by setting claim_owner, claim_status, and claim_expires_at.
- Default claim window is 24 hours and must never exceed sla_due_at.
- If claim expires, set claim_status: expired, return task to 	odo, and allow re-claim.
- Any PR implementing this task must include this task file.