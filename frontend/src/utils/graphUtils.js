import { MarkerType, Position } from 'reactflow';
import dagre from 'dagre';

const makeEdge = ({ id, source, target, label, color, dashed = false, animated = false }) => ({
  id,
  source,
  target,
  label,
  animated,
  style: {
    stroke: color,
    strokeWidth: 2,
    strokeDasharray: dashed ? '5,5' : 'none'
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color
  }
});

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
  const edgeIds = new Set();
  const decisions = [];
  const decisionById = new Map();

  const traverse = (pillarNodes) => {
    if (!Array.isArray(pillarNodes)) return;
    pillarNodes.forEach(pillar => {
      if (pillar.decisions) {
        pillar.decisions.forEach(decision => {
          const workType = String(decision.work_item_type || '').toLowerCase();
          const isExecutionItem = ['epic', 'feature', 'task', 'spike', 'bug'].includes(workType);
          nodes.push({
            id: decision.id,
            type: 'decision',
            data: { 
              label: decision.question, 
              answer: decision.answer, 
              conflict: decision.conflict,
              kind: isExecutionItem ? workType : 'decision',
              priority: decision.priority || null,
              pillarId: pillar.id,
              pillarTitle: pillar.title
            },
            position: { x: 0, y: 0 },
          });
          decisions.push(decision);
          decisionById.set(decision.id, decision);

          // Map internal links
          if (decision.links) {
            decision.links.forEach(link => {
              const color = link.type === 'conflicts' ? '#ef4444' : '#3b82f6';
              const edge = makeEdge({
                id: `e-${decision.id}-${link.id}-${link.type}`,
                source: decision.id,
                target: link.id,
                label: link.type,
                color,
                dashed: link.type === 'supersedes',
                animated: link.type === 'depends_on'
              });
              if (!edgeIds.has(edge.id)) {
                edgeIds.add(edge.id);
                edges.push(edge);
              }
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

  // Add inferred dependency edges from feature metadata.
  decisions.forEach((decision) => {
    if (!Array.isArray(decision.dependencies)) return;
    decision.dependencies.forEach((depId) => {
      if (!decisionById.has(depId)) return;
      const id = `e-${decision.id}-${depId}-depends_on`;
      if (edgeIds.has(id)) return;
      edgeIds.add(id);
      edges.push(
        makeEdge({
          id,
          source: decision.id,
          target: depId,
          label: 'depends_on',
          color: '#3b82f6',
          animated: true
        })
      );
    });
  });

  // Add inferred conflict edges for nodes sharing same conflict message.
  const conflictGroups = new Map();
  decisions.forEach((decision) => {
    if (!decision.conflict) return;
    const key = String(decision.conflict).trim().toLowerCase();
    if (!key) return;
    if (!conflictGroups.has(key)) conflictGroups.set(key, []);
    conflictGroups.get(key).push(decision.id);
  });
  conflictGroups.forEach((ids) => {
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const source = ids[i];
        const target = ids[j];
        const id = `e-${source}-${target}-conflicts`;
        if (edgeIds.has(id)) continue;
        edgeIds.add(id);
        edges.push(
          makeEdge({
            id,
            source,
            target,
            label: 'conflicts',
            color: '#ef4444',
            dashed: true
          })
        );
      }
    }
  });

  return { nodes, edges };
};
