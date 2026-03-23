# Environment Setup

## Purpose
Provide deterministic setup and verification steps so first-time contributors and coding agents can run Cartograph reliably.

## Inputs
- `README.md`
- `docker-compose.yml`
- frontend/backend package scripts

## Outputs
- Repeatable local environment setup
- Concrete verification command checklist

## Required Sections
- Prerequisites
- Local Setup Steps
- Configuration Variables
- Verification Steps

## Prerequisites
- Docker Desktop with Docker Compose support.
- Node.js 22.x and npm 10.x (for non-container local runs).
- Git and shell access.

## Local Setup Steps
### Option A: Docker Compose (recommended)
1. From repo root:
   - `docker-compose up --build`
2. Open frontend:
   - `http://localhost:5173`
3. Backend API base:
   - `http://localhost:3000`

### Option B: Run services directly
1. Backend:
   - `cd backend`
   - `npm install`
   - `npm start`
2. Frontend (new terminal):
   - `cd frontend`
   - `npm install`
   - `npm run dev`
3. Ensure MySQL is running and reachable using `DB_*` variables.

## Configuration Variables
### Frontend
- `VITE_API_URL` (default in compose: `http://localhost:3000`)

### Backend
- `DB_HOST` (compose default: `mysql`)
- `DB_USER` (compose default: `cartograph`)
- `DB_PASSWORD` (compose default: `cartograph_pass`)
- `DB_NAME` (compose default: `cartograph_db`)
- `DB_PORT` (compose default: `3306`)

## Verification Steps
Run these checks before claiming implementation tasks:

### Repository baseline checks
1. Frontend lint:
   - `cd frontend && npm run lint`
2. Frontend production build:
   - `cd frontend && npm run build`

### Runtime smoke checks (current)
1. Service reachability:
   - Open `http://localhost:5173` and confirm app loads.
2. Persistence endpoint smoke test:
   - `curl -X POST http://localhost:3000/api/save-state -H "Content-Type: application/json" -d "{\"idea\":\"test\",\"pillars\":[]}"`
   - Expect JSON success response.

### Runtime smoke checks (after task completion)
- `GET /api/projects/latest` should return latest saved snapshot (after `task-004`).
- `GET /api/health` should return readiness payload (after `task-005`).

## Update Cadence
Update whenever setup steps, scripts, or environment variables change.

## Source of Truth References
- `../../README.md`
- `../06-quality/testing-strategy.md`
- ../../AGENTS.md