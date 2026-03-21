---
id: feature-004
title: Full Agent-Pack Export Compiler
type: feature
status: todo
priority: P0
owner: unassigned
depends_on:
  - epic-002
  - feature-001
  - feature-002
acceptance_criteria:
  - Exported zip contains full `00-07` folder structure.
  - Generated files include required task/state/agent contracts.
last_updated: 2026-03-19
---

# Feature: Full Agent-Pack Export Compiler

## Problem Statement
Export currently outputs only a minimal subset of required blueprint artifacts.

## User/System Behavior
Users can export a mission-ready pack that coding agents can execute directly.

## Dependencies
- Stable architecture/task contract docs.

## Acceptance Criteria
- Zip output mirrors defined pack contract.
- Core files are populated from active pillar/decision context.

## Child Task IDs
- task-013
- task-014