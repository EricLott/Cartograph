---
doc_type: state_log
schema_version: 1
status_enum:
  - backlog
  - todo
  - in_progress
  - blocked
  - done
  - cancelled
last_updated: 2026-03-19
---

# Blockers Log

## Purpose
Track active and historical blockers that prevent safe or complete execution.

## Inputs
- Escalation events
- Task failures and unresolved dependencies

## Outputs
- Auditable blocker timeline and unblock path

## Required Sections
- Blocker Entry Schema
- Active Blockers
- Resolved Blockers
- Escalation Notes

## Blocker Entry Schema
```yaml
blocker_id: blkr-001
created_at: 2026-03-19T10:00:00-05:00
linked_task: task-001
impact: Delivery of authentication flow is blocked.
unblock_condition: Security control decision approved.
owner: team-owner
escalation_status: sev-1_open
status: blocked
```

## Active Blockers
- None yet.

## Resolved Blockers
- None yet.

## Escalation Notes
Use severity tokens from `../03-agent-ops/escalation-rules.md`.

## Update Cadence
Update immediately when blocker status or ownership changes.

## Source of Truth References
- `../03-agent-ops/escalation-rules.md`
- `./open-questions.md`
- `./decisions-log.md`