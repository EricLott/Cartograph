const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
app.use(cors());
app.use(express.json());

const createSequelize = () => {
    const dialect = process.env.DB_DIALECT || 'mysql';

    if (dialect === 'sqlite') {
        return new Sequelize({
            dialect: 'sqlite',
            storage: process.env.DB_STORAGE || ':memory:',
            logging: false
        });
    }

    return new Sequelize(
        process.env.DB_NAME || 'cartograph_db',
        process.env.DB_USER || 'cartograph',
        process.env.DB_PASSWORD || 'cartograph_pass',
        {
            host: process.env.DB_HOST || 'localhost',
            dialect: 'mysql',
            logging: false
        }
    );
};

const sequelize = createSequelize();

app.get('/api/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.status(200).json({
            status: 'UP',
            database: 'CONNECTED',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(503).json({
            status: 'DOWN',
            database: 'DISCONNECTED',
            error: err.message,
            timestamp: new Date().toISOString()
        });
    }
});


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
                    answer: d.answer
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

app.get('/api/projects', async (req, res) => {
    try {
        const projects = await Project.findAll({
            attributes: ['id', 'idea', 'createdAt'],
            order: [['createdAt', 'DESC']]
        });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/projects/latest', async (req, res) => {
    try {
        const project = await Project.findOne({ order: [['createdAt', 'DESC']] });
        if (!project) return res.json({});
        const tree = await getProjectTree(project.id);
        res.json(tree);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/projects/:id', async (req, res) => {
    try {
        const tree = await getProjectTree(req.params.id);
        if (!tree) return res.status(404).json({ error: 'Project not found' });
        res.json(tree);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/projects/:id', async (req, res) => {
    try {
        const deleted = await Project.destroy({ where: { id: req.params.id } });
        if (!deleted) return res.status(404).json({ error: 'Project not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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

const PORT = Number(process.env.PORT || 3000);

const startServer = () => {
    sequelize.sync({ alter: true }).then(() => console.log('Database synced')).catch(console.error);
    return app.listen(PORT, () => {
        console.log(`Backend listening on port ${PORT}`);
    });
};

if (require.main === module) {
    startServer();
}

module.exports = {
    app,
    sequelize,
    models: {
        Project,
        Pillar,
        Decision
    },
    startServer
};
