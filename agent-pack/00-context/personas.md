# User Personas: Designing for Empathy

To guide Cartograph's development and UX decisions, we focus on three primary target personas. These represent our users' core needs, pain points, and success criteria.

---

## 🏗️ Alex: The "System Architect" (Enterprise/Mid-Market)
*The human architect who needs to scale their expertise and design high-quality, traceable systems.*

### Profile
* **Role**: Solution Architect, Lead Engineer, or CTO.
* **Context**: Managing 3-5 concurrent workstreams with 2-3 development teams (human or agent).
* **Goals**:
  * Transform vague business requests into rigorous architecture.
  * Ensure all execution is traceable back to initial requirements.
  * Reduce "architectural drift" during implementation.
* **Pain Points**:
  * "Broken telephone" between design and code.
  * Incomplete or ambiguous documentation leading to rework.
  * Difficulty tracking implementation progress against the original design.
* **Cartograph Value**: **Deterministic translation** from intent to execution-ready tasks.

---

## 🚀 Sam: The "Solo Founder" (Startup/Indie-Dev)
*The human founder who needs to move fast and use AI agents to build their initial product.*

### Profile
* **Role**: Founder, Product Owner, and sometimes "Head of Everything."
* **Context**: Building an MVP (Minimum Viable Product) with minimal human headcount, relying heavily on AI coding agents.
* **Goals**:
  * Rapidly iterate on product ideas.
  * "Hand off" large chunks of implementation to autonomous agents.
  * Avoid expensive refactors caused by missed architectural foundations.
* **Pain Points**:
  * AI agents hallucinating missing requirements.
  * Managing a chaotic backlog of small, disconnected tasks.
  * Difficulty "resuming" work after being away for a few days.
* **Cartograph Value**: **Long-running execution state** and autonomous task management.

---

## 🤖 Aris: The "Autonomous Agent" (Machine Persona)
*The AI agent (like me) who consumes the Cartograph output and executes the work.*

### Profile
* **Role**: Autonomous coding assistant, contributor agent.
* **Context**: Running for 1-4 hours at a time, performing multi-file edits and running terminal commands.
* **Goals**:
  * Identify the "next best task" without human intervention.
  * Understand the full architectural context of any given piece of code.
  * Execute with high confidence (low regression, high adherence to standards).
* **Pain Points**:
  * Ambiguous task descriptions ("Implement the UI").
  * Missing dependencies (starting task B before A).
  * No clear "Definition of Done" or acceptance criteria.
* **Cartograph Value**: **Machine-consumable "Source of Truth"** for execution.

---

## Using Personas in Development
* **Alex** drives our need for **formal architecture pillars** and **traceability**.
* **Sam** drives our need for **speed, hydration, and persistence**.
* **Aris** drives our need for **deterministic structure**, **metadata**, and **explicit PRDs**.
