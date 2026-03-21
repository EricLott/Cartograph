const { Project, Pillar, Decision, sequelize } = require('../models');

const getProjectTree = async (projectId) => {
    const project = await Project.findByPk(projectId);
    if (!project) return null;

    const allPillars = await Pillar.findAll({
        where: { ProjectId: project.id },
        include: [Decision]
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
                    conflict: d.conflict
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

const saveProjectState = async (idea, pillars, projectId) => {
    return await sequelize.transaction(async (t) => {
        let project;
        if (projectId) {
            project = await Project.findByPk(projectId, { transaction: t });
            if (project) {
                await project.update({ idea }, { transaction: t });
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
                                conflict: d.conflict
                            }, { transaction: t });
                        } else {
                            decision = await Decision.create({
                                decisionId: d.id,
                                question: d.question,
                                context: d.context,
                                answer: d.answer,
                                conflict: d.conflict,
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

        return project.id;
    });
};

module.exports = {
    getProjectTree,
    saveProjectState
};
