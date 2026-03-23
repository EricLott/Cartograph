---
id: feature-012
title: Integration Adapters
type: feature
status: todo
priority: P3
owner: product-enterprise
depends_on:
  - epic-006
acceptance_criteria:
  - Automated one-click export and sync with GitHub Issues.
  - Two-way sync with Jira and ADO task backlogs.
  - Native integration with CI/CD runners for blueprint-to-implementation verification.
last_updated: 2026-03-21
---

# Feature: Integration Adapters

## Problem Statement
Cartograph exists in a wider ecosystem of tools. Manually copying tasks to external trackers is a major point of friction for large teams.

## User/System Behavior
- Users can link a Cartograph project to a GitHub repository.
- Tasks are automatically created or updated in the target system.
- Bi-directional status updates (e.g., closing a Jira ticket closes the task in Cartograph).

## Dependencies
- feat-011
