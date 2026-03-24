import { useEffect } from 'react';
import { fetchLatestProject, fetchProjectById } from '../services/apiService';

export function useProjectManagement(state, setters) {
  const { setMessages, setPillars, setActivePillarId, setIsWaiting, setErrorMessage, setIsProjectsOpen, setProjectId } = setters;
  const fallbackWelcome = { role: 'agent', content: "Hello! I'm your Cartograph Agent. Describe the application you want to build, and I'll generate the architectural pillars for us to work through." };

  useEffect(() => {
    async function hydrate() {
      setIsWaiting(true);
      try {
        const data = await fetchLatestProject();
        if (data && data.projectId) {
          setProjectId(data.projectId);
          setPillars(data.pillars || []);
          const restoredMessages = Array.isArray(data.chatHistory) && data.chatHistory.length > 0
            ? data.chatHistory
            : [
              fallbackWelcome,
              { role: 'user', content: data.idea },
              { role: 'agent', content: "I've restored your latest session. The architectural framework is fully staged! Which area would you like to discuss first?" }
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
  }, [setIsWaiting, setMessages, setPillars, setProjectId]); // Only once on mount (setters are stable)

  const handleNewProject = () => {
    setProjectId(null);
    setPillars([]);
    setActivePillarId(null);
    setIsProjectsOpen(false);
    setMessages([
      { role: 'agent', content: "New session started! Describe the application you want to build." }
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
        setActivePillarId(null);
        const restoredMessages = Array.isArray(data.chatHistory) && data.chatHistory.length > 0
          ? data.chatHistory
          : [
            { role: 'agent', content: "I've restored your session." },
            { role: 'user', content: data.idea },
            { role: 'agent', content: "Restored from your project history. What would you like to refine?" }
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
