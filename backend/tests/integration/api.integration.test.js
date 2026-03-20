process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = ':memory:';

const request = require('supertest');
const { app, sequelize, models } = require('../../server');

const { Project, Pillar, Decision } = models;

const buildInitialPayload = () => ({
    idea: 'AI-assisted architecture planner',
    pillars: [
        {
            id: 'pillar-data',
            title: 'Data',
            description: 'Persistence design',
            decisions: [
                {
                    id: 'dec-db',
                    question: 'Primary datastore?',
                    context: 'Needs transactional safety',
                    answer: 'MySQL'
                }
            ],
            subcategories: [
                {
                    id: 'cat-backup',
                    title: 'Backups',
                    description: 'Backup strategy',
                    decisions: [
                        {
                            id: 'dec-backup',
                            question: 'Backup cadence?',
                            context: 'RPO target',
                            answer: 'Hourly'
                        }
                    ],
                    subcategories: []
                }
            ]
        }
    ]
});

describe('Backend integration: persistence, rollback, and health', () => {
    beforeEach(async () => {
        await sequelize.sync({ force: true });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    test('persists state and returns correct nested structure from latest project', async () => {
        const saveResponse = await request(app)
            .post('/api/save-state')
            .send(buildInitialPayload());

        expect(saveResponse.status).toBe(200);
        expect(saveResponse.body.success).toBe(true);
        expect(saveResponse.body.projectId).toBeDefined();

        const latestResponse = await request(app).get('/api/projects/latest');
        expect(latestResponse.status).toBe(200);
        expect(latestResponse.body.idea).toBe('AI-assisted architecture planner');
        expect(Array.isArray(latestResponse.body.pillars)).toBe(true);
        expect(latestResponse.body.pillars).toHaveLength(1);

        const [rootPillar] = latestResponse.body.pillars;
        expect(rootPillar.title).toBe('Data');
        expect(rootPillar.decisions).toHaveLength(1);
        expect(rootPillar.subcategories).toHaveLength(1);
        expect(rootPillar.subcategories[0].title).toBe('Backups');
        expect(rootPillar.subcategories[0].decisions[0].answer).toBe('Hourly');

        const specificProjectResponse = await request(app).get(`/api/projects/${saveResponse.body.projectId}`);
        expect(specificProjectResponse.status).toBe(200);
        expect(specificProjectResponse.body.projectId).toBe(saveResponse.body.projectId);
    });

    test('updates existing project snapshot and replaces prior nested children', async () => {
        const firstSave = await request(app)
            .post('/api/save-state')
            .send(buildInitialPayload());

        expect(firstSave.status).toBe(200);

        const secondPayload = {
            idea: 'AI-assisted architecture planner v2',
            projectId: firstSave.body.projectId,
            pillars: [
                {
                    id: 'pillar-security',
                    title: 'Security',
                    description: 'Identity and access',
                    decisions: [
                        {
                            id: 'dec-auth',
                            question: 'Auth pattern?',
                            context: 'User access control',
                            answer: 'OIDC'
                        }
                    ],
                    subcategories: []
                }
            ]
        };

        const secondSave = await request(app)
            .post('/api/save-state')
            .send(secondPayload);

        expect(secondSave.status).toBe(200);
        expect(secondSave.body.projectId).toBe(firstSave.body.projectId);

        const projectCount = await Project.count();
        const pillarCount = await Pillar.count();
        const decisionCount = await Decision.count();

        expect(projectCount).toBe(1);
        expect(pillarCount).toBe(1);
        expect(decisionCount).toBe(1);

        const latestResponse = await request(app).get('/api/projects/latest');
        expect(latestResponse.body.idea).toBe('AI-assisted architecture planner v2');
        expect(latestResponse.body.pillars[0].title).toBe('Security');
        expect(latestResponse.body.pillars[0].decisions[0].answer).toBe('OIDC');
    });

    test('rolls back nested write transaction when a decision write fails', async () => {
        const originalCreate = Decision.create.bind(Decision);
        const failingQuestion = 'Trigger rollback failure';
        const createSpy = jest.spyOn(Decision, 'create').mockImplementation(async (values, options) => {
            if (values.question === failingQuestion) {
                throw new Error('Simulated nested write failure');
            }
            return originalCreate(values, options);
        });

        const baselineProjectCount = await Project.count();
        const baselinePillarCount = await Pillar.count();
        const baselineDecisionCount = await Decision.count();

        const response = await request(app)
            .post('/api/save-state')
            .send({
                idea: 'Rollback validation project',
                pillars: [
                    {
                        id: 'pillar-failure',
                        title: 'Failure path',
                        description: 'Used for rollback test',
                        decisions: [
                            {
                                id: 'dec-ok',
                                question: 'Normal decision',
                                context: 'Should be rolled back if later step fails',
                                answer: 'ok'
                            },
                            {
                                id: 'dec-fail',
                                question: failingQuestion,
                                context: 'Forces transaction failure',
                                answer: 'fail'
                            }
                        ],
                        subcategories: []
                    }
                ]
            });

        createSpy.mockRestore();

        expect(response.status).toBe(500);
        expect(response.body.error).toContain('Simulated nested write failure');

        expect(await Project.count()).toBe(baselineProjectCount);
        expect(await Pillar.count()).toBe(baselinePillarCount);
        expect(await Decision.count()).toBe(baselineDecisionCount);
    });

    test('returns health DOWN when database authentication fails', async () => {
        const authSpy = jest.spyOn(sequelize, 'authenticate').mockRejectedValue(new Error('db unavailable'));

        const response = await request(app).get('/api/health');

        expect(response.status).toBe(503);
        expect(response.body.status).toBe('DOWN');
        expect(response.body.database).toBe('DISCONNECTED');
        expect(response.body.error).toContain('db unavailable');

        authSpy.mockRestore();
    });

    test('returns health UP when database authentication succeeds', async () => {
        const response = await request(app).get('/api/health');

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('UP');
        expect(response.body.database).toBe('CONNECTED');
        expect(typeof response.body.timestamp).toBe('string');
    });
});
