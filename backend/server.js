const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
app.use(cors());
app.use(express.json());

const sequelize = new Sequelize(
    process.env.DB_NAME || 'cartograph_db',
    process.env.DB_USER || 'cartograph',
    process.env.DB_PASSWORD || 'cartograph_pass',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false
    }
);

const Project = sequelize.define('Project', {
    idea: { type: DataTypes.TEXT, allowNull: false },
});

const Pillar = sequelize.define('Pillar', {
    pillarId: { type: DataTypes.STRING },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
});

const Decision = sequelize.define('Decision', {
    decisionId: { type: DataTypes.STRING },
    question: { type: DataTypes.STRING, allowNull: false },
    context: { type: DataTypes.TEXT },
    answer: { type: DataTypes.STRING }
});

Project.hasMany(Pillar, { onDelete: 'CASCADE' });
Pillar.belongsTo(Project);
Pillar.hasMany(Decision, { onDelete: 'CASCADE' });
Decision.belongsTo(Pillar);
Pillar.hasMany(Pillar, { as: 'subcategories', foreignKey: 'parentId', onDelete: 'CASCADE' });
Pillar.belongsTo(Pillar, { as: 'parent', foreignKey: 'parentId' });

sequelize.sync({ alter: true }).then(() => console.log('Database synced')).catch(console.error);

app.post('/api/save-state', async (req, res) => {
    try {
        const { idea, pillars, projectId } = req.body;

        const validateRequest = (reqBody) => {
            const { idea, pillars } = reqBody;
            if (!idea || typeof idea !== 'string' || !idea.trim()) {
                throw { status: 400, message: 'Missing or empty idea.' };
            }
            if (!Array.isArray(pillars)) {
                throw { status: 400, message: 'pillars must be an array.' };
            }

            const validatePillars = (ps) => {
                for (const p of ps) {
                    if (!p.title || typeof p.title !== 'string' || !p.title.trim()) {
                        throw { status: 400, message: 'Pillar is missing a valid title.' };
                    }
                    if (p.decisions && !Array.isArray(p.decisions)) {
                        throw { status: 400, message: 'Decisions must be an array.' };
                    }
                    if (p.decisions) {
                        for (const d of p.decisions) {
                            if (!d.question || typeof d.question !== 'string' || !d.question.trim()) {
                                throw { status: 400, message: 'Decision is missing a valid question.' };
                            }
                        }
                    }
                    if (p.subcategories && !Array.isArray(p.subcategories)) {
                        throw { status: 400, message: 'Pillar subcategories must be an array.' };
                    }
                    if (p.subcategories) validatePillars(p.subcategories);
                }
            };
            validatePillars(pillars);
        };

        try {
            validateRequest(req.body);
        } catch (vErr) {
            if (vErr.status) {
                return res.status(vErr.status).json({ error: vErr.message });
            }
            throw vErr;
        }

        const resultId = await sequelize.transaction(async (t) => {
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

        res.json({ success: true, projectId: resultId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT}`);
});
