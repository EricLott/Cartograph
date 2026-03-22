import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generatePillarsFromIdea, processChatTurn } from '../services/agentService';

// Mock the validation module and prompts if needed, 
// but here we want to test the integration of agentService with them.
// We only need to mock the global fetch.

vi.stubGlobal('fetch', vi.fn());

describe('agentService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('generatePillarsFromIdea', () => {
        it('should return pillars from a successful proxy response', async () => {
            const rawOutput = JSON.stringify([{ id: 'p1', title: 'P1', description: 'D1', subcategories: [], decisions: [] }]);
            const mockResponse = {
                ok: true,
                json: async () => ({ completion: rawOutput })
            };
            fetch.mockResolvedValue(mockResponse);

            const result = await generatePillarsFromIdea('my idea', { 
                provider: 'openai', 
                keys: { openai: 'test-key' } 
            });

            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('P1');
            expect(fetch).toHaveBeenCalledWith(
                '/api/agent/complete',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json'
                    }),
                    body: expect.stringContaining('"clientKeys":{"openai":"test-key"}')
                })
            );
        });

        it('should throw an error if the proxy returns invalid JSON content', async () => {
            const mockResponse = {
                ok: true,
                json: async () => ({ completion: 'invalid json' })
            };
            fetch.mockResolvedValue(mockResponse);

            await expect(generatePillarsFromIdea('my idea', { 
                provider: 'openai', 
                keys: { openai: 'test-key' } 
            })).rejects.toThrow(/Pillar generation output validation failed/);
        });
    });

    describe('processChatTurn', () => {
        it('should process a chat turn and return validated output through proxy', async () => {
            const rawOutput = JSON.stringify({
                reply: 'Hello',
                updatedDecisions: [],
                newCategories: [],
                conflicts: []
            });
            const mockResponse = {
                ok: true,
                json: async () => ({ completion: rawOutput })
            };
            fetch.mockResolvedValue(mockResponse);

            const result = await processChatTurn(
                [{ role: 'user', content: 'hello' }],
                [],
                { provider: 'openai', keys: { openai: 'test-key' } }
            );

            expect(result.reply).toBe('Hello');
            expect(fetch).toHaveBeenCalledWith('/api/agent/complete', expect.any(Object));
        });
    });
});
