# System Overview

## Purpose
Describe Cartograph's current architecture and target near-term shape so contributors can execute changes against a shared system model.

## Inputs
- `../00-context/vision.md`
- `../00-context/business-goals.md`
- `../00-context/constraints.md`
- Current repo implementation (`frontend/`, `backend/`, `docker-compose.yml`)

## Outputs
- Unified architecture narrative
- Explicit system boundaries and risk hotspots

## Required Sections
- Context Summary
- In-Scope Capabilities
- Out-of-Scope Capabilities
- High-Level Components
- External Integrations
- Key Risks

## Context Summary
Cartograph is currently a local-first full-stack web app with:
- React/Vite frontend for interactive architecture conversations.
- Express/Sequelize backend for persistence to MySQL.
- Browser-side BYOK integrations for OpenAI, Anthropic, and Gemini.
- Minimal zip export (`agents.md` + simple task markdown) that must evolve into full agent-pack output.

## In-Scope Capabilities
- Accept user idea and generate top-level architecture pillars.
- Expand pillars into decisions and subcategories.
- Capture iterative chat updates and conflict hints.
- Persist architecture state to backend database.
- Export blueprint artifacts.
- Support open-source contributor workflow using `AGENTS.md` and claimable tasks.

## Out-of-Scope Capabilities
- Hosted multi-tenant SaaS auth and user accounts.
- Production-grade secrets vault or enterprise IAM.
- Long-term historical analytics dashboard.
- Full RBAC administration UI.

## High-Level Components
1. Frontend UI (`frontend/src/App.jsx` + components)
   - Chat orchestration, pillar workspace, settings modal, export trigger.
2. Agent Service Layer (`frontend/src/services/agentService.js`)
   - Provider-specific prompt and response handling.
3. Export Service (`frontend/src/services/exportService.js`)
   - Zip generation pipeline.
4. Backend API (`backend/server.js`)
   - Save-state endpoint and Sequelize models.
5. Data Store (MySQL via Docker Compose)
   - Project, Pillar, Decision persistence.

## External Integrations
- OpenAI Chat Completions API.
- Anthropic Messages API.
- Google Gemini GenerateContent API.
- Browser file save via `file-saver`.

## Key Risks
- Destructive persistence behavior currently resets all projects on save.
- No retrieval endpoint for restoring latest state.
- Unsafe chat rendering (`dangerouslySetInnerHTML`) increases XSS exposure.
- Limited automated test coverage and current lint failures reduce refactor confidence.
- Export output does not yet satisfy full agent-pack contract.

## Update Cadence
Update when architecture boundaries, integrations, or major capabilities change.

## Source of Truth References
- `../00-context/*`
- `./domain-model.md`
- `./integration-architecture.md`
- `../02-execution/dependency-map.md`