---
id: task-033
title: Add LLM Token Counting and Latency Logging to Backend Proxy
type: task
status: in_progress
priority: P1
owner: Eric Lott
claim_owner: Eric Lott
claim_status: claimed
claim_expires_at: "2026-03-22T20:48:14.381Z"
sla_due_at: 2026-03-23
depends_on:
  - task-027
  - feat-010
acceptance_criteria:
  - Backend now calculates input/output tokens for each LLM provider completion.
  - Latency is measured from request start to completion response.
  - "Each completion is logged to the console/file with `token_count` and `latency_ms`."
  - "Integration tests verify that the proxy response includes a `usage` metadata object."
last_updated: 2026-03-21
---

# Task: Add LLM Token Counting and Latency Logging to Backend Proxy

## Description
Improve observability into the cost and performance of the LLM pipeline. This is a prerequisite for more advanced telemetry and consumption tracking.

## Execution Guidance
1. Update `backend/services/agentService.js` to capture response timing.
2. Integrate provider-specific token count fields (OpenAI `usage`, Anthropic `usage`, etc.).
3. Standardize the output format for all providers in the backend response metadata.
