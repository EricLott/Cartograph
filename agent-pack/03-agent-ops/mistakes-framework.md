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

_No entries yet. Add the first entry using the template above._

## Reuse Rules For Future Agents
- Before starting implementation, read the latest 5 entries.
- If an entry matches your current scope, apply its prevention action before coding.
- When closing a task, verify whether a new mistake entry is required.
