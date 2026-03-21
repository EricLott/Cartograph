import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const checkAllAnswered = (nodes) => {
    return nodes.every(p => {
        const parentAns = p.decisions ? p.decisions.every(d => d.answer !== null && d.answer !== "") : true;
        const childAns = (p.subcategories && p.subcategories.length > 0) ? checkAllAnswered(p.subcategories) : true;
        return parentAns && childAns;
    });
};

export const generateBlueprintZip = async (pillars) => {
    if (!pillars || pillars.length === 0) {
        throw new Error("Cannot export blueprint. No architecture pillars defined. Describe your application idea first.");
    }

    if (!checkAllAnswered(pillars)) {
        throw new Error("Cannot export blueprint. There are unanswered decisions in the architecture. Please answer all decisions before exporting.");
    }

    const zip = new JSZip();
    const root = zip.folder("agent-pack");

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

            if (p.decisions && p.decisions.length > 0) {
                taskMd += `## Decisions to Implement\n`;
                p.decisions.forEach(d => {
                    taskMd += `- [ ] **${d.question}**: ${d.answer || 'Pending Resolution'}\n`;
                    if (d.context) taskMd += `  - *Context*: ${d.context}\n`;
                });
            }

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

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "Cartograph_AgentPack.zip");
};
