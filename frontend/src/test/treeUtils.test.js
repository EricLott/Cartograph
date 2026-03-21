import { describe, it, expect } from 'vitest';
import { updateNodeDecisions, findNodeById } from '../utils/treeUtils';

describe('treeUtils', () => {
    const mockPillars = [
        {
            id: 'p1',
            title: 'Pillar 1',
            decisions: [
                { id: 'd1', question: 'Q1', answer: null }
            ],
            subcategories: [
                {
                    id: 's1',
                    title: 'Sub 1',
                    decisions: [
                        { id: 'd2', question: 'Q2', answer: null }
                    ],
                    subcategories: []
                }
            ]
        }
    ];

    describe('findNodeById', () => {
        it('should find a top-level pillar', () => {
            const node = findNodeById(mockPillars, 'p1');
            expect(node.title).toBe('Pillar 1');
        });

        it('should find a nested subcategory', () => {
            const node = findNodeById(mockPillars, 's1');
            expect(node.title).toBe('Sub 1');
        });

        it('should return null for non-existent ID', () => {
            const node = findNodeById(mockPillars, 'invalid');
            expect(node).toBeNull();
        });
    });

    describe('updateNodeDecisions', () => {
        it('should update a top-level decision', () => {
            const nextPillars = updateNodeDecisions(mockPillars, 'd1', (d) => ({ ...d, answer: 'A1' }));
            const p1 = findNodeById(nextPillars, 'p1');
            expect(p1.decisions[0].answer).toBe('A1');
        });

        it('should update a nested decision', () => {
            const nextPillars = updateNodeDecisions(mockPillars, 'd2', (d) => ({ ...d, answer: 'A2' }));
            const s1 = findNodeById(nextPillars, 's1');
            expect(s1.decisions[0].answer).toBe('A2');
        });

        it('should not mutate the original tree', () => {
            updateNodeDecisions(mockPillars, 'd1', (d) => ({ ...d, answer: 'A1' }));
            expect(mockPillars[0].decisions[0].answer).toBeNull();
        });
    });
});
