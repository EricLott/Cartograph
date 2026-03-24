import React from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import PillarWorkspace from './components/PillarWorkspace';
import SettingsModal from './components/SettingsModal';
import ProjectsPanel from './components/ProjectsPanel';
import GraphView from './components/GraphView';
import { VscFileSubmodule, VscGraph, VscBell, VscClose, VscChevronDown, VscChevronUp } from 'react-icons/vsc';
import { useAppLogic } from './hooks/useAppLogic';

function App() {
  const {
    messages,
    isWaiting,
    pillars,
    activePillarId,
    setActivePillarId,
    activeDecisionId,
    setActiveDecisionId,
    activePillar,
    agentFeedback,
    projectId,
    errorMessage,
    setErrorMessage,
    isProjectsOpen,
    setIsProjectsOpen,
    viewMode,
    setViewMode,
    isSettingsOpen,
    setIsSettingsOpen,
    isNotificationsOpen,
    setIsNotificationsOpen,
    setLlmConfig,
    handleNewProject,
    handleSelectProject,
    handleSendMessage,
    handleUpdateDecision,
    handleExport
  } = useAppLogic();

  return (
    <div className="app-layout">
      <ProjectsPanel
        currentProjectId={projectId}
        isOpen={isProjectsOpen}
        onSelectProject={handleSelectProject}
        onNewProject={handleNewProject}
        onToggle={() => setIsProjectsOpen(!isProjectsOpen)}
      />

      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onSave={config => setLlmConfig(config)}
        />
      )}

      <Sidebar
        pillars={pillars}
        activePillarId={activePillarId}
        onSelectPillar={(node) => setActivePillarId(node.id)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="main-workspace">
        <header className="workspace-header glass-panel">
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              className={`btn-secondary ${viewMode === 'pillar' ? 'active' : ''}`}
              style={{ 
                padding: '0.25rem 0.5rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.25rem', 
                borderColor: viewMode === 'pillar' ? '#3b82f6' : 'rgba(255,255,255,0.1)' 
              }}
              onClick={() => setViewMode('pillar')}
              title="Pillar Details"
            >
              <VscFileSubmodule /> Details
            </button>
            <button 
              className={`btn-secondary ${viewMode === 'graph' ? 'active' : ''}`}
              style={{ 
                padding: '0.25rem 0.5rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.25rem', 
                borderColor: viewMode === 'graph' ? '#10b981' : 'rgba(255,255,255,0.1)' 
              }}
              onClick={() => setViewMode('graph')}
              title="Dependency Graph"
            >
              <VscGraph /> Graph
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <h3 style={{ margin: 0 }}>Architecture Blueprint</h3>
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}>
              <VscBell size={20} style={{ opacity: 0.7 }} />
              {agentFeedback.metadataReport.length > 0 && (
                <span className="notification-badge">
                  {agentFeedback.metadataReport.length}
                </span>
              )}
            </div>
          </div>
          <button
            className="btn-primary"
            onClick={handleExport}
            title="Export Blueprint"
          >
            Export .zip
          </button>
        </header>

        {errorMessage && (
          <div className="agent-alerts glass-panel" style={{ padding: '1rem', borderLeft: '3px solid #ef4444', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ color: '#ef4444', marginBottom: '0.25rem' }}>System Error</h4>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>{errorMessage}</p>
            </div>
            <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setErrorMessage(null)}>Dismiss</button>
          </div>
        )}

        <NotificationTray 
          isOpen={isNotificationsOpen} 
          onClose={() => setIsNotificationsOpen(false)}
          feedback={agentFeedback}
          activePillarId={activePillarId}
        />

        <div className="workspace-content" style={{ display: 'flex', gap: '1rem', height: 'calc(100vh - 120px)' }}>
          <div className="pillar-details-pane" style={{ flex: 1, overflowY: viewMode === 'graph' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>
            {viewMode === 'graph' ? (
              <GraphView 
                pillars={pillars} 
                onSelectDecision={(pillarId, decisionId) => {
                  setActivePillarId(pillarId);
                  setActiveDecisionId(decisionId);
                  setViewMode('pillar');
                }} 
              />
            ) : activePillar ? (
              <PillarWorkspace
                pillar={activePillar}
                activeDecisionId={activeDecisionId}
                onUpdateDecision={handleUpdateDecision}
                onAddFeature={handleAddFeature}
                onDeleteFeature={handleDeleteFeature}
                onEditFeature={handleEditFeature}
                onBack={() => {
                  setActivePillarId(null);
                  setActiveDecisionId(null);
                }}
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

function NotificationTray({ isOpen, onClose, feedback, activePillarId }) {
  const [isExpanded, setIsExpanded] = React.useState(true);

  const filteredItems = React.useMemo(() => {
    if (!activePillarId) return feedback.metadataReport;
    return feedback.metadataReport.filter(item => item.pillarId === activePillarId || item.type === 'global');
  }, [feedback.metadataReport, activePillarId]);

  const groups = React.useMemo(() => {
    const g = { errors: [], warnings: [], info: [] };
    filteredItems.forEach(item => {
      if (item.severity === 'error') g.errors.push(item);
      else if (item.severity === 'warning') g.warnings.push(item);
      else g.info.push(item);
    });
    return g;
  }, [filteredItems]);

  return (
    <>
      {isOpen && <div className="modal-overlay" style={{ background: 'transparent' }} onClick={onClose} />}
      <div className={`notification-tray ${isOpen ? 'open' : ''}`}>
        <div className="notification-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <VscBell size={20} />
            <h4 style={{ margin: 0 }}>Agent Observations</h4>
          </div>
          <button className="btn-secondaryIcon" onClick={onClose} style={{ padding: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <VscClose size={20} />
          </button>
        </div>

        <div className="notification-content">
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {activePillarId ? 'Active Pillar View' : 'Global Overview'}
            </span>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              style={{ background: 'transparent', border: 'none', color: 'var(--accent-color)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              {isExpanded ? <><VscChevronUp /> Collapse</> : <><VscChevronDown /> Expand</>}
            </button>
          </div>

          {isExpanded && (
            <div className="notification-list">
              {filteredItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', opacity: 0.6 }}>
                  No observations for this view.
                </div>
              ) : (
                <>
                  {groups.errors.length > 0 && <div className="section-title">Critical Blockers</div>}
                  {groups.errors.map((item, i) => (
                    <div key={`err-${i}`} className="notification-item error">
                      <strong>{item.title || 'Error'}</strong>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', opacity: 0.8 }}>{item.message}</p>
                    </div>
                  ))}

                  {groups.warnings.length > 0 && <div className="section-title">Quality Warnings</div>}
                  {groups.warnings.map((item, i) => (
                    <div key={`warn-${i}`} className="notification-item warning">
                      <strong>{item.title || 'Warning'}</strong>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', opacity: 0.8 }}>{item.message}</p>
                    </div>
                  ))}

                  {groups.info.length > 0 && <div className="section-title">Context Tips</div>}
                  {groups.info.map((item, i) => (
                    <div key={`info-${i}`} className="notification-item info">
                      <strong>{item.title || 'Tip'}</strong>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', opacity: 0.8 }}>{item.message}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default App;
