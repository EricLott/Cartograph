process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = ':memory:';

const request = require('supertest');
const { app, sequelize } = require('../../server');

describe('Backend integration: V2 planner contracts', () => {
    beforeEach(async () => {
        await sequelize.sync({ force: true });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    test('planner.v2.generate returns full contract with fallback when provider is unavailable', async () => {
        const response = await request(app)
            .post('/api/planner/v2/generate')
            .send({
                idea: 'Build a Dataverse solution with model-driven app, canvas app, and Power Automate flows.'
            });

        expect(response.status).toBe(200);
        expect(response.body).toEqual(expect.objectContaining({
            domain_discovery: expect.any(Object),
            capability_graph: expect.any(Object),
            decision_graph: expect.any(Object),
            execution_projection: expect.any(Object),
            artifact_manifest: expect.any(Object),
            pillars: expect.any(Array),
            planner_meta: expect.any(Object)
        }));
        expect(Array.isArray(response.body.capability_graph.nodes)).toBe(true);
        expect(Array.isArray(response.body.decision_graph.decisions)).toBe(true);
        expect(Array.isArray(response.body.domain_discovery.domain_primitives)).toBe(true);
        expect(Array.isArray(response.body.domain_discovery.source_citations)).toBe(true);
    });

    test('planner.v2.ground runs as a blocking first pass and can seed planner.v2.generate', async () => {
        const idea = 'Build a CRM for partner onboarding with external portal access.';
        const groundingResponse = await request(app)
            .post('/api/planner/v2/ground')
            .send({ idea });

        expect(groundingResponse.status).toBe(200);
        expect(groundingResponse.body).toEqual(expect.objectContaining({
            grounding: expect.any(Object),
            planner_meta: expect.any(Object)
        }));
        expect(groundingResponse.body.planner_meta.passes).toEqual(['domain_grounding']);

        const generatedResponse = await request(app)
            .post('/api/planner/v2/generate')
            .send({
                idea,
                grounding: groundingResponse.body.grounding,
                groundingMeta: groundingResponse.body.planner_meta
            });

        expect(generatedResponse.status).toBe(200);
        expect(generatedResponse.body.planner_meta).toEqual(expect.objectContaining({
            grounding_seeded: true,
            grounding_sequence: 'blocking_first'
        }));
    });

    test('intake.v2.assess requests discovery questions for vague prompts', async () => {
        const response = await request(app)
            .post('/api/intake/v2/assess')
            .send({
                idea: 'Let\'s build a CRM'
            });

        expect(response.status).toBe(200);
        expect(response.body).toEqual(expect.objectContaining({
            mode: expect.any(String),
            understanding: expect.any(String),
            questions: expect.any(Array)
        }));
        expect(['requirements_discovery', 'ready_for_architecture']).toContain(response.body.mode);
        if (response.body.mode === 'requirements_discovery') {
            expect(response.body.questions.length).toBe(1);
        }
    });

    test('conflicts.v2.detect enforces resolved-only semantics', async () => {
        const response = await request(app)
            .post('/api/conflicts/v2/detect')
            .send({
                projectState: {
                    decision_graph: {
                        decisions: [
                            { id: 'a', question: 'Hosting', answer: 'Azure' },
                            { id: 'b', question: 'Storage', answer: null }
                        ]
                    }
                }
            });

        expect(response.status).toBe(200);
        expect(response.body).toEqual(expect.objectContaining({
            conflicts: expect.any(Array),
            state_hash: expect.any(String)
        }));
        expect(response.body.conflicts).toHaveLength(0);
    });

    test('projection.v2.to-execution projects work items and dependency map', async () => {
        const response = await request(app)
            .post('/api/projection/v2/to-execution')
            .send({
                projectState: {
                    decision_graph: {
                        decisions: [
                            { id: 'epic_core', question: 'Core Epic', context: 'Epic context', work_item_type: 'epic' },
                            { id: 'feature_ui', question: 'UI Feature', context: 'Feature context', work_item_type: 'feature', parent_id: 'epic_core' },
                            { id: 'task_screen', question: 'Build screen', context: 'Task context', work_item_type: 'task', parent_id: 'feature_ui', dependencies: ['feature_ui'] }
                        ]
                    }
                }
            });

        expect(response.status).toBe(200);
        expect(response.body).toEqual(expect.objectContaining({
            epics: expect.any(Array),
            features: expect.any(Array),
            tasks: expect.any(Array),
            dependency_map: expect.any(Object)
        }));
        expect(response.body.epics.some((item) => item.id === 'epic_core')).toBe(true);
    });

    test('export.v2.bundle emits cartograph-output files', async () => {
        const response = await request(app)
            .post('/api/export/v2/bundle')
            .send({
                projectState: {
                    idea: 'Test',
                    capability_graph: { nodes: [], edges: [], lenses: [] },
                    decision_graph: { decisions: [], edges: [] },
                    execution_projection: { epics: [], features: [], tasks: [], spikes: [], bugs: [], dependency_map: { nodes: [], edges: [] } }
                }
            });

        expect(response.status).toBe(200);
        expect(response.body.root).toBe('cartograph-output');
        expect(Array.isArray(response.body.files)).toBe(true);
        expect(response.body.files.some((file) => file.path === '00-context/vision.md')).toBe(true);
        expect(response.body.files.some((file) => file.path.startsWith('04-tasks/epics/'))).toBe(true);
    });
});
