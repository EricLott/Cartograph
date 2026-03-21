import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const checkAllAnswered = () => {
    // We now allow exporting even with unanswered decisions, 
    // as they will be tagged as blockers/risks in the tasks.
    return true; 
};

export const generateBlueprintZip = async (pillars, metadata = {}) => {
    if (!pillars || pillars.length === 0) {
        throw new Error("Cannot export blueprint. No architecture pillars defined. Describe your application idea first.");
    }

    if (!checkAllAnswered()) {
        throw new Error("Cannot export blueprint. There are unanswered decisions in the architecture. Please answer all decisions before exporting.");
    }

    const zip = new JSZip();
    const root = zip.folder("agent-pack");

    // 0. Root Manifest (Metadata)
    const manifest = {
        projectId: metadata.projectId || 'local-draft',
        version: metadata.version || '1.0.0',
        exportTime: new Date().toISOString(),
        pillarCount: pillars.length
    };
    root.file("cartograph-manifest.json", JSON.stringify(manifest, null, 2));

    // 1. 00-context
    const context = root.folder("00-context");
    const visionContent = `# Vision\n\n## Purpose\nDefine the strategic contract for the application so all architecture and execution artifacts remain aligned.\n\n## Application Idea\n${pillars.map(p => p.title).join(', ')} focused application.\n\n## Core Promise\nDeliver a high-quality implementation of the architectural pillars defined below.`;
    context.file("vision.md", visionContent);
    context.file("business-goals.md", "# Business Goals\n\n- TBD: Define key business objectives.");
    context.file("constraints.md", "# Constraints\n\n- TBD: Define technical or business constraints.");
    context.file("assumptions.md", "# Assumptions\n\n- TBD: Record execution assumptions.");

    // 2. 01-architecture
    const arch = root.folder("01-architecture");
    let archSummary = "# Architecture Summary\n\n## Pillars\n";
    pillars.forEach(p => {
        archSummary += `### ${p.title}\n${p.description}\n\n`;
    });
    arch.file("architecture-summary.md", archSummary);

    // 3. 02-execution
    const exec = root.folder("02-execution");
    exec.file("implementation-strategy.md", "# Implementation Strategy\n\n## Sequencing\n1. Foundation and Core Services\n2. Integration and API hardening\n3. Feature rollout\n4. Quality and CI Enforcement");

    let depMap = "# Dependency Map\n\n## Task Nodes\n";
    let depEdges = "## Dependency Edges\n";
    let taskCount = 1;
    const taskFiles = [];

    const processPillarTasks = (ps, parentTaskId = null, parentPath = "") => {
        ps.forEach(p => {
            const taskId = `task-${String(taskCount++).padStart(3, '0')}`;
            const slug = p.title.replace(/\s+/g, '-').toLowerCase();
            const fileName = `${taskId}-${slug}.md`;

            const deps = parentTaskId ? `["${parentTaskId}"]` : "[]";
            let taskMd = `---\nid: ${taskId}\ntitle: ${p.title}\ntype: task\nstatus: todo\npriority: P1\nowner: TBD\ndepends_on: ${deps}\nlast_updated: ${new Date().toISOString().slice(0, 10)}\n---\n\n`;
            taskMd += `# Task: ${p.title}\n\n## Goal\n${p.description}\n\n`;

            // Build Acceptance Criteria
            taskMd += `## Acceptance Criteria\n`;
            taskMd += `- Satisfy the core pillar goal: ${p.description}\n`;
            
            if (p.decisions && p.decisions.length > 0) {
                p.decisions.forEach(d => {
                    const ans = d.answer?.trim();
                    const isUnresolved = !ans || ans === 'Pending Resolution';
                    if (isUnresolved) {
                        taskMd += `- [BLOCKER] Resolve decision for question: **${d.question}** before final implementation.\n`;
                    } else {
                        taskMd += `- Implement decision: **${d.question}** as per answer choice: *${ans}*\n`;
                    }
                });
            }
            taskMd += `\n`;

            // Build Evidence Required
            taskMd += `## Evidence Required\n`;
            taskMd += `- [ ] Proof of implementation for ${p.title} matching architectural intent.\n`;
            if (p.decisions && p.decisions.length > 0) {
                p.decisions.forEach(d => {
                   const ans = d.answer?.trim();
                   if (ans && ans !== 'Pending Resolution') {
                       taskMd += `  - [ ] Decision satisfied: ${d.question}\n`;
                   }
                });
            }
            taskMd += `\n`;

            taskFiles.push({ name: fileName, content: taskMd });
            depMap += `- ${taskId}: ${p.title}\n`;
            if (parentTaskId) {
                depEdges += `- ${taskId} depends on ${parentTaskId}\n`;
            }

            if (p.subcategories && p.subcategories.length > 0) {
                processPillarTasks(p.subcategories, taskId, `${parentPath}${p.title} > `);
            }
        });
    };

    processPillarTasks(pillars);
    exec.file("dependency-map.md", `${depMap}\n${depEdges}`);

    // 4. 03-agent-ops
    const ops = root.folder("03-agent-ops");
    ops.file("AGENTS.md", "# AGENTS Operating Contract\n\nStandard operating procedures for autonomous contributors. Follow the Cartograph canonical workflow.");
    
    // SECURITY.md template
    const securityMd = `# Security Policy

## Reporting a Vulnerability

Security is a first-class concern for Cartograph-generated blueprints. 
If you discover a security vulnerability in this implementation, please report it via the project owner's established security channel.

## Guardrails

- All agent contributions must undergo security review.
- Secrets must never be committed to the repository.
- Use a secrets management service for all environment-specific sensitive data.
- Ensure dependency scanning is enabled.
`;
    ops.file("SECURITY.md", securityMd);

    // 5. 04-task-system
    const system = root.folder("04-task-system");
    system.file("README.md", "# Task System Contract\n\nDefines the status-folder lifecycle and metadata schema for all backlog items.");
    const todo = system.folder("tasks/todo");
    taskFiles.forEach(tf => todo.file(tf.name, tf.content));

    // 6. 05-state
    const state = root.folder("05-state");
    state.file("progress-log.md", "# Progress Log\n\nInitial log seeded. No tasks completed yet.");

    // 7. 06-research & 07-artifacts
    root.folder("06-research");
    root.folder("07-artifacts");

    // FINAL AUDIT: Ensure no sensitive data from localStorage or environment is captured.
    // The export strictly uses provided 'pillars' and 'metadata' arguments.
    // It does not access global state, localStorage, or process.env during zip generation.

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "Cartograph_AgentPack.zip");
};

