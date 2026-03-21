---
id: feature-014
title: Interactive Decision Graph Engine
type: feature
status: todo
priority: P1
owner: frontend-specialist
depends_on:
  - epic-005
acceptance_criteria:
  - Render a node-link diagram with color-coded edges (solid = dependency, dashed = related, red = conflict).
  - Ability to click a node to open its details in a side panel.
  - Interactive panning, zooming, and node repositioning (force-directed or manual).
last_updated: 2026-03-21
---

# Feature: Interactive Decision Graph Engine

## Problem Statement
The current Mermaid chart only shows pillar hierarchy. It doesn't allow for the complex cross-pillar relationships or the "semantic intelligence" that is part of the vision. Architectural decisions often depend on or conflict with choices in other domains, and these must be visible to humans and agents.

## User/System Behavior
- Decisions appear as nodes with distinct badges for status (Resolved/Pending/Conflict).
- Edges are weighted and styled by relationship type.
- Red glow effect around unresolved conflict nodes.
- High-performance rendering (e.g., using React Flow, D3, or X6) to support 500+ nodes.

## Dependencies
- feat-001 (Persistence Hardening)
- task-035 (Graph Relationship Model)

## Notes
The Mermaid implementation is a placeholder; this feature moves to a specialized graph library to support the "Living Decision System."
