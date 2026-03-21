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
                // Targeted clear of project-specific children to rebuild from snapshot
                await Pillar.destroy({ where: { ProjectId: project.id }, transaction: t });
            }
        }

        if (!project) {
            project = await Project.create({ idea }, { transaction: t });
        }

        const savePillars = async (pillarsArray, parentId = null) => {
            if (!pillarsArray) return;
            for (const p of pillarsArray) {
                const pillar = await Pillar.create({
                    pillarId: p.id,
                    title: p.title,
                    description: p.description,
                    ProjectId: project.id,
                    parentId: parentId
                }, { transaction: t });

                if (p.decisions) {
                    for (const d of p.decisions) {
                        await Decision.create({
                            decisionId: d.id,
                            question: d.question,
                            context: d.context,
                            answer: d.answer,
                            conflict: d.conflict,
                            PillarId: pillar.id
                        }, { transaction: t });
                    }
                }

                if (p.subcategories && p.subcategories.length > 0) {
                    await savePillars(p.subcategories, pillar.id);
                }
            }
        };

        await savePillars(pillars);
        return project.id;
    });
};

module.exports = {
    getProjectTree,
    saveProjectState
};
