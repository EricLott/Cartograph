import { MarkerType, Position } from 'reactflow';
import dagre from 'dagre';

/**
 * Lays out the graph elements using dagre.
 */
export const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 220, height: 120 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node, i) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    // Fallback if dagre didn't provide a position (unlikely but safe)
    const x = nodeWithPosition?.x ?? (i * 250);
    const y = nodeWithPosition?.y ?? (i * 150);

    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: x - 110,
        y: y - 60,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

/**
 * Builds the nodes and edges from a list of pillars.
 */
export const buildGraphFromPillars = (pillars) => {
  const nodes = [];
  const edges = [];

  const traverse = (pillarNodes) => {
    if (!Array.isArray(pillarNodes)) return;
    pillarNodes.forEach(pillar => {
      if (pillar.decisions) {
        pillar.decisions.forEach(decision => {
          nodes.push({
            id: decision.id,
            type: 'decision',
            data: { 
              label: decision.question, 
              answer: decision.answer, 
              conflict: decision.conflict,
              pillarId: pillar.id,
              pillarTitle: pillar.title
            },
            position: { x: 0, y: 0 },
          });

          // Map internal links
          if (decision.links) {
            decision.links.forEach(link => {
              edges.push({
                id: `e-${decision.id}-${link.id}`,
                source: decision.id,
                target: link.id,
                label: link.type,
                animated: link.type === 'depends_on',
                style: { 
                  stroke: link.type === 'conflicts' ? '#ef4444' : '#3b82f6',
                  strokeWidth: 2,
                  strokeDasharray: link.type === 'supersedes' ? '5,5' : 'none'
                },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  color: link.type === 'conflicts' ? '#ef4444' : '#3b82f6'
                },
              });
            });
          }
        });
      }
      if (pillar.subcategories) {
        traverse(pillar.subcategories);
      }
    });
  };

  traverse(pillars);
  return { nodes, edges };
};
