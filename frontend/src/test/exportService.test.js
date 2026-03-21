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
            const _pillars = [
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
            expect(checkAllAnswered()).toBe(true);
        });

        it('returns true even if some decisions are missing an answer', () => {
            const _pillars = [
                {
                    title: 'Pillar 1',
                    decisions: [{ question: 'Q1', answer: '' }]
                }
            ];
            expect(checkAllAnswered()).toBe(true);
        });

        it('returns true even if a subcategory decision is missing an answer', () => {
            const _pillars = [
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
            expect(checkAllAnswered()).toBe(true);
        });

        it('returns true if no decisions exist', () => {
            const _pillars = [{ title: 'Pillar 1' }];
            expect(checkAllAnswered()).toBe(true);
        });
    });

    describe('generateBlueprintZip', () => {
        it('throws error if pillars are missing or empty', async () => {
            await expect(generateBlueprintZip([])).rejects.toThrow("Cannot export blueprint. No architecture pillars defined. Describe your application idea first.");
            await expect(generateBlueprintZip(null)).rejects.toThrow("Cannot export blueprint. No architecture pillars defined. Describe your application idea first.");
        });

        it('generates zip even if some decisions are unanswered', async () => {
            const pillars = [
                {
                    title: 'Pillar 1',
                    description: 'Desc 1',
                    decisions: [{ question: 'Q1', answer: '' }]
                }
            ];
            await expect(generateBlueprintZip(pillars)).resolves.not.toThrow();
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

            // Verify task-001 has AC and Evidence sections
            expect(mockZipInstance.file).toHaveBeenCalledWith(
                'task-001-parent-pillar.md',
                expect.stringContaining('## Acceptance Criteria')
            );
            expect(mockZipInstance.file).toHaveBeenCalledWith(
                'task-001-parent-pillar.md',
                expect.stringContaining('## Evidence Required')
            );

            // Verify task-002 (Child) depends on task-001 and has AC
            expect(mockZipInstance.file).toHaveBeenCalledWith(
                'task-002-child-pillar.md',
                expect.stringContaining('depends_on: ["task-001"]')
            );
            expect(mockZipInstance.file).toHaveBeenCalledWith(
                'task-002-child-pillar.md',
                expect.stringContaining('## Acceptance Criteria')
            );

            // Verify dependency-map.md contains the edge
            expect(mockZipInstance.file).toHaveBeenCalledWith(
                'dependency-map.md',
                expect.stringContaining('- task-002 depends on task-001')
            );
        });

        it('tags unanswered decisions as blockers in markdown', async () => {
            const pillars = [
                {
                    title: 'Pillar 1',
                    description: 'Desc 1',
                    decisions: [{ question: 'Q1', answer: 'Pending Resolution' }]
                }
            ];

            const JSZip = (await import('jszip')).default;
            await generateBlueprintZip(pillars);
            const mockZipInstance = vi.mocked(JSZip).mock.results[vi.mocked(JSZip).mock.results.length - 1].value;

            expect(mockZipInstance.file).toHaveBeenCalledWith(
                'task-001-pillar-1.md',
                expect.stringContaining('- [BLOCKER] Resolve decision for question: **Q1** before final implementation.')
            );
        });

        it('seeds progress-log.md with initial architecture entry', async () => {
            const pillars = [
                {
                    title: 'Pillar 1',
                    description: 'Desc 1',
                    decisions: [{ question: 'Q1', answer: 'A1' }]
                }
            ];

            const JSZip = (await import('jszip')).default;
            await generateBlueprintZip(pillars);
            
            // Get the latest instance created
            const mockZipInstance = vi.mocked(JSZip).mock.results[vi.mocked(JSZip).mock.results.length - 1].value;

            expect(mockZipInstance.file).toHaveBeenCalledWith(
                'progress-log.md',
                expect.stringContaining('Architecture and Planning Phase')
            );
            expect(mockZipInstance.file).toHaveBeenCalledWith(
                'progress-log.md',
                expect.stringContaining('../00-context/vision.md')
            );
            expect(mockZipInstance.file).toHaveBeenCalledWith(
                'progress-log.md',
                expect.stringContaining('../02-execution/implementation-strategy.md')
            );
            expect(mockZipInstance.file).toHaveBeenCalledWith(
                'progress-log.md',
                expect.stringContaining('schema_version: 1')
            );
        });
    });
});
