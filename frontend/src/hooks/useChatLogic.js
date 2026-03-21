import { generatePillarsFromIdea, processChatTurn, generateCategoriesForPillar } from '../services/agentService';
import { saveStateToBackend } from '../services/apiService';
import { updateNodeDecisions } from '../utils/treeUtils';

export function useChatLogic(state, setters) {
  const { messages, pillars, projectId, llmConfig } = state;
  const { setMessages, setPillars, setIsWaiting, setProjectId, setErrorMessage, setAgentFeedback } = setters;

  const handleSendMessage = async (content) => {
    setErrorMessage(null);
    const newMessages = [...messages, { role: 'user', content }];
    setMessages(newMessages);
    setIsWaiting(true);

    try {
      if (pillars.length === 0) {
        await handleInitialIdea(content, newMessages);
      } else {
        await handleSubsequentTurn(newMessages);
      }
    } catch (err) {
      console.error("Chat flow failed:", err);
      setMessages(msgs => [...msgs, { role: 'agent', content: "An error occurred." }]);
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsWaiting(false);
    }
  };

  const handleInitialIdea = async (content, newMessages) => {
    const generatedPillars = await generatePillarsFromIdea(content, llmConfig);
    setMessages([...newMessages, { role: 'agent', content: "Extracting pillars..." }]);
    setPillars(generatedPillars);
    setIsWaiting(false);

    const results = await Promise.all(generatedPillars.map(async (pillar) => {
      try {
        const subData = await generateCategoriesForPillar(content, pillar, llmConfig);
        setPillars(current => current.map(p => {
          if (p.id === pillar.id) {
            return { ...p, subcategories: subData.subcategories || [], decisions: subData.decisions || [] };
          }
          return p;
        }));
        return subData;
      } catch {
        return { subcategories: [], decisions: [] };
      }
    }));

    setMessages(msgs => [...msgs, { role: 'agent', content: "All set!" }]);
    const finalPillars = generatedPillars.map((p, idx) => ({
      ...p, subcategories: results[idx].subcategories || [], decisions: results[idx].decisions || []
    }));
    const resultData = await saveStateToBackend(content, finalPillars, null);
    if (resultData?.projectId) setProjectId(resultData.projectId);
  };

  const handleSubsequentTurn = async (newMessages) => {
    const result = await processChatTurn(newMessages, pillars, llmConfig);
    let nextPillars = [...pillars];
    if (result.newCategories?.length > 0) nextPillars = [...nextPillars, ...result.newCategories];
    if (result.updatedDecisions?.length > 0) {
      nextPillars = updateNodeDecisions(nextPillars, result.updatedDecisions, (d, update) => ({ ...d, answer: update.answer }));
    }
    if (result.conflicts?.length > 0) {
      result.conflicts.forEach(conflict => {
        nextPillars = updateNodeDecisions(nextPillars, conflict.decisionIds, (d) => ({ ...d, conflict: conflict.description }));
      });
    }
    setPillars(nextPillars);
    setMessages([...newMessages, { role: 'agent', content: result.reply }]);
    setAgentFeedback(result.conflicts?.map(c => `Conflict: ${c.description}`) || []);

    const ideaMsg = newMessages.find(m => m.role === 'user');
    if (ideaMsg) {
      const resultData = await saveStateToBackend(ideaMsg.content, nextPillars, projectId);
      if (resultData?.projectId) setProjectId(resultData.projectId);
    }
  };

  return { handleSendMessage };
}
