# Product Roadmap: Cartograph Progression

## Vision Refresher
**Cartograph** transforms evolving product ideas into execution-grade, agent-ready blueprint packs. This roadmap defines our thematic progression from prototype to enterprise-grade execution platform.

---

## 🏗️ Phase 1: The Integrity Core (Next 2-4 Weeks)
*Focus: Data safety, persistence reliability, and baseline stability.*

### Features
* **Non-Destructive Persistence**: Complete the transition from "overwrite everything" to a transactional, ID-based save system.
* **Architecture Hydration**: Ensure all components (pillars, decisions, tasks) correctly re-hydrate from storage on app restart.
* **Provider Safety & Recovery**: Implement robust error handling for LLM/API failures, including user-friendly feedback and graceful degradation.

---

## 🤖 Phase 2: The Agent-Pack Compiler (Next 1-2 Months)
*Focus: Delivering the primary value proposition: the agent-ready export.*

### Features
* **Full Blueprint Export**: Move beyond basic text exports. The "Export Zip" must contain the complete `00-07` folder structure, fully populated with the current project's context.
* **Scaffolding Engine**: Automatically generate basic task structures and acceptance criteria based on architecture decisions.
* **Validator Suite**: Ensure only "complete" and "safe" packs can be exported (e.g., checking for missing pill-essential decisions).

---

## 🏛️ Phase 3: The Contributor Engine (Next 2-3 Months)
*Focus: Scaling the platform for multi-agent and community contribution.*

### Features
* **Automated Quality Gates**: Integrate strict linting, build checks, and automated unit/integration tests into the contributor CI.
* **Task Governance Dashboard**: Visualize the task claim lifecycle (claimed, active, expired, complete) to prevent overlap.
* **Telemetry & Observability**: Basic server-side and frontend event tracking for usage patterns and error monitoring.

---

## 🌌 Phase 4: Enterprise Expansion (Longer Term)
*Focus: Governance, specialized adapters, and platform growth.*

### Themes
* **Governance & Audit Trails**: Traceability from initial prompt to final PR.
* **Integration Adapters**: Direct export to GitHub, Jira, or ADO.
* **Collaborative Architecture**: Real-time multi-agent/human orchestration on the same blueprint.

---

## Update Cadence
This roadmap is living documentation. It is updated at the conclusion of every major milestone or when strategic product priorities shift.
