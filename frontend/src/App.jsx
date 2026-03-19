import React, { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import PillarWorkspace from './components/PillarWorkspace';
import SettingsModal from './components/SettingsModal';
import { generatePillarsFromIdea, evaluateDecisions, processChatTurn, generateCategoriesForPillar } from './services/agentService';
import { generateBlueprintZip } from './services/exportService';
import { saveStateToBackend } from './services/apiService';

function App() {
  const [messages, setMessages] = useState([
    { role: 'agent', content: "Hello! I'm your Cartograph Agent. Describe the application you want to build, and I'll generate the architectural pillars for us to work through. We can chat about decisions, or you can supply them directly." }
  ]);
  const [isWaiting, setIsWaiting] = useState(false);
  const [pillars, setPillars] = useState([]);
  const [activePillar, setActivePillar] = useState(null);
  const [agentFeedback, setAgentFeedback] = useState([]);
  const [projectId, setProjectId] = useState(null);

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

    if (pillars.length === 0) {
      const generatedPillars = await generatePillarsFromIdea(content, llmConfig);
      setMessages([...newMessages, { role: 'agent', content: "I've extracted the top-level pillars rapidly. I am now deploying sub-agents in parallel to draft the specific categories and decisions..." }]);
      setPillars(generatedPillars);
      setIsWaiting(false); // Release the lock so UI updates

      const parallelPromises = generatedPillars.map(async (pillar) => {
        const subData = await generateCategoriesForPillar(content, pillar, llmConfig);
        setPillars(current => current.map(p => {
          if (p.id === pillar.id) {
            return { ...p, subcategories: subData.subcategories || [], decisions: subData.decisions || [] };
          }
          return p;
        }));
        return subData;
      });

      await Promise.all(parallelPromises);

      setMessages(msgs => [...msgs, { role: 'agent', content: "All sub-agents have reported back. The architectural framework is fully staged! Which area would you like to discuss first?" }]);

      const finalPillars = await Promise.all(generatedPillars.map(async (p, idx) => {
        const subData = await parallelPromises[idx];
        return { ...p, subcategories: subData.subcategories || [], decisions: subData.decisions || [] };
      }));
      const savedProjectId = await saveStateToBackend(content, finalPillars, projectId);
      if (savedProjectId) {
        setProjectId(savedProjectId);
      }
    } else {
      const result = await processChatTurn(newMessages, pillars, llmConfig);

      let nextPillars = [...pillars];
      if (result.newCategories && result.newCategories.length > 0) {
        nextPillars = [...nextPillars, ...result.newCategories];
      }

      if (result.updatedDecisions && result.updatedDecisions.length > 0) {
        const updateNodeDecisions = (nodes) => {
          return nodes.map(node => {
            let newNode = { ...node };
            if (newNode.decisions) {
              newNode.decisions = newNode.decisions.map(d => {
                const update = result.updatedDecisions.find(u => u.id === d.id);
                return update ? { ...d, answer: update.answer } : d;
              });
            }
            if (newNode.subcategories && newNode.subcategories.length > 0) {
              newNode.subcategories = updateNodeDecisions(newNode.subcategories);
            }
            return newNode;
          });
        };
        nextPillars = updateNodeDecisions(nextPillars);
      }

      setPillars(nextPillars);
      setMessages([...newMessages, { role: 'agent', content: result.reply }]);

      if (result.conflicts && result.conflicts.length > 0) {
        setAgentFeedback(result.conflicts.map(c => `Conflict: ${c.description}`));
      } else {
        setAgentFeedback([]);
      }

      const ideaMsg = newMessages.find(m => m.role === 'user');
      if (ideaMsg) {
        const savedProjectId = await saveStateToBackend(ideaMsg.content, nextPillars, projectId);
        if (savedProjectId) {
          setProjectId(savedProjectId);
        }
      }
    }

    setIsWaiting(false);
  };

  const handleUpdateDecision = async (pillarId, decisionId, answer) => {
    const updateNodeDecisions = (nodes) => {
      return nodes.map(node => {
        let newNode = { ...node };
        if (newNode.decisions) {
          newNode.decisions = newNode.decisions.map(d =>
            d.id === decisionId ? { ...d, answer } : d
          );
        }
        if (newNode.subcategories && newNode.subcategories.length > 0) {
          newNode.subcategories = updateNodeDecisions(newNode.subcategories);
        }
        return newNode;
      });
    };

    const nextPillars = updateNodeDecisions(pillars);
    setPillars(nextPillars);

    // activePillar might be deeply nested, we don't strictly re-find it right now 
    // but React's state linkage works down safely as long as object ref passes correctly, 
    // actually we should just reset activePillar to null or let it be stale, but it's simpler to just let React re-render.
    // For now we just close the activePillar.
    setActivePillar(null);

    const ideaMsg = messages.find(m => m.role === 'user');
    if (ideaMsg) {
      const savedProjectId = await saveStateToBackend(ideaMsg.content, nextPillars, projectId);
      if (savedProjectId) {
        setProjectId(savedProjectId);
      }
    }

    setAgentFeedback([]);
  };

  const handleExport = async () => {
    await generateBlueprintZip(pillars);
  };

  const checkAllAnswered = (nodes) => {
    return nodes.every(p => {
      const parentAns = p.decisions ? p.decisions.every(d => d.answer !== null && d.answer !== "") : true;
      const childAns = (p.subcategories && p.subcategories.length > 0) ? checkAllAnswered(p.subcategories) : true;
      return parentAns && childAns;
    });
  };

  const isExportReady = pillars.length > 0 && checkAllAnswered(pillars);

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

        <div className="workspace-content" style={{ display: 'flex', gap: '1rem', height: 'calc(100vh - 120px)' }}>
          <div className="pillar-details-pane" style={{ flex: 1, overflowY: 'auto' }}>
            {activePillar ? (
              <PillarWorkspace
                pillar={activePillar}
                onUpdateDecision={handleUpdateDecision}
                onBack={() => setActivePillar(null)}
              />
            ) : (
              <div className="glass-panel" style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', opacity: 0.7 }}>
                <h2>Blueprint Overview</h2>
                <p>Select a node from the sidebar to view its extracted details.</p>
              </div>
            )}
          </div>
          <div className="chat-pane" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isWaiting={isWaiting}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
