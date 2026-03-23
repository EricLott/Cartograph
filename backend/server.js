const express = require('express');
const cors = require('cors');
const db = require('./models');
const { sequelize } = db;
const projectRoutes = require('./routes/projectRoutes');
const agentRoutes = require('./routes/agentRoutes');

const models = { Project: db.Project, Pillar: db.Pillar, Decision: db.Decision, AuditLog: db.AuditLog };

const app = express();
app.use(cors());
app.use(express.json());

// Health check
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

// Routes
app.use('/api', projectRoutes);
app.use('/api', agentRoutes);

const PORT = Number(process.env.PORT || 3000);

const startServer = () => {
    sequelize.sync({ alter: true })
        .then(() => console.log('Database synced'))
        .catch(console.error);
    
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
    models,
    startServer
};
