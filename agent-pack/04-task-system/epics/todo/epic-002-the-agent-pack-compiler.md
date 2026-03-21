---
id: epic-002
title: The Agent-Pack Compiler
type: epic
status: in_progress
priority: P1
owner: product-export
depends_on:
  - epic-001
acceptance_criteria:
  - "Exported packs contain the full 00-07 directory structure."
  - "Task scaffolding is automatically generated from decisions."
  - "Validator suite prevents export of incomplete blueprints."
last_updated: 2026-03-21
---

# Epic: The Agent-Pack Compiler (Phase 2)

## Vision
Transform architecture intent into a durable, machine-consumable mission pack. This is the heart of the Cartograph value proposition.

## Features
- feat-004: Full Agent-Pack Export Compiler
- feat-008: Scaffolding Engine
- feat-006: Validator Suite

## Implementation Strategy
- Expand `exportService` to include recursive folder generation.
- Implement rule-based task generation derived from Decision nodes.
- Add pre-flight validation gates before allowing export.
