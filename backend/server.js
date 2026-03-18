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

Project.hasMany(Pillar);
Pillar.belongsTo(Project);
Pillar.hasMany(Decision);
Decision.belongsTo(Pillar);
Pillar.hasMany(Pillar, { as: 'subcategories', foreignKey: 'parentId' });
Pillar.belongsTo(Pillar, { as: 'parent', foreignKey: 'parentId' });

sequelize.sync({ alter: true }).then(() => console.log('Database synced')).catch(console.error);

app.post('/api/save-state', async (req, res) => {
    try {
        const { idea, pillars } = req.body;

        // Simple overwrite for prototyping: clear old data
        await Project.destroy({ where: {} });

        const project = await Project.create({ idea });

        const savePillars = async (pillarsArray, parentId = null) => {
            if (!pillarsArray) return;
            for (const p of pillarsArray) {
                const pillar = await Pillar.create({
                    pillarId: p.id,
                    title: p.title,
                    description: p.description,
                    ProjectId: project.id,
                    parentId: parentId
                });

                if (p.decisions) {
                    for (const d of p.decisions) {
                        await Decision.create({
                            decisionId: d.id,
                            question: d.question,
                            context: d.context,
                            answer: d.answer,
                            PillarId: pillar.id
                        });
                    }
                }

                if (p.subcategories && p.subcategories.length > 0) {
                    await savePillars(p.subcategories, pillar.id);
                }
            }
        };

        await savePillars(pillars);
        res.json({ success: true, projectId: project.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT}`);
});
