import { useState, useMemo, useEffect } from 'react';
import { validateBlueprint } from '../services/validationService';
import { useChatLogic } from './useChatLogic';
import { usePillarLogic } from './usePillarLogic';
import { useProjectManagement } from './useProjectManagement';
import { generateBlueprintZip } from '../services/exportService';
import { findNodeById } from '../utils/treeUtils';
import { fetchAppSettings, saveAppSettings } from '../services/apiService';

const DEFAULT_MODELS = {
  openai: { interactions: 'gpt-4o', planner: 'gpt-4o', suggestions: 'gpt-4o-mini', conflicts: 'gpt-4o' },
  anthropic: { interactions: 'claude-3-5-sonnet-20240620', planner: 'claude-3-5-sonnet-20240620', suggestions: 'claude-3-5-sonnet-20240620', conflicts: 'claude-3-5-sonnet-20240620' },
  gemini: { interactions: 'gemini-1.5-pro', planner: 'gemini-1.5-pro', suggestions: 'gemini-1.5-flash', conflicts: 'gemini-1.5-pro' }
};

export function useAppLogic() {
  // 1. Core State
  const [messages, setMessages] = useState([
    {
      role: 'agent',
      agentId: 'coordinator',
      agentLabel: 'Cartograph Coordinator',
      content: "Hello! I'm your Cartograph team chat. Mention @pm for requirements discovery or @architect for design updates."
    }
  ]);
  const [isWaiting, setIsWaiting] = useState(false);
  const [pillars, setPillars] = useState([]);
  const [activePillarId, setActivePillarId] = useState(null);
  const [activeDecisionId, setActiveDecisionId] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [projectOverview, setProjectOverview] = useState('');
  const [v2State, setV2State] = useState({});
  const [errorMessage, setErrorMessage] = useState(null);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [viewMode, setViewMode] = useState('pillar');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [llmConfig, setLlmConfig] = useState({
    keys: { openai: '', anthropic: '', gemini: '' },
    provider: 'mock',
    models: DEFAULT_MODELS
  });

  // 2. Logic Containers
  const setters = {
    setMessages, setIsWaiting, setPillars, setActivePillarId, setActiveDecisionId,
    setProjectId, setErrorMessage, setIsProjectsOpen,
    setProjectOverview, setV2State,
    setViewMode, setIsSettingsOpen, setIsNotificationsOpen, setLlmConfig
  };

  const state = {
    messages, isWaiting, pillars, activePillarId, activeDecisionId,
    projectId, projectOverview, v2State, errorMessage, isProjectsOpen,
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
            keys: settings.keys || { openai: '', anthropic: '', gemini: '' },
            models: settings.models || DEFAULT_MODELS
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
      await generateBlueprintZip(pillars, { projectId, version: '0.1.0' }, force, v2State);
    } catch (err) {
      if (err.isWarning) {
        // Show the warning as a confirm dialog
        if (window.confirm(err.message)) {
          // Retry with force
          try {
            await generateBlueprintZip(pillars, { projectId, version: '0.1.0' }, true, v2State);
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
        keys: saved.keys || config.keys || { openai: '', anthropic: '', gemini: '' },
        models: saved.models || config.models || DEFAULT_MODELS
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
    setViewMode, setIsSettingsOpen, setIsNotificationsOpen, setLlmConfig, setProjectOverview, setV2State,
    handleNewProject, handleSelectProject,
    handleSendMessage, handleUpdateDecision, handleAddFeature, handleDeleteFeature, handleEditFeature, handleExport,
    activePillar, handleSaveLlmConfig
  };
}
