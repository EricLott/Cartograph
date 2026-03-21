# Mistakes Framework

## Purpose
Capture meaningful agent mistakes so future contributors can avoid repeating them.

This framework is blameless. The goal is faster learning, safer execution, and better defaults.

## When To Log A Mistake
Create an entry when an agent action causes or nearly causes:
- Requirement miss against source-of-truth docs.
- Broken behavior, regression, or incorrect output.
- Task-system contract violation (status, claim, dependency, or PR boundary).
- Skipped or incomplete validation that should have blocked merge.
- Missed escalation for critical-risk ambiguity.

## Workflow
1. Stabilize the situation and prevent further impact.
2. Add a mistake entry in this file.
3. Add at least one prevention action (doc, script check, template, or checklist update).
4. Link the relevant task ID or create one if remediation is needed.
5. Confirm the prevention action with evidence in `../05-state/progress-log.md`.

## Entry Template
Copy this block for each new entry.

```md
### M-YYYYMMDD-##
- Date:
- Agent/session:
- Task ID:
- Summary:
- Impact:
- Detection:
- Root cause:
- Prevention action:
- Owner:
- Status: open | mitigated | verified
- Verification evidence:
```
## Mistake Log

### M-20260320-01
- Date: 2026-03-20
- Agent/session: Antigravity / 56d03d57-167c-4cef-9c97-9b2e76b3ac65
- Task ID: task-021 / task-024
- Summary: Local `main` branch not synchronized with `origin/main` before starting a new task, leading to "shadow diffs" from previously merged tasks appearing as new changes in a subsequent task.
- Impact: Validation failed due to strict mode violations (files changed outside of task scope), stalling the autonomous cycle.
- Detection: `validate-task-pr.mjs` failed with `Strict mode violation: other backlog item files changed` and `PR spans multiple primary items`.
- Root cause: Agent failed to hard-sync local `main` before claiming/implementing a task, leading to an incorrect base for diff calculation. Local artifacts also blocked branch switching.
- Prevention action: Update `cartograph-loop.mjs` and `AGENTS.md` to mandate a hard-sync of local `main` to `origin/main` before starting any new work item.
- Owner: Eric Lott
- Status: mitigated
- Verification evidence: Successful closeout and PR creation for task-021 after manual `git reset --hard origin/main`.

### M-20260321-02
- Date: 2026-03-21
- Agent/session: Antigravity / ed4f758c-f6d6-410b-9bcf-d3ed0c9eb0db
- Task ID: task-010
- Summary: Direct push to `main` branch bypassing the single-task PR workflow and branching contract.
- Impact: Architectural integrity risk and violation of the "Single-Task PR Contract," leading to immediate merge without review.
- Detection: Intentional review of `AGENTS.md` after work completion.
- Root cause: Ignored a non-zero exit code from `cartograph-contribute.mjs --auto` and proceeded to work on `main` without verifying a task-specific branch was active.
- Prevention action: Update `AGENTS.md` to explicitly mandate a branch verification step (`task/task-###-*`) before implementation and require immediate stop on bootstrap script failures.
- Owner: Eric Lott
- Status: open

### M-20260322-03
- Date: 2026-03-22
- Agent/session: Antigravity / 21d0e348-771f-4a37-baf6-9db088140a65
- Task ID: task-025
- Summary: Created a new React component file with a `.js` extension instead of `.jsx`, leading to a production build failure.
- Impact: CI/Frontend Quality Checks failed during the `npm run build` step with an "Unexpected JSX expression" error.
- Detection: Vite build failure in PR CI logs.
- Root cause: Careless file naming when extracting constants that contained JSX icon components. Vite/Rolldown settings in this project strictly enforce `.jsx` for JSX syntax.
- Prevention action: Always use `.jsx` for files containing React components or JSX elements. Updated `AGENTS.md` and `PillarWorkspace.jsx` imports to use the corrected extension.
- Owner: Eric Lott
- Status: mitigated
- Verification evidence: Successful `npm run build` after renaming to `.jsx`.

### M-20260322-04
- Date: 2026-03-22
- Agent/session: Antigravity / 21d0e348-771f-4a37-baf6-9db088140a65
- Task ID: task-025
- Summary: Inconsistency between the PR body template in `cartograph-closeout.mjs` and the field labels expected by `validate-task-pr.mjs`.
- Impact: `Task PR Validation` failed in CI because `## Primary Task` did not match any of the allowed aliases for `Task ID`.
- Detection: `validate-task-pr.mjs` error: "Task ID field in PR body is missing the primary ID: task-025".
- Root cause: A recent refactoring of the PR body template changed the header label without updating the validation script's `FIELD_ALIASES`.
- Prevention action: Harmonized `cartograph-closeout.mjs` to use `### Task ID` and updated `validate-task-pr.mjs` to include `Primary Task` as an alias.
- Owner: Eric Lott
- Status: mitigated
- Verification evidence: PR body updated and validation passed in subsequent CI run.

## Reuse Rules For Future Agents
- Before starting implementation, read the latest 5 entries.
- If an entry matches your current scope, apply its prevention action before coding.
- When closing a task, verify whether a new mistake entry is required.
