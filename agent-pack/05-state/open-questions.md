---
doc_type: state_log
schema_version: 1
last_updated: 2026-03-19
---

# Open Questions

## Purpose
Capture unresolved questions that can impact implementation, quality, or scope.

## Inputs
- Ambiguities found during planning or execution
- Escalation and blocker context

## Outputs
- Prioritized question queue with owners and resolution path

## Required Sections
- Question Entry Schema
- Active Questions
- Resolved Questions

## Question Entry Schema
```yaml
question_id: q-001
created_at: 2026-03-19
question: What is the compliance baseline for data residency?
impact: High
affected_items:
  - task-001
owner: unassigned
status: open
resolution_target: 2026-03-26
```

## Active Questions
- `q-001`: Should provider API calls remain browser-direct for v1, or move to backend proxy in next milestone?
  - Impact: high
  - Affected items: `task-011`, `task-012`, security architecture
  - Owner: architecture
  - Resolution target: 2026-04-20

- `q-002`: Which backend integration test stack should be standard (`jest/supertest` vs alternative)?
  - Impact: medium
  - Affected items: `task-016`, `task-017`
  - Owner: quality
  - Resolution target: 2026-04-10

## Resolved Questions
- None yet.

## Update Cadence
Update when questions are opened, reprioritized, answered, or retired.

## Source of Truth References
- `./blockers.md`
- `./decisions-log.md`
- `../03-agent-ops/escalation-rules.md`