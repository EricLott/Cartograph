import { describe, it, expect, vi } from 'vitest';
import { generateBlueprintZip } from '../services/exportService';

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

describe('exportService Task Scaffolding (Task-031)', () => {
    it('generates individual tasks for decisions with correct metadata and structure', async () => {
        const pillars = [
            { 
                title: 'Frontend Architecture', 
                description: 'The user interface and client-side logic for the application, focusing on React and Vite for high performance.',
                decisions: [
                    { id: 'd1', question: 'Unit Test Framework', answer: 'Vitest' },
                    { id: 'd2', question: 'E2E Framework', answer: 'Playwright', conflict: 'Resource constraints' }
                ]
            },
            { 
                title: 'Backend Services', 
                description: 'Server-side logic, API endpoints, and business rules implemented using Node.js and Express for scalability.',
                decisions: [] 
            },
            {
                title: 'Data Persistence',
                description: 'Relational database and storage strategies for the system, ensuring data integrity and efficient retrieval patterns.',
                subcategories: [
                    {
                        title: 'Relational DB',
                        description: 'PostgreSQL for structured data persistence in the application, including schema management and migrations.',
                        decisions: [
                            { id: 'd3', question: 'ORM choice', answer: 'Prisma' },
                            { id: 'd4', question: 'Migration tool', answer: 'Prisma Migrate' },
                            { id: 'd5', question: 'Connection Pooler', answer: 'PgBouncer' }
                        ]
                    }
                ]
            }
        ];

        const JSZip = (await import('jszip')).default;
        await generateBlueprintZip(pillars, {}, true);
        const mockZipInstance = vi.mocked(JSZip).mock.results[vi.mocked(JSZip).mock.results.length - 1].value;

        // Verify task counts: 3 pillars + 1 subcategory + 5 decisions = 9 tasks
        const taskFileCalls = mockZipInstance.file.mock.calls.filter(call => call[0].startsWith('task-') && call[0].endsWith('.md'));
        expect(taskFileCalls.length).toBe(9);

        // Verify a Pillar task (e.g. Frontend Architecture)
        expect(mockZipInstance.file).toHaveBeenCalledWith(
            'task-001-frontend-architecture.md',
            expect.stringContaining('workstream: frontend-architecture')
        );
        expect(mockZipInstance.file).toHaveBeenCalledWith(
            'task-001-frontend-architecture.md',
            expect.stringContaining('feature: System Architecture')
        );
        expect(mockZipInstance.file).toHaveBeenCalledWith(
            'task-001-frontend-architecture.md',
            expect.stringContaining('## Inputs')
        );

        // Verify a Decision task (e.g. Unit Test Framework)
        expect(mockZipInstance.file).toHaveBeenCalledWith(
            'task-002-unit-test-framework.md',
            expect.stringContaining('workstream: frontend-architecture')
        );
        expect(mockZipInstance.file).toHaveBeenCalledWith(
            'task-002-unit-test-framework.md',
            expect.stringContaining('feature: Frontend Architecture')
        );
        expect(mockZipInstance.file).toHaveBeenCalledWith(
            'task-002-unit-test-framework.md',
            expect.stringContaining('depends_on: ["task-001"]')
        );

        // Verify a nested decision (ORM choice)
        // task-001-003 (Frontend)
        // task-004 (Backend)
        // task-005 (Data Persistence)
        // task-006 (Relational DB)
        // task-007 (ORM choice)
        expect(mockZipInstance.file).toHaveBeenCalledWith(
            'task-007-orm-choice.md',
            expect.stringContaining('workstream: data-persistence')
        );
        expect(mockZipInstance.file).toHaveBeenCalledWith(
            'task-007-orm-choice.md',
            expect.stringContaining('feature: Relational DB')
        );
        expect(mockZipInstance.file).toHaveBeenCalledWith(
            'task-007-orm-choice.md',
            expect.stringContaining('depends_on: ["task-006"]')
        );
        
        // Verify conflict handling
        expect(mockZipInstance.file).toHaveBeenCalledWith(
            'task-003-e2e-framework.md',
            expect.stringContaining('- [CONFLICT] Resolve conflict: **Resource constraints**')
        );
    });
});
