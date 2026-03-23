---
id: feature-007
title: Server-side LLM Proxy and Security
type: feature
status: todo
priority: P0
owner: security
depends_on:
  - epic-001
acceptance_criteria:
  - Frontend no longer communicates directly with third-party LLM APIs.
  - API keys are secured on the server.
  - Basic rate limiting and usage logging are implemented.
last_updated: 2026-03-20
---

# Feature: Server-side LLM Proxy and Security

## Problem Statement
The current implementation makes LLM calls from the browser, exposing API keys (if not using env-based local dev) and preventing server-side audit/control.

## User/System Behavior
- Secure, centralized LLM communication.
- Consistent endpoint for all agent-based completions.

## Dependencies
- task-011
- task-012

## Acceptance Criteria
- `/api/agent/complete` endpoint functional.
- No direct provider URLs in frontend network traffic.

## Child Task IDs
- task-027
