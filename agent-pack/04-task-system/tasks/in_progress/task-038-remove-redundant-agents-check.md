---
id: task-038
title: Remove redundant AGENTS.md check in cartograph-contribute.mjs
type: task
status: in_progress
priority: P0
owner: Eric Lott
claim_owner: Eric Lott
claim_status: claimed
claim_expires_at: "2026-03-24T00:00:00.000Z"
sla_due_at: 2026-03-24
depends_on: []
acceptance_criteria:
  - node scripts/cartograph-contribute.mjs no longer checks for agent-pack/03-agent-ops/AGENTS.md.
  - node scripts/cartograph-contribute.mjs correctly validates the top-level AGENTS.md.
  - Successfully run node scripts/cartograph-contribute.mjs --auto without file-missing error.
last_updated: 2026-03-23
---

# Task: Remove redundant AGENTS.md check in cartograph-contribute.mjs

## Description
The file `agent-pack/03-agent-ops/AGENTS.md` has been merged into the top-level `AGENTS.md`. The `cartograph-contribute.mjs` script still has a hardcoded check for the old location, causing it to fail. This task removes that check and ensures the script only validates the presence of the top-level `AGENTS.md`.

## Execution Guidance
1. Open `scripts/cartograph-contribute.mjs`.
2. Locate the `assertRepoStructure` function.
3. Remove the line that checks for `joinWorkflowPath(agentPackRoot, '03-agent-ops', 'AGENTS.md')`.
4. Verify other scripts do not have similar redundant checks.
