process.env.NODE_ENV = 'test';

const request = require('supertest');
const { app } = require('../../server');

describe('Backend integration: Agent LLM Proxy', () => {
    let fetchSpy;

    beforeEach(() => {
        // Mock global fetch
        fetchSpy = jest.spyOn(global, 'fetch');
    });

    afterEach(() => {
        fetchSpy.mockRestore();
    });

    test('proxies OpenAI requests and handles successful response', async () => {
        process.env.OPENAI_API_KEY = 'test-openai-key';
        
        const mockResponse = {
            ok: true,
            status: 200,
            json: async () => ({
                choices: [{ message: { content: '["Pillar 1"]' } }],
                usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
            })
        };
        fetchSpy.mockResolvedValue(mockResponse);

        const response = await request(app)
            .post('/api/agent/complete')
            .send({
                provider: 'openai',
                payload: { model: 'gpt-4o', messages: [] }
            });

        expect(response.status).toBe(200);
        expect(response.body.completion).toBe('["Pillar 1"]');
        expect(response.body.usage).toBeDefined();
        expect(response.body.usage.prompt_tokens).toBe(10);
        expect(response.body.usage.completion_tokens).toBe(5);
        expect(response.body.usage.total_tokens).toBe(15);
        expect(typeof response.body.usage.latency_ms).toBe('number');
    });

    test('proxies Anthropic requests and handles successful response', async () => {
        process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
        
        const mockResponse = {
            ok: true,
            status: 200,
            json: async () => ({
                content: [{ text: 'Anthropic response' }],
                usage: { input_tokens: 100, output_tokens: 50 }
            })
        };
        fetchSpy.mockResolvedValue(mockResponse);

        const response = await request(app)
            .post('/api/agent/complete')
            .send({
                provider: 'anthropic',
                payload: { messages: [{ role: 'user', content: 'test' }] }
            });

        expect(response.status).toBe(200);
        expect(response.body.completion).toBe('Anthropic response');
        expect(response.body.usage.prompt_tokens).toBe(100);
        expect(response.body.usage.completion_tokens).toBe(50);
        expect(response.body.usage.total_tokens).toBe(150);
    });

    test('proxies Gemini requests and handles successful response', async () => {
        process.env.GEMINI_API_KEY = 'test-gemini-key';
        
        const mockResponse = {
            ok: true,
            status: 200,
            json: async () => ({
                candidates: [{ content: { parts: [{ text: 'Gemini response' }] } }],
                usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 }
            })
        };
        fetchSpy.mockResolvedValue(mockResponse);

        const response = await request(app)
            .post('/api/agent/complete')
            .send({
                provider: 'gemini',
                payload: { contents: [{ parts: [{ text: 'test' }] }] }
            });

        expect(response.status).toBe(200);
        expect(response.body.completion).toBe('Gemini response');
        expect(response.body.usage.prompt_tokens).toBe(10);
        expect(response.body.usage.completion_tokens).toBe(20);
        expect(response.body.usage.total_tokens).toBe(30);
    });

    test('returns 400 when provider or payload is missing', async () => {
        const response = await request(app)
            .post('/api/agent/complete')
            .send({ provider: 'openai' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Missing provider or completion payload.');
    });

    test('returns 502 when provider API key is missing from environment', async () => {
        delete process.env.ANTHROPIC_API_KEY;

        const response = await request(app)
            .post('/api/agent/complete')
            .send({
                provider: 'anthropic',
                payload: { model: 'claude-3-5-sonnet-20240620', messages: [] }
            });

        expect(response.status).toBe(502);
        expect(response.body.error).toBe('Failed to retrieve completion from LLM provider.');
        expect(response.body.detail).toContain('Missing API key for anthropic');
    });

    test('returns 502 and handles provider error responses', async () => {
        process.env.GEMINI_API_KEY = 'test-gemini-key';
        
        const mockErrorResponse = {
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            json: async () => ({ error: { message: 'Quota exceeded' } })
        };
        fetchSpy.mockResolvedValue(mockErrorResponse);

        const response = await request(app)
            .post('/api/agent/complete')
            .send({
                provider: 'gemini',
                payload: {}
            });

        expect(response.status).toBe(502);
        expect(response.body.detail).toContain('Gemini request failed');
        expect(response.body.detail).toContain('Quota exceeded');
    });
});
