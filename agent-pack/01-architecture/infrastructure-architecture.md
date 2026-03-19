# Infrastructure Architecture

## Purpose
Document the runtime topology used today and the target for reliable contributor execution.

## Inputs
- `docker-compose.yml`
- frontend/backend Dockerfiles
- local development workflow

## Outputs
- Environment model and deployment expectations

## Required Sections
- Environment Topology
- Compute, Network, and Storage Baseline
- Deployment Model
- Scaling and Failover Strategy
- Cost Guardrails

## Environment Topology
- `frontend` service: Vite dev server exposed at `5173`.
- `backend` service: Express API exposed at `3000`.
- `mysql` service: MySQL 8 exposed at `3306`, persistent volume `mysql_data`.

## Compute, Network, and Storage Baseline
- Node 22 Alpine containers for frontend and backend.
- Bridge networking managed by Docker Compose.
- MySQL persistent volume for data durability between container restarts.

## Deployment Model
- Primary supported path: local Docker Compose.
- Secondary path: run frontend/backend directly with local dependencies.
- No production deployment pipeline is currently defined in repo.

## Scaling and Failover Strategy
- Current scale model: single-instance local services.
- Near-term focus: reliability and correctness, not horizontal scale.
- Future: stateless backend scaling + managed DB + migration workflow.

## Cost Guardrails
- Keep contributor setup lightweight and deterministic.
- Avoid introducing paid dependencies for baseline development workflow.

## Update Cadence
Update when runtime topology or deployment flow changes.

## Source of Truth References
- `./non-functional-requirements.md`
- `../03-agent-ops/environment-setup.md`
- `../06-quality/observability.md`