import { useState, useEffect } from 'react';
import { validateBlueprint } from '../services/validationService';
import { useChatLogic } from './useChatLogic';
import { usePillarLogic } from './usePillarLogic';
import { useProjectManagement } from './useProjectManagement';
import { generateBlueprintZip } from '../services/exportService';
import { findNodeById } from '../utils/treeUtils';

export function useAppLogic() {
  // 1. Core State
  const [messages, setMessages] = useState([
    { role: 'agent', content: "Hello! I'm your Cartograph Agent. Describe the application you want to build, and I'll generate the architectural pillars for us to work through." }
  ]);
  const [isWaiting, setIsWaiting] = useState(false);
  const [pillars, setPillars] = useState([]);
  const [activePillarId, setActivePillarId] = useState(null);
  const [agentFeedback, setAgentFeedback] = useState([]);
  const [projectId, setProjectId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [viewMode, setViewMode] = useState('pillar');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [llmConfig, setLlmConfig] = useState(() => {
    const savedKeys = localStorage.getItem('cartograph_keys');
    const savedProvider = localStorage.getItem('cartograph_provider');
    return {
      keys: savedKeys ? JSON.parse(savedKeys) : { openai: '', anthropic: '', gemini: '' },
      provider: savedProvider || 'mock'
    };
  });

  // 2. Logic Containers
  const setters = {
    setMessages, setIsWaiting, setPillars, setActivePillarId,
    setAgentFeedback, setProjectId, setErrorMessage, setIsProjectsOpen,
    setViewMode, setIsSettingsOpen, setLlmConfig
  };

  const state = {
    messages, isWaiting, pillars, activePillarId,
    agentFeedback, projectId, errorMessage, isProjectsOpen,
    viewMode, isSettingsOpen, llmConfig
  };

  const { handleNewProject, handleSelectProject } = useProjectManagement(state, setters);
  const { handleSendMessage } = useChatLogic(state, setters);
  const { handleUpdateDecision } = usePillarLogic(state, setters);

  // 3. Proactive Validation
  useEffect(() => {
    if (pillars.length === 0) {
      setAgentFeedback([]);
      return;
    }

    const validation = validateBlueprint({ pillars });
    const observations = [
      ...validation.errors,
      ...validation.warnings
    ];
    setAgentFeedback(observations);
  }, [pillars]);

  const handleExport = async (force = false) => {
    setErrorMessage(null);
    try {
      await generateBlueprintZip(pillars, { projectId, version: '0.1.0' }, force);
    } catch (err) {
      if (err.isWarning) {
        // Show the warning as a confirm dialog
        if (window.confirm(err.message)) {
          // Retry with force
          try {
            await generateBlueprintZip(pillars, { projectId, version: '0.1.0' }, true);
          } catch (retryErr) {
            setErrorMessage(retryErr.message);
          }
        }
      } else {
        setErrorMessage(err.message);
      }
    }
  };

  const activePillar = activePillarId ? findNodeById(pillars, activePillarId) : null;

  return {
    ...state,
    setActivePillarId, setErrorMessage, setIsProjectsOpen,
    setViewMode, setIsSettingsOpen, setLlmConfig,
    handleNewProject, handleSelectProject,
    handleSendMessage, handleUpdateDecision, handleExport,
    activePillar
  };
}
