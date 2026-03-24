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
            return cleaned;
        });
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
        pillars: buildPillarTree(null),
        createdAt: project.createdAt
    };
};

const saveProjectState = async (idea, pillars, projectId, isAgent = false, chatHistory = []) => {
    return await sequelize.transaction(async (t) => {
        let project;
        let action = 'CREATE_PROJECT';
        const normalizedChatHistory = normalizeChatHistory(chatHistory);
        if (projectId) {
            project = await Project.findByPk(projectId, { transaction: t });
            if (project) {
                await project.update({ idea, chatHistory: normalizedChatHistory }, { transaction: t });
                action = 'UPDATE_PROJECT';
            }
        }

        if (!project) {
            project = await Project.create({ idea, chatHistory: normalizedChatHistory }, { transaction: t });
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

        return project.id;
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
