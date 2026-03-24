import { updateNodeDecisions, addDecisionToPillar, deleteDecisionFromPillar } from '../utils/treeUtils';
import { saveStateToBackend } from '../services/apiService';

export function usePillarLogic(state, setters) {
  const { pillars, messages, projectId } = state;
  const { setPillars, setProjectId, setErrorMessage, setAgentFeedback } = setters;

  const handleUpdatePillars = async (nextPillars) => {
    setPillars(nextPillars);
    try {
      const ideaMsg = messages.find(m => m.role === 'user');
      if (ideaMsg) {
        const resultData = await saveStateToBackend(ideaMsg.content, nextPillars, projectId);
        if (resultData?.projectId) setProjectId(resultData.projectId);
      }
    } catch {
      setErrorMessage("Failed to save changes.");
    } finally {
      setAgentFeedback([]);
    }
  };

  const handleUpdateDecision = async (pillarId, decisionId, answer) => {
    setErrorMessage(null);
    const nextPillars = updateNodeDecisions(pillars, decisionId, (d) => ({ ...d, answer }));
    await handleUpdatePillars(nextPillars);
  };

  const handleAddFeature = async (pillarId, feature) => {
    setErrorMessage(null);
    const nextPillars = addDecisionToPillar(pillars, pillarId, { ...feature, answer: 'Included' });
    await handleUpdatePillars(nextPillars);
  };

  const handleDeleteFeature = async (pillarId, featureId) => {
    setErrorMessage(null);
    const nextPillars = deleteDecisionFromPillar(pillars, pillarId, featureId);
    await handleUpdatePillars(nextPillars);
  };

  const handleEditFeature = async (pillarId, featureId, updates) => {
    setErrorMessage(null);
    const nextPillars = updateNodeDecisions(pillars, featureId, (d) => ({ ...d, ...updates }));
    await handleUpdatePillars(nextPillars);
  };

  return { handleUpdateDecision, handleAddFeature, handleDeleteFeature, handleEditFeature };
}
