# Testing Strategy

## Purpose
Define practical quality gates for Cartograph now, and the target automated coverage model for upcoming milestones.

## Inputs
- Current codebase checks and scripts
- Milestone plan and task backlog

## Outputs
- Execution-ready validation matrix for contributors and agents

## Required Sections
- Test Pyramid or Layering
- Required Test Types
- Gate Criteria
- Test Evidence Standards

## Test Pyramid or Layering
Current baseline:
- Static checks: frontend lint (`eslint`) and frontend production build (`vite build`).
- Manual integration checks: end-to-end user flow in browser + API smoke requests.

Target layering by `M4`:
- Unit tests (frontend services/export helpers).
- API integration tests (backend save/retrieve + transaction rollback).
- Smoke workflow tests (decision flow + export readiness).

## Required Test Types
- Lint/format conformance for touched files.
- Build verification for frontend bundle health.
- API behavior checks for persistence endpoints.
- Regression checks for:
  - unsafe rendering/XSS prevention.
  - destructive persistence regression.
  - export structure contract.

## Gate Criteria
### Minimum gate (current)
1. `cd frontend && npm run lint`
2. `cd frontend && npm run build`
3. Manual smoke path:
   - create idea -> generate pillars -> answer decisions -> export attempt.

### Target gate (after quality tasks)
1. Lint passes.
2. Build passes.
3. Frontend automated tests pass (`task-015`).
4. Backend integration tests pass (`task-016`).
5. CI workflow enforces all checks (`task-017`).

## Test Evidence Standards
For every completed task, log:
- Commands run.
- Pass/fail summary.
- Key artifacts or files changed.
- Any temporary gaps with follow-up task IDs.

## Update Cadence
Update whenever test tooling, command set, or gate policy changes.

## Source of Truth References
- `../02-execution/definition-of-done.md`
- `./acceptance-criteria.md`
- `../05-state/progress-log.md`