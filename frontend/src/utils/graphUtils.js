import { MarkerType, Position } from 'reactflow';
import dagre from 'dagre';

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'in', 'is', 'it', 'of', 'on', 'or',
  'that', 'the', 'this', 'to', 'we', 'with', 'you', 'your'
]);

const tokenize = (text = '') => {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token && !STOP_WORDS.has(token) && token.length > 1);
};

const buildTfVector = (tokens) => {
  const vector = new Map();
  tokens.forEach((token) => {
    vector.set(token, (vector.get(token) || 0) + 1);
  });
  return vector;
};

const cosineSimilarity = (a, b) => {
  if (!a.size || !b.size) return 0;
  const keys = new Set([...a.keys(), ...b.keys()]);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  keys.forEach((key) => {
    const av = a.get(key) || 0;
    const bv = b.get(key) || 0;
    dot += av * bv;
    magA += av * av;
    magB += bv * bv;
  });
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
};

const flattenText = (decision) => {
  const criteria = Array.isArray(decision.acceptance_criteria) ? decision.acceptance_criteria.join(' ') : '';
  const deps = Array.isArray(decision.dependencies) ? decision.dependencies.join(' ') : '';
  return [
    decision.question,
    decision.context,
    decision.answer,
    decision.technical_context,
    criteria,
    deps,
    decision.priority
  ].filter(Boolean).join(' ');
};

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
          const isFeature = String(decision.id || '').startsWith('feat_');
          nodes.push({
            id: decision.id,
            type: 'decision',
            data: { 
              label: decision.question, 
              answer: decision.answer, 
              conflict: decision.conflict,
              kind: isFeature ? 'feature' : 'decision',
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

  // Vectorize decisions/features and create "related" edges based on cosine similarity.
  const vectors = decisions.map((decision) => ({
    id: decision.id,
    vec: buildTfVector(tokenize(flattenText(decision)))
  }));
  const similarityThreshold = 0.36;
  const candidateEdges = [];
  for (let i = 0; i < vectors.length; i += 1) {
    for (let j = i + 1; j < vectors.length; j += 1) {
      const sim = cosineSimilarity(vectors[i].vec, vectors[j].vec);
      if (sim >= similarityThreshold) {
        candidateEdges.push({
          source: vectors[i].id,
          target: vectors[j].id,
          score: sim
        });
      }
    }
  }
  // Keep graph readable: at most top 2 semantic edges per node.
  const perNodeCount = new Map();
  candidateEdges
    .sort((a, b) => b.score - a.score)
    .forEach(({ source, target, score }) => {
      const sourceCount = perNodeCount.get(source) || 0;
      const targetCount = perNodeCount.get(target) || 0;
      if (sourceCount >= 2 || targetCount >= 2) return;
      const id = `e-${source}-${target}-related`;
      if (edgeIds.has(id)) return;
      edgeIds.add(id);
      perNodeCount.set(source, sourceCount + 1);
      perNodeCount.set(target, targetCount + 1);
      edges.push(
        makeEdge({
          id,
          source,
          target,
          label: `related ${Math.round(score * 100)}%`,
          color: '#8b5cf6',
          dashed: true
        })
      );
    });

  return { nodes, edges };
};
