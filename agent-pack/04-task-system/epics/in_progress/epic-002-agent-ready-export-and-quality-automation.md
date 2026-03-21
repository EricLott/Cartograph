---
id: epic-002
title: Agent-Ready Export and Quality Automation
type: epic
status: in_progress
priority: P0
owner: unassigned
depends_on:
  - epic-001
acceptance_criteria:
  - Exported blueprint zip aligns with agent-pack contract.
  - Automated tests and CI gates enforce contribution quality.
last_updated: 2026-03-19
---

# Epic: Agent-Ready Export and Quality Automation

## Epic Summary
Deliver the core product promise: execution-grade blueprint export plus enforceable quality automation.

## Outcome Metrics
- Export includes required `00-07` structure and core files.
- CI validates lint/build/test for PRs.

## In Scope
- Export compiler rework.
- Export schema validation.
- Automated test and CI baseline.

## Out of Scope
- Long-term analytics/reporting platform.
- Cloud deployment pipeline beyond baseline CI.

## Child Feature IDs
- feature-004
- feature-005
- feature-006

## Risks
- Export contract drift if docs and generator diverge.
- Test flakiness during initial automation rollout.