import { useEffect } from 'react';
import { fetchLatestProject, fetchProjectById } from '../services/apiService';

export function useProjectManagement(state, setters) {
  const {
    setMessages,
    setPillars,
    setActivePillarId,
    setActiveDecisionId,
    setViewMode,
    setIsWaiting,
    setErrorMessage,
    setIsProjectsOpen,
    setProjectId,
    setProjectOverview,
    setV2State
  } = setters;
  const fallbackWelcome = {
    role: 'agent',
    agentId: 'coordinator',
    agentLabel: 'Cartograph Coordinator',
    content: "Hello! I'm your Cartograph team chat. Mention @pm for requirements discovery or @architect for design updates."
  };

  useEffect(() => {
    async function hydrate() {
      setIsWaiting(true);
      try {
        const data = await fetchLatestProject();
        if (data && data.projectId) {
          setProjectId(data.projectId);
          setPillars(data.pillars || []);
          setProjectOverview(typeof data.projectOverview === 'string' ? data.projectOverview : '');
          setV2State(data.v2State && typeof data.v2State === 'object' ? data.v2State : {});
          const restoredMessages = Array.isArray(data.chatHistory) && data.chatHistory.length > 0
            ? data.chatHistory
            : [
              fallbackWelcome,
              { role: 'user', content: data.idea },
              {
                role: 'agent',
                agentId: 'coordinator',
                agentLabel: 'Cartograph Coordinator',
                content: "I've restored your latest session. Mention @architect to continue solution design or @pm to refine requirements."
              }
            ];
          setMessages(restoredMessages);
        }
      } catch (err) {
        console.error("Hydration failed:", err);
      } finally {
        setIsWaiting(false);
      }
    }
    hydrate();
  }, [setIsWaiting, setMessages, setPillars, setProjectId, setProjectOverview, setV2State]); // Only once on mount (setters are stable)

  const handleNewProject = () => {
    setProjectId(null);
    setPillars([]);
    setProjectOverview('');
    setV2State({});
    setActivePillarId(null);
    setActiveDecisionId(null);
    setViewMode('pillar');
    setIsProjectsOpen(false);
    setMessages([
      {
        role: 'agent',
        agentId: 'coordinator',
        agentLabel: 'Cartograph Coordinator',
        content: "New session started! Describe the application you want to build. You can mention @pm or @architect anytime."
      }
    ]);
  };

  const handleSelectProject = async (id) => {
    setIsWaiting(true);
    setIsProjectsOpen(false);
    try {
      const data = await fetchProjectById(id);
      if (data) {
        setProjectId(data.projectId);
        setPillars(data.pillars || []);
        setProjectOverview(typeof data.projectOverview === 'string' ? data.projectOverview : '');
        setV2State(data.v2State && typeof data.v2State === 'object' ? data.v2State : {});
        setActivePillarId(null);
        const restoredMessages = Array.isArray(data.chatHistory) && data.chatHistory.length > 0
          ? data.chatHistory
          : [
            { role: 'agent', agentId: 'coordinator', agentLabel: 'Cartograph Coordinator', content: "I've restored your session." },
            { role: 'user', content: data.idea },
            {
              role: 'agent',
              agentId: 'coordinator',
              agentLabel: 'Cartograph Coordinator',
              content: "Restored from your project history. What would you like to refine?"
            }
          ];
        setMessages(restoredMessages);
      }
    } catch (err) {
      console.error("Failed to load project:", err);
      setErrorMessage("Could not load the selected project.");
    } finally {
      setIsWaiting(false);
    }
  };

  return { handleNewProject, handleSelectProject };
}
