const { Project, Pillar, Decision, DecisionRelationship, AuditLog, sequelize } = require('../models');

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

    const buildPillarTree = (parentId = null) => {
        return allPillars
            .filter(p => p.parentId === parentId)
            .map(p => ({
                id: p.pillarId,
                title: p.title,
                description: p.description,
                decisions: p.Decisions.map(d => ({
                    id: d.decisionId,
                    question: d.question,
                    context: d.context,
                    answer: d.answer,
                    conflict: d.conflict,
                    rationale: d.rationale,
                    constraints: d.constraints,
                    tags: d.tags,
                    links: d.linkedTo ? d.linkedTo.map(lt => ({
                        id: lt.decisionId,
                        type: lt.DecisionRelationship.type,
                        strength: lt.DecisionRelationship.strength
                    })) : []
                })),
                subcategories: buildPillarTree(p.id)
            }));
    };

    return {
        projectId: project.id,
        idea: project.idea,
        pillars: buildPillarTree(null),
        createdAt: project.createdAt
    };
};

const saveProjectState = async (idea, pillars, projectId, isAgent = false) => {
    return await sequelize.transaction(async (t) => {
        let project;
        let action = 'CREATE_PROJECT';
        if (projectId) {
            project = await Project.findByPk(projectId, { transaction: t });
            if (project) {
                await project.update({ idea }, { transaction: t });
                action = 'UPDATE_PROJECT';
            }
        }

        if (!project) {
            project = await Project.create({ idea }, { transaction: t });
        }

        const seenPillarIds = new Set();
        const seenDecisionIds = new Set();

        const upsertPillars = async (pillarsArray, parentDatabaseId = null) => {
            if (!pillarsArray) return;
            for (const p of pillarsArray) {
                let pillar = await Pillar.findOne({
                    where: { pillarId: p.id, ProjectId: project.id },
                    transaction: t
                });

                if (pillar) {
                    await pillar.update({
                        title: p.title,
                        description: p.description,
                        parentId: parentDatabaseId
                    }, { transaction: t });
                } else {
                    pillar = await Pillar.create({
                        pillarId: p.id,
                        title: p.title,
                        description: p.description,
                        ProjectId: project.id,
                        parentId: parentDatabaseId
                    }, { transaction: t });
                }

                seenPillarIds.add(pillar.id);

                if (p.decisions) {
                    for (const d of p.decisions) {
                        let decision = await Decision.findOne({
                            where: { decisionId: d.id, PillarId: pillar.id },
                            transaction: t
                        });

                        if (decision) {
                            await decision.update({
                                question: d.question,
                                context: d.context,
                                answer: d.answer,
                                conflict: d.conflict,
                                rationale: d.rationale,
                                constraints: d.constraints,
                                tags: d.tags
                            }, { transaction: t });
                        } else {
                            decision = await Decision.create({
                                decisionId: d.id,
                                question: d.question,
                                context: d.context,
                                answer: d.answer,
                                conflict: d.conflict,
                                rationale: d.rationale,
                                constraints: d.constraints,
                                tags: d.tags,
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
        // Only scope to pillars that were processed in this update
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
