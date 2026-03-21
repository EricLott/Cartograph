# Workflow Improvement Feedback

## Purpose
Collect feedback from agents regarding the orchestration process, tool friction, or documentation gaps. This helps improve the developer experience for both human and AI contributors.

**Note**: Feedback logged here does **not** flow into the `agent-pack/04-task-system`. Improvements based on this feedback are intended to be ephemeral/collaborative or worked on directly in the `main` branch by humans and agents together.

## When To Leave Feedback
- You encountered unexpected friction in the `cartograph` loop or closeout process.
- A tool failed or behaved in a way that required a manual workaround.
- Documentation was ambiguous or missing, leading to confusion.
- You have a suggestion for a new script, tool, or workflow improvement.

## Feedback Log
Copy this block for each new entry.

```md
### F-YYYYMMDD-##
- Date:
- Agent/Session:
- Task ID:
- Area:
- Type: gap | friction | bug
- Severity: low | medium | high
- Friction Point:
- Impact:
- Proposed Improvement:
- Status: pending | reviewed | implemented
- Validation:
```

## Log Entries

### F-20260321-01
- Date: 2026-03-21
- Agent/Session: Antigravity / 64500629-609c-4cbb-9a98-9d80bfd2f370
- Task ID: task-031
- Area: agent-ops
- Type: gap
- Severity: medium
- Friction Point: Closeout script only prompted for mistakes, not workflow feedback.
- Impact: Missed opportunities to improve orchestration based on agent experience.
- Proposed Improvement: Add feedback.md and update closeout script reminder.
- Status: implemented
### F-20260322-01
- Date: 2026-03-22
- Agent/Session: Antigravity / 21d0e348-771f-4a37-baf6-9db088140a65
- Task ID: task-025
- Area: orchestration / developer-experience
- Type: friction
- Severity: low
- Friction Point: PowerShell terminal does not support `&&` statement separators by default in some environments, leading to command failures when agents use standard shell syntax. Also, pre-existing lint errors in refactored hooks (unused imports/variables) caused CI/Lint failures on unrelated task work.
- Impact: Required multiple retries for terminal commands and manual cleanup of unrelated lint errors to pass quality gates.
- Proposed Improvement: (1) Use `;` or separate command calls for Windows PowerShell environments. (2) Ensure newly refactored hooks are lint-clean before being committed to main.
- Status: pending
- Validation: N/A
