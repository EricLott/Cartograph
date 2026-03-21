---
id: epic-003
title: Intelligent Decision Graph Engine
type: epic
status: backlog
priority: P1
owner: unassigned
depends_on:
  - epic-001
acceptance_criteria:
  - Every decision is vectorized and stored with semantic embeddings.
  - The system can propose "related" decisions based on semantic proximity.
  - Relationship edges (blocks, conflicts, supports) are explicitly modeled in the graph.
last_updated: 2026-03-20
---

# Epic: Intelligent Decision Graph Engine

## Epic Summary
Move beyond a simple tree structure to a rich, semantic graph of architectural decisions. This engine powers the "Living Decision System" described in the vision, allowing the platform to suggest tradeoffs, identify overlaps, and map dependencies intelligently.

## Outcome Metrics
- Semantic similarity search returns relevant decisions with >80% accuracy.
- Relationship inference reduces manual linking time for users.

## In Scope
- Integration with an embedding model (e.g., Gemini Embeddings).
- Graph schema extensions for rich edges.
- Inference logic for candidate relationships.

## Out of Scope
- Real-time collaborative graph editing (beyond simple save/refresh).

## Child Feature IDs
- feature-008
- feature-011

## Risks
- Embedding quality variance for ultra-specific technical jargon.
- Graph complexity becoming difficult to navigate as projects grow.
