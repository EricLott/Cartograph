import { useState, useMemo, useEffect } from 'react';
import { validateBlueprint } from '../services/validationService';
import { useChatLogic } from './useChatLogic';
import { usePillarLogic } from './usePillarLogic';
import { useProjectManagement } from './useProjectManagement';
import { generateBlueprintZip } from '../services/exportService';
import { findNodeById } from '../utils/treeUtils';
import { fetchAppSettings, saveAppSettings } from '../services/apiService';

export function useAppLogic() {
  // 1. Core State
  const [messages, setMessages] = useState([
    { role: 'agent', content: "Hello! I'm your Cartograph Agent. Describe the application you want to build, and I'll generate the architectural pillars for us to work through." }
  ]);
  const [isWaiting, setIsWaiting] = useState(false);
  const [pillars, setPillars] = useState([]);
  const [activePillarId, setActivePillarId] = useState(null);
  const [activeDecisionId, setActiveDecisionId] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [projectOverview, setProjectOverview] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [viewMode, setViewMode] = useState('pillar');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [llmConfig, setLlmConfig] = useState({
    keys: { openai: '', anthropic: '', gemini: '' },
    provider: 'mock'
  });

  // 2. Logic Containers
  const setters = {
    setMessages, setIsWaiting, setPillars, setActivePillarId, setActiveDecisionId,
    setProjectId, setErrorMessage, setIsProjectsOpen,
    setProjectOverview,
    setViewMode, setIsSettingsOpen, setIsNotificationsOpen, setLlmConfig
  };

  const state = {
    messages, isWaiting, pillars, activePillarId, activeDecisionId,
    projectId, projectOverview, errorMessage, isProjectsOpen,
    viewMode, isSettingsOpen, isNotificationsOpen, llmConfig
  };

  const { handleNewProject, handleSelectProject } = useProjectManagement(state, setters);
  const { handleSendMessage } = useChatLogic(state, setters);
  const { handleUpdateDecision, handleAddFeature, handleDeleteFeature, handleEditFeature } = usePillarLogic(state, setters);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const settings = await fetchAppSettings();
        if (isMounted) {
          setLlmConfig({
            provider: settings.provider || 'mock',
            keys: settings.keys || { openai: '', anthropic: '', gemini: '' }
          });
        }
      } catch (err) {
        console.error('Failed to load backend app settings:', err);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // 3. Proactive Validation (Derived observations)
  const agentFeedback = useMemo(() => {
    if (pillars.length === 0) return { isValid: true, errors: [], warnings: [], metadataReport: [] };
    return validateBlueprint({ pillars });
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

  const handleSaveLlmConfig = async (config) => {
    setErrorMessage(null);
    try {
      const saved = await saveAppSettings(config);
      setLlmConfig({
        provider: saved.provider || config.provider || 'mock',
        keys: saved.keys || config.keys || { openai: '', anthropic: '', gemini: '' }
      });
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save settings.');
      throw err;
    }
  };

  const activePillar = activePillarId ? findNodeById(pillars, activePillarId) : null;

  return {
    ...state,
    agentFeedback,
    setActivePillarId, setActiveDecisionId, setErrorMessage, setIsProjectsOpen,
    setViewMode, setIsSettingsOpen, setIsNotificationsOpen, setLlmConfig, setProjectOverview,
    handleNewProject, handleSelectProject,
    handleSendMessage, handleUpdateDecision, handleAddFeature, handleDeleteFeature, handleEditFeature, handleExport,
    activePillar, handleSaveLlmConfig
  };
}
