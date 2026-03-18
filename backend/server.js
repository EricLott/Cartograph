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
    options: { type: DataTypes.JSON },
    answer: { type: DataTypes.STRING }
});

Project.hasMany(Pillar);
Pillar.belongsTo(Project);
Pillar.hasMany(Decision);
Decision.belongsTo(Pillar);

sequelize.sync({ alter: true }).then(() => console.log('Database synced')).catch(console.error);

app.post('/api/save-state', async (req, res) => {
    try {
        const { idea, pillars } = req.body;

        // Simple overwrite for prototyping: clear old data
        await Project.destroy({ where: {} });

        const project = await Project.create({ idea });

        for (const p of pillars) {
            const pillar = await Pillar.create({
                pillarId: p.id,
                title: p.title,
                description: p.description,
                ProjectId: project.id
            });
            for (const d of p.decisions) {
                await Decision.create({
                    decisionId: d.id,
                    question: d.question,
                    context: d.context,
                    options: d.options,
                    answer: d.answer,
                    PillarId: pillar.id
                });
            }
        }
        res.json({ success: true, projectId: project.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT}`);
});
