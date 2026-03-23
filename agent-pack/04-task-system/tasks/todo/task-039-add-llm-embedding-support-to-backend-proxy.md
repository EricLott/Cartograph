---
id: task-039
title: Add LLM Embedding Support to Backend Proxy
type: task
status: todo
priority: P1
owner: backend-specialist
claim_owner: null
claim_status: unclaimed
claim_expires_at: null
sla_due_at: 2026-03-26
depends_on:
  - task-027
acceptance_criteria:
  - "New method `getEmbedding(provider, text, clientKeys)` in `backend/services/agentService.js`."
  - "Supports OpenAI `text-embedding-3-small` and Gemini embedding models."
  - "New endpoint `POST /api/agent/embed` that returns a vector for a given text."
  - "Unit tests in `backend/tests/integration/agent.integration.test.js` verify embedding retrieval."
last_updated: 2026-03-23
---

# Task: Add LLM Embedding Support to Backend Proxy

## Description
To support semantic clustering and discovery, we need the ability to generate vector embeddings for architectural decisions. This task extends the existing `agentService` to support embedding models from OpenAI and Gemini.

## Execution Guidance
1.  Implement `getOpenAIEmbedding` and `getGeminiEmbedding` in `backend/services/agentService.js`.
2.  Expose them via a unified `requestProviderEmbedding` function.
3.  Register the `/api/agent/embed` route in `backend/routes/agentRoutes.js`.
4.  Ensure API keys are handled consistently with the completion proxy.

## Expected Output
- A working API endpoint that returns a flat array of floats (the embedding) for any input string.
