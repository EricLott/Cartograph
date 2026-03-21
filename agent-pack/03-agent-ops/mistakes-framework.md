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

## Reuse Rules For Future Agents
- Before starting implementation, read the latest 5 entries.
- If an entry matches your current scope, apply its prevention action before coding.
- When closing a task, verify whether a new mistake entry is required.
