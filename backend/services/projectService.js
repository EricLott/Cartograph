const { Project, Pillar, Decision, DecisionRelationship, AuditLog, sequelize } = require('../models');

const normalizeArray = (value) => {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined) return [];
    return [value];
};

const normalizeChatHistory = (chatHistory) => {
    if (!Array.isArray(chatHistory)) return [];
    return chatHistory
        .filter((msg) => msg && typeof msg === 'object')
        .map((msg) => {
            const role = typeof msg.role === 'string' ? msg.role : 'agent';
            const content = typeof msg.content === 'string' ? msg.content : String(msg.content ?? '');
            const cleaned = { role, content };
            if (msg.artifact && typeof msg.artifact === 'object') {
                cleaned.artifact = msg.artifact;
            }
            if (typeof msg.agentId === 'string') cleaned.agentId = msg.agentId;
            if (typeof msg.agentLabel === 'string') cleaned.agentLabel = msg.agentLabel;
            if (typeof msg.targetAgentId === 'string') cleaned.targetAgentId = msg.targetAgentId;
            if (typeof msg.targetAgentLabel === 'string') cleaned.targetAgentLabel = msg.targetAgentLabel;
            if (typeof msg.kind === 'string') cleaned.kind = msg.kind;
            if (typeof msg.status === 'string') cleaned.status = msg.status;
            if (typeof msg._id === 'string') cleaned._id = msg._id;
            return cleaned;
        });
};

const collectDecisionStats = (pillarNodes) => {
    let total = 0;
    let resolved = 0;
    let conflicted = 0;
    let featureCount = 0;

    const walk = (nodes) => {
        (nodes || []).forEach((node) => {
            (node.decisions || []).forEach((decision) => {
                total += 1;
                if (decision.answer) resolved += 1;
                if (decision.conflict) conflicted += 1;
                if (String(decision.id || '').startsWith('feat_')) featureCount += 1;
            });
            walk(node.subcategories || []);
        });
    };

    walk(pillarNodes || []);
    return { total, resolved, conflicted, featureCount };
};

const buildProjectOverviewMarkdown = (idea, pillars, chatHistory, projectId = 'local-draft') => {
    const stats = collectDecisionStats(pillars);
    const recentMessages = normalizeChatHistory(chatHistory).slice(-8);

    let md = `# Project Overview\n\n`;
    md += `- Project ID: ${projectId}\n`;
    md += `- Last Updated: ${new Date().toISOString()}\n`;
    md += `- Pillars: ${(pillars || []).length}\n`;
    md += `- Decisions: ${stats.total} (${stats.resolved} resolved, ${stats.total - stats.resolved} pending)\n`;
    md += `- Features: ${stats.featureCount}\n`;
    md += `- Conflicts: ${stats.conflicted}\n\n`;

    md += `## Product Idea\n\n${idea}\n\n`;
    md += `## Architecture Snapshot\n\n`;

    const writeNode = (node, depth = 0) => {
        const heading = '#'.repeat(Math.min(6, depth + 3));
        md += `${heading} ${node.title}\n\n`;
        if (node.description) md += `${node.description}\n\n`;

        const decisions = node.decisions || [];
        if (decisions.length > 0) {
            decisions.forEach((decision) => {
                const status = decision.conflict ? 'Conflict' : (decision.answer ? 'Resolved' : 'Pending');
                md += `- [${status}] **${decision.question || decision.id}**\n`;
                if (decision.context) md += `  - Context: ${decision.context}\n`;
                if (decision.answer) md += `  - Answer: ${decision.answer}\n`;
                if (decision.priority) md += `  - Priority: ${decision.priority}\n`;
                if (Array.isArray(decision.dependencies) && decision.dependencies.length > 0) {
                    md += `  - Dependencies: ${decision.dependencies.join(', ')}\n`;
                }
                if (decision.conflict) md += `  - Conflict: ${decision.conflict}\n`;
            });
            md += `\n`;
        }

        (node.subcategories || []).forEach((child) => writeNode(child, depth + 1));
    };

    (pillars || []).forEach((pillar) => writeNode(pillar, 0));

    md += `## Recent Conversation\n\n`;
    if (recentMessages.length === 0) {
        md += `No conversation history yet.\n`;
    } else {
        recentMessages.forEach((msg) => {
            const role = msg.role === 'agent'
                ? (msg.agentLabel || 'Agent')
                : (msg.targetAgentLabel ? `User -> ${msg.targetAgentLabel}` : 'User');
            md += `- **${role}:** ${msg.content}\n`;
        });
    }

    return md;
};

const buildDecisionPersistenceShape = (decisionInput = {}) => {
    const acceptanceCriteria = decisionInput.acceptance_criteria ?? decisionInput.acceptanceCriteria;
    const technicalContext = decisionInput.technical_context ?? decisionInput.technicalContext;

    return {
        question: decisionInput.question,
        icon: decisionInput.icon,
        context: decisionInput.context,
        answer: decisionInput.answer,
        conflict: decisionInput.conflict,
        rationale: decisionInput.rationale,
        constraints: decisionInput.constraints,
        tags: normalizeArray(decisionInput.tags),
        acceptanceCriteria: normalizeArray(acceptanceCriteria),
        technicalContext: technicalContext ?? null,
        dependencies: normalizeArray(decisionInput.dependencies),
        priority: decisionInput.priority ?? null,
        options: Array.isArray(decisionInput.options) ? decisionInput.options : null,
        rawData: decisionInput
    };
};

const buildDecisionResponseShape = (decisionRecord) => {
    const raw = decisionRecord.rawData && typeof decisionRecord.rawData === 'object' ? decisionRecord.rawData : {};
    const linked = decisionRecord.linkedTo ? decisionRecord.linkedTo.map(lt => ({
        id: lt.decisionId,
        type: lt.DecisionRelationship.type,
        strength: lt.DecisionRelationship.strength
    })) : [];

    return {
        ...raw,
        id: decisionRecord.decisionId,
        question: decisionRecord.question,
        icon: decisionRecord.icon,
        context: decisionRecord.context,
        answer: decisionRecord.answer,
        conflict: decisionRecord.conflict,
        rationale: decisionRecord.rationale,
        constraints: decisionRecord.constraints,
        tags: Array.isArray(decisionRecord.tags) ? decisionRecord.tags : [],
        acceptance_criteria: Array.isArray(decisionRecord.acceptanceCriteria)
            ? decisionRecord.acceptanceCriteria
            : normalizeArray(raw.acceptance_criteria ?? raw.acceptanceCriteria),
        technical_context: decisionRecord.technicalContext ?? raw.technical_context ?? raw.technicalContext ?? null,
        dependencies: Array.isArray(decisionRecord.dependencies)
            ? decisionRecord.dependencies
            : normalizeArray(raw.dependencies),
        priority: decisionRecord.priority ?? raw.priority ?? null,
        options: Array.isArray(decisionRecord.options) ? decisionRecord.options : (raw.options ?? null),
        links: linked
    };
};

const getProjectTree = async (projectId) => {
    const project = await Project.findByPk(projectId);
    if (!project) return null;

    const allPillars = await Pillar.findAll({
        where: { ProjectId: project.id },
        include: [{
            model: Decision,
            include: [{ model: Decision, as: 'linkedTo', through: DecisionRelationship }]
        }]
    });

    const buildPillarTree = (targetParentId = null) => {
        return (allPillars || [])
            .filter(p => {
                const pid = p.get('parentId');
                // Standardize null/undefined to null for comparison
                const currentParentId = pid === undefined ? null : pid;
                if (targetParentId === null) return currentParentId === null;
                return String(currentParentId) === String(targetParentId);
            })
            .map(p => ({
                id: p.pillarId,
                title: p.title,
                description: p.description,
                icon: p.icon,
                decisions: (p.Decisions || []).map(buildDecisionResponseShape),
                subcategories: buildPillarTree(p.id)
            }));
    };

    return {
        projectId: project.id,
        idea: project.idea,
        chatHistory: Array.isArray(project.chatHistory) ? project.chatHistory : [],
        projectOverview: typeof project.overviewMarkdown === 'string' ? project.overviewMarkdown : '',
        v2State: project.v2State && typeof project.v2State === 'object' ? project.v2State : {},
        pillars: buildPillarTree(null),
        createdAt: project.createdAt
    };
};

const saveProjectState = async (idea, pillars, projectId, isAgent = false, chatHistory = [], v2State = null) => {
    return await sequelize.transaction(async (t) => {
        let project;
        let action = 'CREATE_PROJECT';
        const normalizedChatHistory = normalizeChatHistory(chatHistory);
        if (projectId) {
            project = await Project.findByPk(projectId, { transaction: t });
            if (project) {
                const updateShape = {
                    idea,
                    chatHistory: normalizedChatHistory
                };
                if (v2State && typeof v2State === 'object') {
                    updateShape.v2State = v2State;
                }
                await project.update(updateShape, { transaction: t });
                action = 'UPDATE_PROJECT';
            }
        }

        if (!project) {
            project = await Project.create({
                idea,
                chatHistory: normalizedChatHistory,
                v2State: v2State && typeof v2State === 'object' ? v2State : {}
            }, { transaction: t });
        }

        const seenPillarIds = new Set();
        const seenDecisionIds = new Set();

        const upsertPillars = async (pillarsArray, parentDatabaseId = null) => {
            if (!pillarsArray || !Array.isArray(pillarsArray)) return;
            
            for (const p of pillarsArray) {
                if (!p.id) continue;
                
                let pillar = await Pillar.findOne({
                    where: { 
                        pillarId: p.id, 
                        ProjectId: project.id,
                        parentId: parentDatabaseId
                    },
                    transaction: t
                });

                if (pillar) {
                    await pillar.update({
                        title: p.title,
                        description: p.description,
                        icon: p.icon,
                        parentId: parentDatabaseId
                    }, { transaction: t });
                } else {
                    pillar = await Pillar.create({
                        pillarId: p.id,
                        title: p.title,
                        description: p.description,
                        icon: p.icon,
                        ProjectId: project.id,
                        parentId: parentDatabaseId
                    }, { transaction: t });
                }

                seenPillarIds.add(pillar.id);

                if (p.decisions) {
                    for (const d of p.decisions) {
                        const persistedShape = buildDecisionPersistenceShape(d);
                        let decision = await Decision.findOne({
                            where: { decisionId: d.id, PillarId: pillar.id },
                            transaction: t
                        });

                        if (decision) {
                            await decision.update({
                                ...persistedShape
                            }, { transaction: t });
                        } else {
                            decision = await Decision.create({
                                decisionId: d.id,
                                ...persistedShape,
                                PillarId: pillar.id
                            }, { transaction: t });
                        }
                        seenDecisionIds.add(decision.id);
                    }
                }

                if (p.subcategories && p.subcategories.length > 0) {
                    await upsertPillars(p.subcategories, pillar.id);
                }
            }
        };

        await upsertPillars(pillars);

        const projectOverview = buildProjectOverviewMarkdown(
            idea,
            pillars,
            normalizedChatHistory,
            project.id
        );
        await project.update({ overviewMarkdown: projectOverview }, { transaction: t });

        // Cleanup: remove decisions that are no longer in the provided tree
        await Decision.destroy({
            where: {
                PillarId: { [sequelize.Sequelize.Op.in]: Array.from(seenPillarIds) },
                id: { [sequelize.Sequelize.Op.notIn]: Array.from(seenDecisionIds) }
            },
            transaction: t
        });

        // Cleanup: remove pillars that are no longer in the provided tree
        await Pillar.destroy({
            where: {
                ProjectId: project.id,
                id: { [sequelize.Sequelize.Op.notIn]: Array.from(seenPillarIds) }
            },
            transaction: t
        });

        await AuditLog.create({
            action,
            summary: `${action === 'CREATE_PROJECT' ? 'Created' : 'Updated'} project state: ${idea.substring(0, 50)}...`,
            isAgent,
            ProjectId: project.id
        }, { transaction: t });

        return {
            projectId: project.id,
            projectOverview,
            v2State: project.v2State && typeof project.v2State === 'object' ? project.v2State : {}
        };
    });
};

const linkDecisions = async (fromDecisionId, toDecisionId, type, strength = 1.0) => {
    return await sequelize.transaction(async (t) => {
        const from = await Decision.findOne({ where: { decisionId: fromDecisionId }, transaction: t });
        const to = await Decision.findOne({ where: { decisionId: toDecisionId }, transaction: t });

        if (!from || !to) {
            throw new Error('One or both decisions not found.');
        }

        // Check if relationship already exists
        const existing = await DecisionRelationship.findOne({
            where: { fromId: from.id, toId: to.id },
            transaction: t
        });

        if (existing) {
            await existing.update({ type, strength }, { transaction: t });
            return existing;
        }

        return await DecisionRelationship.create({
            fromId: from.id,
            toId: to.id,
            type,
            strength
        }, { transaction: t });
    });
};

const getDecisionGraph = async (decisionId) => {
    const decision = await Decision.findOne({
        where: { decisionId },
        include: [
            { model: Decision, as: 'linkedTo' },
            { model: Decision, as: 'linkedBy' }
        ]
    });

    if (!decision) return null;

    return {
        decision: {
            id: decision.decisionId,
            question: decision.question,
            status: decision.answer ? 'resolved' : 'pending'
        },
        links: [
            ...(decision.linkedTo || []).map(lt => ({
                id: lt.decisionId,
                direction: 'out',
                type: lt.DecisionRelationship.type,
                strength: lt.DecisionRelationship.strength
            })),
            ...(decision.linkedBy || []).map(lb => ({
                id: lb.decisionId,
                direction: 'in',
                type: lb.DecisionRelationship.type,
                strength: lb.DecisionRelationship.strength
            }))
        ]
    };
};

module.exports = {
    getProjectTree,
    saveProjectState,
    linkDecisions,
    getDecisionGraph
};
