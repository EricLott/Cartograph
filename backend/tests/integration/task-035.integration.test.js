process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = ':memory:';

const request = require('supertest');
const { app, sequelize } = require('../../server');
const { DecisionRelationship } = require('../../models');

describe('Task-035: Decision Relationships Integration', () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    test('should save and retrieve decisions with new semantic fields', async () => {
        const payload = {
            idea: 'Test Project',
            pillars: [{
                id: 'p1',
                title: 'Core Pillar',
                description: 'A very important pillar for testing.',
                decisions: [{
                    id: 'd1',
                    question: 'Question 1?',
                    answer: 'Answer 1',
                    rationale: 'Because we need it.',
                    constraints: 'Must be fast.',
                    tags: ['critical', 'backend']
                }]
            }]
        };

        const res = await request(app)
            .post('/api/save-state')
            .send(payload);

        expect(res.status).toBe(200);

        const projectRes = await request(app).get('/api/projects/latest');
        const decision = projectRes.body.pillars[0].decisions[0];

        expect(decision.rationale).toBe('Because we need it.');
        expect(decision.constraints).toBe('Must be fast.');
        expect(decision.tags).toContain('critical');
    });

    test('should link two decisions and retrieve their relationship', async () => {
        // Create another decision
        const payload = {
            idea: 'Test Project',
            pillars: [{
                id: 'p1',
                title: 'Core Pillar',
                description: 'A very important pillar for testing.',
                decisions: [
                    { id: 'd1', question: 'Question 1?', answer: 'Answer 1' },
                    { id: 'd2', question: 'Question 2?', answer: 'Answer 2' }
                ]
            }]
        };

        await request(app).post('/api/save-state').send(payload);

        // Link d1 -> d2
        const linkRes = await request(app)
            .post('/api/decisions/d1/link')
            .send({ toId: 'd2', type: 'depends_on', strength: 0.8 });

        expect(linkRes.status).toBe(200);

        // Check project tree for links
        const projectRes = await request(app).get('/api/projects/latest');
        const d1 = projectRes.body.pillars[0].decisions.find(d => d.id === 'd1');
        
        expect(d1.links).toHaveLength(1);
        expect(d1.links[0].id).toBe('d2');
        expect(d1.links[0].type).toBe('depends_on');
        expect(d1.links[0].strength).toBe(0.8);
    });

    test('should retrieve decision graph neighbors', async () => {
        const graphRes = await request(app).get('/api/decisions/d1/graph');
        expect(graphRes.status).toBe(200);
        expect(graphRes.body.links).toContainEqual(expect.objectContaining({
            id: 'd2',
            direction: 'out',
            type: 'depends_on'
        }));

        const graphRes2 = await request(app).get('/api/decisions/d2/graph');
        expect(graphRes2.body.links).toContainEqual(expect.objectContaining({
            id: 'd1',
            direction: 'in',
            type: 'depends_on'
        }));
    });
});
