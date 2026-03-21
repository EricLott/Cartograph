---
id: feature-011
title: Agent-Driven Relationship Inference
type: feature
status: backlog
priority: P1
owner: artificial-intelligence
depends_on:
  - epic-003
acceptance_criteria:
  - The system identifies potential conflicts or dependencies using LLM analysis.
  - Proposas appear as "Dashed" edges in the graph with "Confirm" buttons.
  - User feedback loop improves the graph-building process.
last_updated: 2026-03-20
---

# Feature: Agent-Driven Relationship Inference

## Problem Statement
Manually linking every decision is tedious and error-prone. Agents should assist the architect in connecting the dots.

## User/System Behavior
- "We think this depends on X. Confirm?" interaction pattern.

## Dependencies
- LLM Proxy (feature-007).

## Acceptance Criteria
- LLM response includes candidate relation IDs and types.
- UI supports "Inferred Relation" state.

## Child Task IDs
- task-035
- task-036
