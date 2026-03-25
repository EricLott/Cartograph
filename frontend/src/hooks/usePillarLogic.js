import { updateNodeDecisions, addDecisionToPillar, deleteDecisionFromPillar } from '../utils/treeUtils';
import { saveStateToBackend } from '../services/apiService';

const cloneJson = (value) => {
  try {
    return JSON.parse(JSON.stringify(value ?? {}));
  } catch {
    return {};
  }
};

const applyDecisionAnswerToV2State = (v2State, decisionId, answer) => {
  const next = cloneJson(v2State);
  const decisions = next?.decision_graph?.decisions || next?.decisionGraph?.decisions || [];
  if (!Array.isArray(decisions)) return next;
  decisions.forEach((decision) => {
    if (String(decision.id || decision.decisionId || '') !== String(decisionId)) return;
    decision.answer = answer;
  });
  if (next.decisionGraph && !next.decision_graph) {
    next.decisionGraph.decisions = decisions;
  } else if (next.decision_graph) {
    next.decision_graph.decisions = decisions;
  }
  return next;
};

const flattenDecisionsFromPillars = (nodes = [], bucket = []) => {
  (nodes || []).forEach((node) => {
    (node.decisions || []).forEach((decision) => bucket.push(decision));
    flattenDecisionsFromPillars(node.subcategories || [], bucket);
  });
  return bucket;
};

const syncV2StateWithPillars = (v2State, pillars) => {
  const next = cloneJson(v2State);
  const pillarDecisions = flattenDecisionsFromPillars(pillars);
  const byId = new Map(pillarDecisions.map((decision) => [String(decision.id || ''), decision]));

  if (!next.decision_graph) next.decision_graph = { decisions: [], edges: [] };
  if (!Array.isArray(next.decision_graph.decisions)) next.decision_graph.decisions = [];

  next.decision_graph.decisions = next.decision_graph.decisions.map((decision) => {
    const source = byId.get(String(decision.id || ''));
    if (!source) return decision;
    return {
      ...decision,
      question: source.question || decision.question,
      context: source.context || decision.context,
      short_title: source.short_title || decision.short_title || source.question || decision.question,
      answer: source.answer ?? decision.answer,
      work_item_type: source.work_item_type || decision.work_item_type || 'task',
      parent_id: source.parent_id ?? decision.parent_id ?? null,
      priority: source.priority || decision.priority || 'P1',
      dependencies: Array.isArray(source.dependencies) ? source.dependencies : (decision.dependencies || [])
    };
  });

  const known = new Set(next.decision_graph.decisions.map((decision) => String(decision.id || '')));
  pillarDecisions.forEach((decision) => {
    const id = String(decision.id || '');
    if (!id || known.has(id)) return;
    next.decision_graph.decisions.push({
      id,
      capability_id: null,
      question: decision.question || id,
      short_title: decision.short_title || decision.question || id,
      context: decision.context || '',
      answer: decision.answer ?? null,
      options: Array.isArray(decision.options) ? decision.options : [],
      dependencies: Array.isArray(decision.dependencies) ? decision.dependencies : [],
      priority: decision.priority || 'P1',
      work_item_type: decision.work_item_type || 'task',
      parent_id: decision.parent_id ?? null
    });
  });

  return next;
};

export function usePillarLogic(state, setters) {
  const { pillars, messages, projectId, v2State } = state;
  const { setPillars, setProjectId, setProjectOverview, setErrorMessage, setV2State } = setters;

  const handleUpdatePillars = async (nextPillars, nextV2State = v2State) => {
    setPillars(nextPillars);
    setV2State(nextV2State || {});
    try {
      const ideaMsg = messages.find(m => m.role === 'user');
      if (ideaMsg) {
        const resultData = await saveStateToBackend(
          ideaMsg.content,
          nextPillars,
          projectId,
          false,
          messages,
          nextV2State
        );
        if (resultData?.projectId) setProjectId(resultData.projectId);
        if (typeof resultData?.projectOverview === 'string') setProjectOverview(resultData.projectOverview);
        if (resultData?.v2State && typeof resultData.v2State === 'object') setV2State(resultData.v2State);
      }
    } catch {
      setErrorMessage("Failed to save changes.");
    } finally {
      // No-op: feedback derives from validation state in useAppLogic.
    }
  };

  const handleUpdateDecision = async (pillarId, decisionId, answer) => {
    setErrorMessage(null);
    const nextPillars = updateNodeDecisions(pillars, decisionId, (d) => ({ ...d, answer }));
    const nextV2State = applyDecisionAnswerToV2State(v2State, decisionId, answer);
    await handleUpdatePillars(nextPillars, nextV2State);
  };

  const handleAddFeature = async (pillarId, feature) => {
    setErrorMessage(null);
    const nextPillars = addDecisionToPillar(pillars, pillarId, { ...feature, answer: 'Included' });
    const nextV2State = syncV2StateWithPillars(v2State, nextPillars);
    await handleUpdatePillars(nextPillars, nextV2State);
  };

  const handleDeleteFeature = async (pillarId, featureId) => {
    setErrorMessage(null);
    const nextPillars = deleteDecisionFromPillar(pillars, pillarId, featureId);
    const nextV2State = syncV2StateWithPillars(v2State, nextPillars);
    await handleUpdatePillars(nextPillars, nextV2State);
  };

  const handleEditFeature = async (pillarId, featureId, updates) => {
    setErrorMessage(null);
    const nextPillars = updateNodeDecisions(pillars, featureId, (d) => ({ ...d, ...updates }));
    const nextV2State = syncV2StateWithPillars(v2State, nextPillars);
    await handleUpdatePillars(nextPillars, nextV2State);
  };

  return { handleUpdateDecision, handleAddFeature, handleDeleteFeature, handleEditFeature };
}
