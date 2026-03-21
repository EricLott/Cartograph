---
id: feature-013
title: Collaborative Architecture
type: feature
status: todo
priority: P3
owner: product-enterprise
depends_on:
  - epic-004
acceptance_criteria:
  - Multiple users/agents can edit the architecture graph simultaneously.
  - Real-time cursor presence and activity indicators in the UI.
  - Deterministic conflict resolution for concurrent edits.
last_updated: 2026-03-21
---

# Feature: Collaborative Architecture

## Problem Statement
Cartograph is currently single-player at any given moment. Complex system design is inherently collaborative and requires real-time coordination.

## User/System Behavior
- Live updates when another user or agent modifies a decision.
- Collaborative whiteboard-style interaction for graph placement.
- Audit history tracks *which* collaborator made which change.

## Dependencies
- feat-011
- feat-012
