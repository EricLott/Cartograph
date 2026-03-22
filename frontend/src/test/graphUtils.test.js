import { describe, it, expect } from 'vitest';
import { buildGraphFromPillars, getLayoutedElements } from '../utils/graphUtils';

describe('graphUtils', () => {
  const mockPillars = [
    {
      id: 'pillar-1',
      title: 'Pillar 1',
      decisions: [
        {
          id: 'd1',
          question: 'Question 1',
          answer: 'Answer 1',
          links: [
            { id: 'd2', type: 'depends_on' }
          ]
        },
        {
          id: 'd2',
          question: 'Question 2',
          answer: null
        }
      ]
    }
  ];

  describe('buildGraphFromPillars', () => {
    it('should correctly map pillars to nodes', () => {
      const { nodes } = buildGraphFromPillars(mockPillars);
      expect(nodes).toHaveLength(2);
      expect(nodes[0].id).toBe('d1');
      expect(nodes[0].data.label).toBe('Question 1');
      expect(nodes[0].data.pillarTitle).toBe('Pillar 1');
      expect(nodes[1].id).toBe('d2');
    });

    it('should correctly map links to edges', () => {
      const { edges } = buildGraphFromPillars(mockPillars);
      expect(edges).toHaveLength(1);
      expect(edges[0].source).toBe('d1');
      expect(edges[0].target).toBe('d2');
      expect(edges[0].label).toBe('depends_on');
      expect(edges[0].animated).toBe(true);
    });

    it('should handle nested subcategories', () => {
        const nestedPillars = [
            {
                id: 'p1',
                title: 'P1',
                subcategories: [
                    {
                        id: 's1',
                        title: 'S1',
                        decisions: [{ id: 'ds1', question: 'QS1' }]
                    }
                ]
            }
        ];
        const { nodes } = buildGraphFromPillars(nestedPillars);
        expect(nodes).toHaveLength(1);
        expect(nodes[0].id).toBe('ds1');
    });
  });

  describe('getLayoutedElements', () => {
    it('should assign positions to nodes', () => {
      const { nodes, edges } = buildGraphFromPillars(mockPillars);
      const layouted = getLayoutedElements(nodes, edges);
      
      expect(layouted.nodes[0].position).toBeDefined();
      expect(typeof layouted.nodes[0].position.x).toBe('number');
      expect(typeof layouted.nodes[0].position.y).toBe('number');
      expect(layouted.nodes[1].position).toBeDefined();
    });
  });
});
