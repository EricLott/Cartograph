# Escalation Rules

## Purpose
Define when and how agents escalate blocked or high-risk decisions.

## Inputs
- Active blockers
- Open questions and risk assessments

## Outputs
- Standard escalation records and response expectations

## Required Sections
- Escalation Triggers
- Escalation Workflow
- Severity Levels
- Resolution Hand-off

## Escalation Triggers
Escalate immediately for:
- Security/compliance ambiguity.
- Data integrity or irreversible change risk.
- Conflicting requirements with no safe default.

## Escalation Workflow
1. Log blocker in `../05-state/blockers.md`.
2. Log question in `../05-state/open-questions.md`.
3. Propose options in `../05-state/decisions-log.md` if possible.
4. Pause affected task until resolution criteria are met.

## Severity Levels
- `sev-1`: critical risk, immediate stop.
- `sev-2`: major delivery risk, pause affected scope.
- `sev-3`: moderate uncertainty, continue unrelated tasks.

## Resolution Hand-off
A blocker resolves only when a named owner provides a decision or explicit directive.

## Update Cadence
Update when escalation policy or ownership model changes.

## Source of Truth References
- `./AGENTS.md`
- `../05-state/blockers.md`
- `../05-state/open-questions.md`