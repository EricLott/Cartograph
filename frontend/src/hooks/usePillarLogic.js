import { updateNodeDecisions, findNodeById } from '../utils/treeUtils';
import { saveStateToBackend } from '../services/apiService';

export function usePillarLogic(state, setters) {
  const { pillars, messages, projectId } = state;
  const { setPillars, setProjectId, setErrorMessage, setAgentFeedback, setActivePillarId } = setters;

  const handleUpdateDecision = async (pillarId, decisionId, answer) => {
    setErrorMessage(null);
    const nextPillars = updateNodeDecisions(pillars, decisionId, (d) => ({ ...d, answer }));
    setPillars(nextPillars);
    // Removed setActivePillarId(null); to preserve UI context after update

    try {
      const ideaMsg = messages.find(m => m.role === 'user');
      if (ideaMsg) {
        const resultData = await saveStateToBackend(ideaMsg.content, nextPillars, projectId);
        if (resultData?.projectId) setProjectId(resultData.projectId);
      }
    } catch (err) {
      setErrorMessage("Failed to save decision.");
    } finally {
      setAgentFeedback([]);
    }
  };

  return { handleUpdateDecision };
}
