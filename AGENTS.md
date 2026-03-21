# Cartograph Contributor Agent Entry Point

# Cartograph Contributor Agent Entry Point

If you are a coding agent contributing to this repository, use this file as your starting point.

## Canonical Operating Contract
The full mission-ready contract, including task metadata schemas, escalation rules, and definition of done, is maintained in the `agent-pack`:
- [AGENTS Operating Contract](file:///C:/Users/Lott/source/repos/Cartograph/agent-pack/03-agent-ops/AGENTS.md)

## One-Command Contributor Flow
If a human asks you to contribute, run:
- `node scripts/cartograph-contribute.mjs --auto` (to pick and claim a task)
- `node scripts/cartograph-contribute.mjs --task task-### --resume` (to resume work)

## Local Preflight & Closeout
Before opening a PR, run:
- `node scripts/cartograph-closeout.mjs --task task-###` (to prepare for PR)
- `node scripts/cartograph-closeout.mjs --task task-### --create-pr` (to automate PR creation)
- `node scripts/cartograph-closeout.mjs --task task-### --create-pr --non-interactive` (agent-style automated closeout)

Manual validation:
- `node scripts/validate-task-pr.mjs --self-check --task-id task-###`

## Continuous Integration
All PRs to `main` must pass automated quality gates (lint/build/test) and task-to-PR boundary enforcement.

## First Read
Read these in order before coding for the first time:
1. `agent-pack/00-context/vision.md`
2. `agent-pack/02-execution/implementation-strategy.md`
3. `agent-pack/04-task-system/README.md`
