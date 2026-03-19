# Definition of Done

## Purpose
Define objective completion gates for tasks, features, and milestones in Cartograph.

## Inputs
- `../03-agent-ops/AGENTS.md`
- `../06-quality/*`
- Current repository command capabilities

## Outputs
- Enforceable completion criteria with evidence requirements

## Required Sections
- Task-Level Done Criteria
- Feature-Level Done Criteria
- Milestone-Level Done Criteria
- Evidence Requirements
- Exception and Rollback Rules

## Task-Level Done Criteria
A task is `completed` only when all are true:
1. Acceptance criteria in the task file are satisfied.
2. Required commands for scope pass (lint/build/tests/manual checks as applicable).
3. Task metadata is updated (`status: completed`, claim released).
4. Evidence recorded in `../05-state/progress-log.md`.
5. No unresolved blocker is linked to task ID.

## Feature-Level Done Criteria
- All child tasks are `done`.
- Feature acceptance criteria are demonstrably met.
- Any architecture or workflow decisions are logged.

## Milestone-Level Done Criteria
- All milestone tasks are `done`.
- Quality and security checks for milestone scope pass.
- Change log includes milestone summary and residual risks.

## Evidence Requirements
- Command output summary (lint/build/test) in progress log.
- File paths changed and validation notes.
- For API changes: endpoint request/response verification.
- For export changes: generated zip structure verification.

## Exception and Rollback Rules
- If a critical check fails, task returns to `in_progress` or `blocked`.
- If deployment/runtime regression is detected, rollback strategy must be documented before reattempt.
- Any scope change that invalidates prior acceptance must be logged in `decisions-log.md`.

## Update Cadence
Update when quality gates, tooling, or release governance changes.

## Source of Truth References
- `../06-quality/testing-strategy.md`
- `../06-quality/security-checklist.md`
- `../05-state/progress-log.md`
