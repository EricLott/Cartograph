---
id: task-024
title: Add security guardrails and metadata to exported pack
type: task
status: pull_requested
priority: P1
owner: Eric Lott
claim_owner: Eric Lott
claim_status: claimed
claim_expires_at: "2026-03-22T04:00:18.161Z"
sla_due_at: "2026-06-05T23:59:00Z"
depends_on:
  - task-014
acceptance_criteria:
  - "Export zip does not contain sensitive data from `localStorage` or environment."
  - "Generate a `cartograph-manifest.json` in the export root with metadata (project ID, version, export time)."
  - "Include a `SECURITY.md` in the export `03-agent-ops/` folder."
last_updated: 2026-03-21
---


# Task: Add security guardrails and metadata to exported pack

## Task Goal
Ensure project safety and machine-readability of the exported blueprint.

## Parent Feature
- feature-004

## Implementation Steps
- [x] Audit `exportService.js` to ensure no dynamic memory or session state is inadvertently serialized.
- [x] Implement project manifest generation with JSON metadata.
- [x] Add `SECURITY.md` template to the export folder structure.

## Dependencies
- task-014

## Acceptance Criteria
- Export zip does not contain sensitive data from `localStorage` or environment.
- Generate a `cartograph-manifest.json` in the export root with metadata (project ID, version, export time).
- Include a `SECURITY.md` in the export `03-agent-ops/` folder.

## Evidence Plan
- Manual audit of exported zip for sensitive strings.
- Presence and valid schema of `cartograph-manifest.json` in the export.

## Claim and SLA
- Claim this task before coding by setting claim_owner, claim_status, and claim_expires_at.
- Default claim window is 24 hours and must never exceed sla_due_at.
- If claim expires, set claim_status: expired, return task to todo, and allow re-claim.
- Any PR implementing this task must include this task file.
