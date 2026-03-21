---
id: feature-008
title: Scaffolding Engine
type: feature
status: todo
priority: P1
owner: product-export
depends_on:
  - epic-002
acceptance_criteria:
  - "Decisions automatically generate candidate tasks in the 04-tasks folder."
  - "Tasks include default acceptance criteria derived from the Decision's context."
  - "Workstreams are automatically populated based on Pillar clusters."
last_updated: 2026-03-21
---

# Feature: Scaffolding Engine

## Problem Statement
Manually creating tasks for every architectural decision is slow and prone to error. Cartograph should bridge the gap between "what" (decision) and "how" (task) automatically.

## User/System Behavior
- When an architecture is exported, the system generates a draft task backlog.
- Tasks are grouped by their parent workstream.
- Prerequisite relationships are inferred from the graph.

## Dependencies
- task-013
- task-019
- task-021
