---
id: task-042
title: Integrate Frontend Error Tracking (Sentry)
type: task
status: todo
priority: P2
owner: product-ops
claim_owner: null
claim_status: unclaimed
claim_expires_at: null
sla_due_at: 2026-03-29
depends_on:
  - feat-002
acceptance_criteria:
  - "Sentry SDK initialized in `frontend/src/main.jsx`."
  - "Uncaught exceptions and React Error Boundaries report to Sentry."
  - "DSN is configurable via environment variables."
  - "Verification that PII (like API keys in state) is not leaked to Sentry."
last_updated: 2026-03-23
---

# Task: Integrate Frontend Error Tracking (Sentry)

## Description
To improve platform reliability (Observability), we need to capture and triage real-world errors encountered by users.

## Execution Guidance
1.  Install `@sentry/react` and `@sentry/browser`.
2.  Initialize Sentry in the frontend entry point.
3.  Implement a root-level `ErrorBoundary` component.
4.  Verify error reporting with a dummy error trigger.

## Expected Output
- Automated error reporting to a centralized dashboard.
