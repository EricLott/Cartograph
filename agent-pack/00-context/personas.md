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
* **Primary Modes**: **Task Mode** (architecture decomposition), **Roadmap Mode** (strategic alignment), and **Discover Mode** (semantic decision clusters).

#### Operational Narrative
Alex starts in **Roadmap Mode**, auditing the current project state against the long-term vision. They use **Discover Mode** to visualize semantic clusters of decisions across pillars—identifying where a "Security" choice in the API might conflict with a "Data" choice in the database. Once the strategy is balanced, they switch to **Task Mode** to decompose high-level functional requirements into atomic task files with strict dependencies, ensuring **Aris** (the agent) has zero ambiguity.


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
* **Primary Modes**: **Roadmap Mode** (vision refinement) and **Task Mode** (rapid prototyping).

#### Operational Narrative
Sam uses **Roadmap Mode** to set the North Star for their MVP. They rely on Cartograph to "remember" the plan while they deal with other founder responsibilties. When they need progress, they switch to **Task Mode** to seed the backlog, then hand off to **Work Mode** for the agents to build.

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
* **Primary Modes**: **Work Mode** (executing tasks).

#### Operational Narrative
Aris lives in **Work Mode**. They use the Cartograph bootstrap to claim the highest-priority, unblocked task, execute the code changes while following **Alex's** architecture, and provide evidence in **Repo Mode** (closeout scripts) to maintain repository health and structure.

---

## Using Personas in Development
* **Alex** drives our need for **formal architecture pillars** and **traceability**.
* **Sam** drives our need for **speed, hydration, and persistence**.
* **Aris** drives our need for **deterministic structure**, **metadata**, and **explicit PRDs**.

---

## 🛠️ Operating Mode Mapping
These personas directly inform our four primary **Operating Modes** as defined in `AGENTS.md`.

| Mode | Primary Persona | Goal |
|---|---|---|
| **🏷️ Work Mode** | **Aris** (Agent) | High-speed task execution and bug fixing. This is the bedrock of delivery. |
| **📝 Task Mode** | **Alex** & **Sam** | Translating architectural vision into atomic, executable task units. |
| **🗺️ Roadmap Mode** | **Alex** & **Sam** | Strategizing and aligning current execution with the high-level roadmap and vision. |
| **🔍 Discover Mode** | **Alex** | Visualizing semantic clusters and cross-pillar dependencies to identify hidden risks. |
| **📂 Repo Mode** | **System Guards** | Maintaining repo integrity, structure, and operational documentation. |

