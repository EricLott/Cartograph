---
id: feature-009
title: Interactive Decision Graph Visualization
type: feature
status: backlog
priority: P1
owner: frontend
depends_on:
  - epic-004
acceptance_criteria:
  - Directed graph shows decisions as nodes and relations as edges.
  - Edges are color-coded (red for conflicts, solid for dependencies).
  - Graph is interactive (pan/zoom/click to select).
last_updated: 2026-03-20
---

# Feature: Interactive Decision Graph Visualization

## Problem Statement
A tree view hides circular dependencies and conflicts. A graph is required to see the "true shape" of the architecture.

## User/System Behavior
- Users see the "Decision Graph" as the primary operational map.
- Clicking a node opens the right-hand details panel.

## Dependencies
- Data structure hardening (feature-001).

## Acceptance Criteria
- React-based graph component integrated into `MainCanvas.jsx`.
- Real-time layout updates when adding/linking decisions.

## Child Task IDs
- task-032
- task-033
