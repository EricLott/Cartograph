---
id: feature-008
title: Decision Vectorization and Similarity Search
type: feature
status: backlog
priority: P1
owner: architecture
depends_on:
  - epic-003
acceptance_criteria:
  - Decision content (title, summary, rationale) is vectorized.
  - Integration with Gemini/OpenAI embedding APIs is functional.
  - Backend can return top-N similar decisions for a given node.
last_updated: 2026-03-20
---

# Feature: Decision Vectorization and Similarity Search

## Problem Statement
Decisions are currently text blobs. The system cannot "understand" when two choices are similar or overlapping without manual labeling.

## User/System Behavior
- Users can click "Show Similar" to find relevant architectural context.
- The system flags potential duplicates before save.

## Dependencies
- LLM Provider API (task-027).

## Acceptance Criteria
- Vectors persisted to the `Decision` model.
- Similarity endpoint available at `GET /api/decisions/:id/similar`.

## Child Task IDs
- task-030
- task-031
