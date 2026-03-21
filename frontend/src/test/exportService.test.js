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
        it('returns true if all decisions have answers and all critical pillars are present', () => {
            const pillars = [
                { title: 'Frontend', description: 'At least ten words in this description for the pillar.', decisions: [{ question: 'Q1', answer: 'A1' }] },
                { title: 'Backend', description: 'At least ten words in this description for the pillar.', decisions: [{ question: 'Q2', answer: 'A2' }] },
                { title: 'Data', description: 'At least ten words in this description for the pillar.' }
            ];
            expect(checkAllAnswered(pillars)).toBe(true);
        });

        it('returns false if decisions are missing an answer (default quality check)', () => {
            const pillars = [
                { title: 'Frontend', description: 'At least ten words in this description for the pillar.', decisions: [{ question: 'Q1', answer: '' }] },
                { title: 'Backend', description: 'At least ten words in this description for the pillar.' },
                { title: 'Data', description: 'At least ten words in this description for the pillar.' }
            ];
            expect(checkAllAnswered(pillars)).toBe(false);
        });

        it('returns false if a subcategory decision is missing an answer', () => {
            const pillars = [
                { title: 'Frontend', description: 'At least ten words in this description for the pillar.' },
                { title: 'Backend', description: 'At least ten words in this description for the pillar.' },
                { 
                    title: 'Data', 
                    description: 'At least ten words in this description for the pillar.',
                    subcategories: [
                        {
                            title: 'Storage',
                            description: 'At least ten words in this description for the subcategory.',
                            decisions: [{ question: 'Q2', answer: null }]
                        }
                    ]
                }
            ];
            expect(checkAllAnswered(pillars)).toBe(false);
        });

        it('returns false if critical pillars are missing', () => {
            const pillars = [{ title: 'Only One Pillar', description: 'Valid description with more than ten words in it.' }];
            expect(checkAllAnswered(pillars)).toBe(false);
        });
    });

    describe('generateBlueprintZip', () => {
        it('throws error if pillars are missing or empty', async () => {
            await expect(generateBlueprintZip([])).rejects.toThrow("Cannot export blueprint. No architecture pillars defined. Describe your application idea first.");
            await expect(generateBlueprintZip(null)).rejects.toThrow("Cannot export blueprint. No architecture pillars defined. Describe your application idea first.");
        });

        it('generates zip with warnings if forced', async () => {
            const pillars = [
                { title: 'Frontend', description: 'Desc', decisions: [{ question: 'Q1', answer: '' }] },
                { title: 'Backend', description: 'Desc' },
                { title: 'Data', description: 'Desc' }
            ];
            await expect(generateBlueprintZip(pillars, {}, true)).resolves.not.toThrow();
        });

        it('generates zip successfully when all criteria are met', async () => {
            const pillars = [
                { title: 'Frontend', description: 'At least ten words in this description for the pillar.' },
                { title: 'Backend', description: 'At least ten words in this description for the pillar.' },
                { title: 'Data', description: 'At least ten words in this description for the pillar.' }
            ];
            await generateBlueprintZip(pillars);
            
            // Check if saveAs was called
            const { saveAs } = await import('file-saver');
            expect(saveAs).toHaveBeenCalled();
        });

        it('generates zip with correct dependencies for nested pillars', async () => {
            const pillars = [
                { id: 'f1', title: 'Frontend', description: 'At least ten words in this description for the pillar.' },
                { id: 'b1', title: 'Backend', description: 'At least ten words in this description for the pillar.' },
                {
                    id: 'p1',
                    title: 'Data Layer',
                    description: 'Data layer description with at least ten words in it.',
                    subcategories: [
                        {
                            id: 's1',
                            title: 'PostgreSQL',
                            description: 'Database description with at least ten words in it now.'
                        }
                    ]
                }
            ];

            // Get the mock JSZip class
            const JSZip = (await import('jszip')).default;
            
            await generateBlueprintZip(pillars);

            // Get the instance created by generateBlueprintZip
            const mockZipInstance = vi.mocked(JSZip).mock.results[vi.mocked(JSZip).mock.results.length - 1].value;

            // Verify task-003 (Data Layer) has AC and Evidence sections
            expect(mockZipInstance.file).toHaveBeenCalledWith(
                'task-003-data-layer.md',
                expect.stringContaining('## Acceptance Criteria')
            );
            expect(mockZipInstance.file).toHaveBeenCalledWith(
                'task-003-data-layer.md',
                expect.stringContaining('## Evidence Required')
            );

            // Verify task-004 (Child) depends on task-003 (Data Layer) and has AC
            expect(mockZipInstance.file).toHaveBeenCalledWith(
                'task-004-postgresql.md',
                expect.stringContaining('depends_on: ["task-003"]')
            );
            expect(mockZipInstance.file).toHaveBeenCalledWith(
                'task-004-postgresql.md',
                expect.stringContaining('## Acceptance Criteria')
            );

            // Verify dependency-map.md contains the edge
            expect(mockZipInstance.file).toHaveBeenCalledWith(
                'dependency-map.md',
                expect.stringContaining('- task-004 depends on task-003')
            );
        });

        it('tags unanswered decisions as blockers in markdown (forced export)', async () => {
            const pillars = [
                { title: 'Frontend', description: 'At least ten words in this description for the pillar.' },
                { title: 'Backend', description: 'At least ten words in this description for the pillar.' },
                {
                    title: 'Data',
                    description: 'At least ten words in this description for the pillar.',
                    decisions: [{ question: 'Q1', answer: 'Pending Resolution' }]
                }
            ];

            const JSZip = (await import('jszip')).default;
            await generateBlueprintZip(pillars, {}, true);
            const mockZipInstance = vi.mocked(JSZip).mock.results[vi.mocked(JSZip).mock.results.length - 1].value;

            expect(mockZipInstance.file).toHaveBeenCalledWith(
                'task-004-q1.md',
                expect.stringContaining('- [BLOCKER] Resolve decision for question: **Q1** before implementation.')
            );
        });

        it('generates the full 00-07 directory structure with core artifacts', async () => {
            const pillars = [
                { title: 'Frontend', description: 'At least ten words in this description for the pillar.' },
                { title: 'Backend', description: 'At least ten words in this description for the pillar.' },
                { title: 'Data', description: 'At least ten words in this description for the pillar.' }
            ];

            const JSZip = (await import('jszip')).default;
            await generateBlueprintZip(pillars);
            const mockZipInstance = vi.mocked(JSZip).mock.results[vi.mocked(JSZip).mock.results.length - 1].value;

            // Folders
            expect(mockZipInstance.folder).toHaveBeenCalledWith('00-context');
            expect(mockZipInstance.folder).toHaveBeenCalledWith('01-architecture');
            expect(mockZipInstance.folder).toHaveBeenCalledWith('02-execution');
            expect(mockZipInstance.folder).toHaveBeenCalledWith('03-agent-ops');
            expect(mockZipInstance.folder).toHaveBeenCalledWith('04-task-system');
            expect(mockZipInstance.folder).toHaveBeenCalledWith('05-state');
            expect(mockZipInstance.folder).toHaveBeenCalledWith('06-quality');
            expect(mockZipInstance.folder).toHaveBeenCalledWith('07-artifacts');

            // Core Files
            expect(mockZipInstance.file).toHaveBeenCalledWith('vision.md', expect.stringContaining('# Cartograph Vision'));
            expect(mockZipInstance.file).toHaveBeenCalledWith('AGENTS.md', expect.stringContaining('# AGENTS Operating Contract'));
            expect(mockZipInstance.file).toHaveBeenCalledWith('DefinitionOfDone.md', expect.stringContaining('# Definition of Done'));
            expect(mockZipInstance.file).toHaveBeenCalledWith('README.md', expect.stringContaining('# Artifacts'));
            expect(mockZipInstance.file).toHaveBeenCalledWith('README.md', expect.stringContaining('# Architecture Overview'));
            expect(mockZipInstance.file).toHaveBeenCalledWith('blockers.md', expect.stringContaining('# Blockers'));
        });

        it('seeds progress-log.md with initial architecture entry', async () => {
            const pillars = [
                { title: 'Frontend', description: 'At least ten words in this description for the pillar.' },
                { title: 'Backend', description: 'At least ten words in this description for the pillar.' },
                { title: 'Data', description: 'At least ten words in this description for the pillar.' }
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
