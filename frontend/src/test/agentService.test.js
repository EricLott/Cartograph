import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generatePillarsFromIdea, processChatTurn } from '../services/agentService';

// Mock the validation module and prompts if needed, 
// but here we want to test the integration of agentService with them.
// We only need to mock the global fetch.

global.fetch = vi.fn();

describe('agentService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('generatePillarsFromIdea', () => {
        it('should return pillars from a successful OpenAI response', async () => {
            const mockResponse = {
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: JSON.stringify([{ id: 'p1', title: 'P1', description: 'D1', subcategories: [], decisions: [] }]) } }]
                })
            };
            fetch.mockResolvedValue(mockResponse);

            const result = await generatePillarsFromIdea('my idea', { 
                provider: 'openai', 
                keys: { openai: 'test-key' } 
            });

            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('P1');
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('openai.com'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-key'
                    })
                })
            );
        });

        it('should throw an error if the provider returns invalid JSON', async () => {
            const mockResponse = {
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'invalid json' } }]
                })
            };
            fetch.mockResolvedValue(mockResponse);

            await expect(generatePillarsFromIdea('my idea', { 
                provider: 'openai', 
                keys: { openai: 'test-key' } 
            })).rejects.toThrow(/provider did not return valid JSON/);
        });
    });

    describe('processChatTurn', () => {
        it('should process a chat turn and return validated output', async () => {
            const mockResponse = {
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: JSON.stringify({
                        reply: 'Hello',
                        updatedDecisions: [],
                        newCategories: [],
                        conflicts: []
                    }) } }]
                })
            };
            fetch.mockResolvedValue(mockResponse);

            const result = await processChatTurn(
                [{ role: 'user', content: 'hello' }],
                [],
                { provider: 'openai', keys: { openai: 'test-key' } }
            );

            expect(result.reply).toBe('Hello');
        });
    });
});
