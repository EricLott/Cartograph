process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = ':memory:';

const request = require('supertest');
const { app, sequelize, models } = require('../../server');
const { Project, Pillar, Decision } = models;

describe('Upsert persistence strategy', () => {
    beforeEach(async () => {
        await sequelize.sync({ force: true });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    test('preserves createdAt timestamps for existing pillars and decisions', async () => {
        const initialPayload = {
            idea: 'Initial Idea',
            pillars: [
                {
                    id: 'p1',
                    title: 'Pillar 1',
                    description: 'Desc 1',
                    decisions: [
                        {
                            id: 'd1',
                            question: 'Q1',
                            context: 'C1',
                            answer: 'A1'
                        }
                    ],
                    subcategories: []
                }
            ]
        };

        const firstSave = await request(app).post('/api/save-state').send(initialPayload);
        const projectId = firstSave.body.projectId;

        const firstPillar = await Pillar.findOne({ where: { pillarId: 'p1', ProjectId: projectId } });
        const firstDecision = await Decision.findOne({ where: { decisionId: 'd1', PillarId: firstPillar.id } });

        const initialPillarCreatedAt = firstPillar.createdAt.getTime();
        const initialDecisionCreatedAt = firstDecision.createdAt.getTime();

        // Wait a bit to ensure timestamps would differ if recreated
        await new Promise(resolve => setTimeout(resolve, 100));

        const updatePayload = {
            idea: 'Updated Idea',
            projectId: projectId,
            pillars: [
                {
                    id: 'p1',
                    title: 'Pillar 1 Updated',
                    description: 'Desc 1 Updated',
                    decisions: [
                        {
                            id: 'd1',
                            question: 'Q1 Updated',
                            context: 'C1 Updated',
                            answer: 'A1 Updated'
                        }
                    ],
                    subcategories: []
                }
            ]
        };

        const secondSave = await request(app).post('/api/save-state').send(updatePayload);
        expect(secondSave.status).toBe(200);

        const updatedPillar = await Pillar.findOne({ where: { pillarId: 'p1', ProjectId: projectId } });
        const updatedDecision = await Decision.findOne({ where: { decisionId: 'd1', PillarId: updatedPillar.id } });

        expect(updatedPillar.title).toBe('Pillar 1 Updated');
        expect(updatedDecision.question).toBe('Q1 Updated');

        // These should be EQUAL if upsert worked correctly, and DIFFERENT if destroy+create happened
        expect(updatedPillar.createdAt.getTime()).toBe(initialPillarCreatedAt);
        expect(updatedDecision.createdAt.getTime()).toBe(initialDecisionCreatedAt);
    });

    test('removes pillars and decisions that are missing from the update', async () => {
         const initialPayload = {
            idea: 'Initial Idea',
            pillars: [
                {
                    id: 'p1',
                    title: 'Pillar 1',
                    decisions: [{ id: 'd1', question: 'Q1', answer: 'A1' }],
                    subcategories: []
                },
                {
                    id: 'p2',
                    title: 'Pillar 2',
                    decisions: [],
                    subcategories: []
                }
            ]
        };

        const firstSave = await request(app).post('/api/save-state').send(initialPayload);
        const projectId = firstSave.body.projectId;

        expect(await Pillar.count({ where: { ProjectId: projectId } })).toBe(2);
        expect(await Decision.count()).toBe(1);

        const updatePayload = {
            idea: 'Idea',
            projectId: projectId,
            pillars: [
                {
                    id: 'p1',
                    title: 'Pillar 1',
                    decisions: [], // d1 removed
                    subcategories: []
                }
                // p2 removed
            ]
        };

        await request(app).post('/api/save-state').send(updatePayload);

        expect(await Pillar.count({ where: { ProjectId: projectId } })).toBe(1);
        expect(await Decision.count()).toBe(0);
    });
});
