import { describe, it, expect, vi } from 'vitest';
import { checkAllAnswered, generateBlueprintZip } from '../services/exportService';

// Mock JSZip and file-saver
vi.mock('jszip', () => {
    const mockJSZip = vi.fn().mockImplementation(function() {
        this.folder = vi.fn().mockReturnThis();
        this.file = vi.fn().mockReturnThis();
        this.generateAsync = vi.fn().mockResolvedValue('mock-zip-content');
    });
    return { default: mockJSZip };
});

vi.mock('file-saver', () => ({
    saveAs: vi.fn()
}));

describe('exportService', () => {
    describe('checkAllAnswered', () => {
        it('returns true if all decisions have answers', () => {
            const pillars = [
                {
                    title: 'Pillar 1',
                    decisions: [{ question: 'Q1', answer: 'A1' }],
                    subcategories: [
                        {
                            title: 'Sub 1',
                            decisions: [{ question: 'Q2', answer: 'A2' }]
                        }
                    ]
                }
            ];
            expect(checkAllAnswered(pillars)).toBe(true);
        });

        it('returns false if any decision is missing an answer', () => {
            const pillars = [
                {
                    title: 'Pillar 1',
                    decisions: [{ question: 'Q1', answer: '' }]
                }
            ];
            expect(checkAllAnswered(pillars)).toBe(false);
        });

        it('returns false if a subcategory decision is missing an answer', () => {
            const pillars = [
                {
                    title: 'Pillar 1',
                    decisions: [{ question: 'Q1', answer: 'A1' }],
                    subcategories: [
                        {
                            title: 'Sub 1',
                            decisions: [{ question: 'Q2', answer: null }]
                        }
                    ]
                }
            ];
            expect(checkAllAnswered(pillars)).toBe(false);
        });

        it('returns true if no decisions exist', () => {
            const pillars = [{ title: 'Pillar 1' }];
            expect(checkAllAnswered(pillars)).toBe(true);
        });
    });

    describe('generateBlueprintZip', () => {
        it('throws error if pillars are missing or empty', async () => {
            await expect(generateBlueprintZip([])).rejects.toThrow("Cannot export blueprint. No architecture pillars defined. Describe your application idea first.");
            await expect(generateBlueprintZip(null)).rejects.toThrow("Cannot export blueprint. No architecture pillars defined. Describe your application idea first.");
        });

        it('throws error if some decisions are unanswered', async () => {
            const pillars = [
                {
                    title: 'Pillar 1',
                    decisions: [{ question: 'Q1', answer: '' }]
                }
            ];
            await expect(generateBlueprintZip(pillars)).rejects.toThrow("Cannot export blueprint. There are unanswered decisions in the architecture. Please answer all decisions before exporting.");
        });

        it('generates zip successfully when all criteria are met', async () => {
            const pillars = [
                {
                    title: 'Pillar 1',
                    description: 'Desc 1',
                    decisions: [{ question: 'Q1', answer: 'A1' }]
                }
            ];
            await generateBlueprintZip(pillars);
            
            // Check if saveAs was called
            const { saveAs } = await import('file-saver');
            expect(saveAs).toHaveBeenCalled();
        });

        it('generates zip with correct dependencies for nested pillars', async () => {
            const pillars = [
                {
                    id: 'p1',
                    title: 'Parent Pillar',
                    description: 'Parent Desc',
                    subcategories: [
                        {
                            id: 's1',
                            title: 'Child Pillar',
                            description: 'Child Desc'
                        }
                    ]
                }
            ];

            // Get the mock JSZip class
            const JSZip = (await import('jszip')).default;
            
            await generateBlueprintZip(pillars);

            // Get the instance created by generateBlueprintZip
            const mockZipInstance = vi.mocked(JSZip).mock.results[vi.mocked(JSZip).mock.results.length - 1].value;

            // Verify task-001 (Parent) has no dependencies
            expect(mockZipInstance.file).toHaveBeenCalledWith(
                'task-001-parent-pillar.md',
                expect.stringContaining('depends_on: []')
            );

            // Verify task-002 (Child) depends on task-001
            expect(mockZipInstance.file).toHaveBeenCalledWith(
                'task-002-child-pillar.md',
                expect.stringContaining('depends_on: ["task-001"]')
            );

            // Verify dependency-map.md contains the edge
            expect(mockZipInstance.file).toHaveBeenCalledWith(
                'dependency-map.md',
                expect.stringContaining('- task-002 depends on task-001')
            );
        });
    });
});
