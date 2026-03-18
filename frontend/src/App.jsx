import React, { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import PillarWorkspace from './components/PillarWorkspace';
import SettingsModal from './components/SettingsModal';
import { generatePillarsFromIdea, evaluateDecisions } from './services/agentService';
import { generateBlueprintZip } from './services/exportService';
import { saveStateToBackend } from './services/apiService';

function App() {
  const [messages, setMessages] = useState([
    { role: 'agent', content: "Hello! I'm your Cartograph Agent. Describe the application you want to build, and I'll generate the architectural pillars and decision points for us to work through." }
  ]);
  const [isWaiting, setIsWaiting] = useState(false);
  const [pillars, setPillars] = useState([]);
  const [activePillar, setActivePillar] = useState(null);
  const [agentFeedback, setAgentFeedback] = useState([]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [llmConfig, setLlmConfig] = useState({
    keys: { openai: '', anthropic: '', gemini: '' },
    provider: 'mock'
  });

  useEffect(() => {
    const savedKeys = localStorage.getItem('cartograph_keys');
    const savedProvider = localStorage.getItem('cartograph_provider');
    if (savedKeys) setLlmConfig(prev => ({ ...prev, keys: JSON.parse(savedKeys) }));
    if (savedProvider) setLlmConfig(prev => ({ ...prev, provider: savedProvider }));
  }, []);

  const handleSendMessage = async (content) => {
    const newMessages = [...messages, { role: 'user', content }];
    setMessages(newMessages);
    setIsWaiting(true);

    const generatedPillars = await generatePillarsFromIdea(content, llmConfig);
    setMessages([...newMessages, { role: 'agent', content: "I've analyzed your idea and extracted the core pillars. Click on a pillar in the sidebar to begin making architectural decisions." }]);
    setPillars(generatedPillars);
    setIsWaiting(false);

    // Persist to MySQL database through backend API
    await saveStateToBackend(content, generatedPillars);
  };

  const handleUpdateDecision = async (pillarId, decisionId, answer) => {
    const nextPillars = pillars.map(p => {
      if (p.id !== pillarId) return p;
      return {
        ...p,
        decisions: p.decisions.map(d =>
          d.id === decisionId ? { ...d, answer } : d
        )
      };
    });

    setPillars(nextPillars);
    if (activePillar && activePillar.id === pillarId) {
      setActivePillar(nextPillars.find(p => p.id === pillarId));
    }

    const feedback = await evaluateDecisions(nextPillars, llmConfig);
    setAgentFeedback(feedback);
  };

  const handleExport = async () => {
    await generateBlueprintZip(pillars);
  };

  const isExportReady = pillars.length > 0 && pillars.every(p => p.decisions.every(d => d.answer !== null));

  return (
    <div className="app-layout">
      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onSave={config => setLlmConfig(config)}
        />
      )}

      <Sidebar
        pillars={pillars}
        activePillar={activePillar}
        onSelectPillar={setActivePillar}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="main-workspace">
        <header className="workspace-header glass-panel">
          <h3>Architecture Blueprint</h3>
          <button
            className="btn-primary"
            disabled={!isExportReady}
            onClick={handleExport}
            title={isExportReady ? "Export Blueprint" : "Answer all decisions first"}
          >
            Export .zip
          </button>
        </header>

        {agentFeedback.length > 0 && (
          <div className="agent-alerts glass-panel" style={{ padding: '1rem', borderLeft: '3px solid #f59e0b', marginBottom: '1rem' }}>
            <h4 style={{ color: '#f59e0b', marginBottom: '0.5rem' }}>Agent Observations</h4>
            <ul>
              {agentFeedback.map((fb, i) => <li key={i}>{fb}</li>)}
            </ul>
          </div>
        )}

        {activePillar ? (
          <PillarWorkspace
            pillar={activePillar}
            onUpdateDecision={handleUpdateDecision}
            onBack={() => setActivePillar(null)}
          />
        ) : (
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isWaiting={isWaiting}
          />
        )}
      </main>
    </div>
  );
}

export default App;
