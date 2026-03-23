process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = ':memory:';

const request = require('supertest');
const { app, sequelize, models } = require('../../server');
const { AuditLog } = models;

describe('Audit Trail Integration', () => {
    beforeEach(async () => {
        await sequelize.sync({ force: true });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    test('creates an audit log entry on POST /api/save-state (new project)', async () => {
        const payload = {
            idea: 'Audit Test Project',
            pillars: [],
            isAgent: true
        };

        const response = await request(app)
            .post('/api/save-state')
            .send(payload);

        expect(response.status).toBe(200);
        
        const logs = await AuditLog.findAll();
        expect(logs).toHaveLength(1);
        expect(logs[0].action).toBe('CREATE_PROJECT');
        expect(logs[0].isAgent).toBe(true);
        expect(logs[0].ProjectId).toBe(response.body.projectId);
        expect(logs[0].summary).toContain('Audit Test Project');
    });

    test('creates an audit log entry on POST /api/save-state (update project)', async () => {
        // Initial save
        const first = await request(app)
            .post('/api/save-state')
            .send({ idea: 'Initial', pillars: [] });
        
        const projectId = first.body.projectId;

        // Update
        const response = await request(app)
            .post('/api/save-state')
            .send({ 
                idea: 'Updated Idea', 
                pillars: [], 
                projectId, 
                isAgent: false 
            });

        expect(response.status).toBe(200);

        const logs = await AuditLog.findAll({ where: { action: 'UPDATE_PROJECT' } });
        expect(logs).toHaveLength(1);
        expect(logs[0].isAgent).toBe(false);
        expect(logs[0].ProjectId).toBe(projectId);
        expect(logs[0].summary).toContain('Updated Idea');
    });

    test('logic ensures agent-driven saves are explicitly flagged', async () => {
        // Agent save
        await request(app)
            .post('/api/save-state')
            .send({ idea: 'Agent Work', pillars: [], isAgent: true });

        // Manual save (explicit)
        await request(app)
            .post('/api/save-state')
            .send({ idea: 'Manual Work', pillars: [], isAgent: false });

        // Manual save (default)
        await request(app)
            .post('/api/save-state')
            .send({ idea: 'Manual Default', pillars: [] });

        const logs = await AuditLog.findAll({ order: [['id', 'ASC']] });
        expect(logs).toHaveLength(3);
        expect(logs[0].isAgent).toBe(true);
        expect(logs[1].isAgent).toBe(false);
        expect(logs[2].isAgent).toBe(false);
    });
});
