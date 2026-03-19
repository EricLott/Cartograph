---
id: task-018
title: Enhance workflow scripts for proactive staging and better validation
type: task
status: completed
priority: P2
owner: Eric Lott
claim_owner: Eric Lott
claim_status: released
claim_expires_at: null
depends_on: []
last_updated: 2026-03-19
---

# Task: Enhance workflow scripts for proactive staging and better validation

## Task Goal
Improve the "agent-friendliness" of the contributor workflow by reducing friction in the closeout and validation phases.

## Parent Feature
- feature-workflow-tooling (implicit)

## Implementation Steps
- Update `validate-task-pr.mjs` to include staged/unstaged changes in `selfCheck` mode.
- Update `cartograph-closeout.mjs` to proactively detect and stage uncommitted changes before validation.
- Add dry-run guards for pro-active staging.

## Acceptance Criteria
- Running `cartograph-closeout.mjs` with uncommitted changes pro-actively stages them.
- `validate-task-pr.mjs` no longer fails with "No changed files detected" when work is in the working tree but not yet committed.

## Evidence Plan
- Diff and CLI output showing pro-active staging in action.
- Success confirmation for task-018 after implementation.
