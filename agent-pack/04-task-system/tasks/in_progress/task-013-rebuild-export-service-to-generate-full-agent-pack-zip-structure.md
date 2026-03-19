---
id: task-013
title: Rebuild export service to generate full agent-pack zip structure
type: task
status: in_progress
priority: P0
owner: Eric Lott
claim_owner: Eric Lott
claim_status: claimed
claim_expires_at: "2026-03-20T21:18:23.858Z"
sla_due_at: "2026-04-20T23:59:00Z"
depends_on:
  - task-004
acceptance_criteria:
  - Zip includes full expected folder and file structure.
  - "Exported core files contain meaningful content, not empty placeholders."
  - Generated output is consumable by coding agents following AGENTS contract.
last_updated: 2026-03-19
---


# Task: Rebuild export service to generate full agent-pack zip structure

## Task Goal
Deliver export output that matches Cartograph mission-ready pack promise.

## Parent Feature
- feature-004

## Implementation Steps
- Replace minimal export with generator for `00-context` through `07-artifacts` structure.
- Populate key files from current pillars and decisions plus pack contracts.
- Preserve deterministic naming and folder layout for agent consumption.

## Dependencies
- task-004

## Acceptance Criteria
- Zip includes full expected folder and file structure.
- Exported core files contain meaningful content, not empty placeholders.
- Generated output is consumable by coding agents following AGENTS contract.

## Evidence Plan
- Export service diff and generated zip directory listing.
- Manual export validation notes from sample project.
- Progress log entry with artifact checks.

## Claim and SLA
- Claim this task before coding by setting claim_owner, claim_status, and claim_expires_at.
- Default claim window is 24 hours and must never exceed sla_due_at.
- If claim expires, set claim_status: expired, return task to 	odo, and allow re-claim.
- Any PR implementing this task must include this task file.