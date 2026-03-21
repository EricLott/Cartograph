---
id: task-030
title: Fix contribution script eligibility checks for released tasks
type: task
status: completed
priority: P0
owner: architecture
claim_owner: Eric Lott
claim_status: released
claim_expires_at: null
sla_due_at: "2026-03-31T23:59:00Z"
depends_on: []
acceptance_criteria:
  - "The `cartograph-contribute.mjs` script correctly identifies tasks with `claim_status: released` as eligible."
  - "The script's error messaging includes `released` as an allowed claim status."
last_updated: 2026-03-21
---

# Task: Fix contribution script eligibility checks for released tasks

## Task Goal
Prevent the `cartograph-contribute.mjs` script from blocking work on tasks that have been released but not yet completed.

## Parent Feature
- feature-006 (Contributor Workflow Hardening)

## Implementation Steps
- Add `released` to the whitelist in `getEligibility`.
- Update error messages to reflect the new whitelist.

## Dependencies
- None

## Acceptance Criteria
- The script no longer fails when `claim_status` is `released`.

## Evidence Plan
- Successful run of `node scripts/cartograph-contribute.mjs --auto`.
