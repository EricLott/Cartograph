import React from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import PillarWorkspace from './components/PillarWorkspace';
import SettingsModal from './components/SettingsModal';
import ProjectsPanel from './components/ProjectsPanel';
import GraphView from './components/GraphView';
import ProjectOverview from './components/ProjectOverview';
import DecisionFocusView from './components/DecisionFocusView';
import { VscFileSubmodule, VscGraph, VscBook, VscBell, VscClose, VscChevronDown, VscChevronUp } from 'react-icons/vsc';
import { useAppLogic } from './hooks/useAppLogic';
import { findNodeById } from './utils/treeUtils';
import { listAgentMentions } from './agents/agentRegistry';

const parseRouteFromPath = (pathname = '/') => {
  const parts = String(pathname).split('/').filter(Boolean);
  if (parts.length < 2 || parts[0] !== 'projects') {
    return { projectId: null, viewMode: 'pillar', pillarId: null, decisionId: null };
  }

  const projectId = parts[1];
  const section = parts[2] || 'details';

  if (section === 'graph') {
    return { projectId, viewMode: 'graph', pillarId: null, decisionId: null };
  }
  if (section === 'overview') {
    return { projectId, viewMode: 'overview', pillarId: null, decisionId: null };
  }
  if (section === 'focus') {
    if (parts.length >= 5) {
      return { projectId, viewMode: 'decision', pillarId: parts[3], decisionId: parts[4] };
    }
    return { projectId, viewMode: 'decision', pillarId: null, decisionId: parts[3] || null };
  }
  if (section === 'details') {
    return { projectId, viewMode: 'pillar', pillarId: parts[3] || null, decisionId: null };
  }

  return { projectId, viewMode: 'pillar', pillarId: null, decisionId: null };
};

const buildPathFromState = ({ projectId, viewMode, activePillarId, activeDecisionId }) => {
  if (!projectId) return '/';
  const pid = String(projectId);
  if (viewMode === 'graph') return `/projects/${pid}/graph`;
  if (viewMode === 'overview') return `/projects/${pid}/overview`;
  if (viewMode === 'decision' && activeDecisionId) {
    return activePillarId
      ? `/projects/${pid}/focus/${activePillarId}/${activeDecisionId}`
      : `/projects/${pid}/focus/${activeDecisionId}`;
  }
  if (activePillarId) return `/projects/${pid}/details/${activePillarId}`;
  return `/projects/${pid}/details`;
};

const findPillarContainingDecision = (nodes = [], decisionId) => {
  for (const node of nodes || []) {
    if ((node.decisions || []).some((d) => d.id === decisionId)) {
      return node.id;
    }
    const nested = findPillarContainingDecision(node.subcategories || [], decisionId);
    if (nested) return node.id;
  }
  return null;
};

function App() {
  const mentionHint = React.useMemo(() => listAgentMentions(), []);
  const [chatFocusTrigger, setChatFocusTrigger] = React.useState(0);
  const isApplyingRouteRef = React.useRef(false);
  const hasAppliedInitialRouteRef = React.useRef(false);
  const loadingRouteProjectRef = React.useRef(null);
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
    projectOverview,
    v2State,
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
    llmConfig,
    handleNewProject,
    handleSelectProject,
    handleSendMessage,
    handleUpdateDecision,
    handleAddFeature,
    handleDeleteFeature,
    handleEditFeature,
    handleExport,
    handleSaveLlmConfig
  } = useAppLogic();
  const handleSelectProjectRef = React.useRef(handleSelectProject);

  React.useEffect(() => {
    handleSelectProjectRef.current = handleSelectProject;
  }, [handleSelectProject]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const applyRoute = async () => {
      const route = parseRouteFromPath(window.location.pathname);
      const normalizedProjectId = projectId == null ? null : String(projectId);
      if (!route.projectId) {
        hasAppliedInitialRouteRef.current = true;
        return;
      }

      isApplyingRouteRef.current = true;
      try {
        if (route.projectId !== normalizedProjectId) {
          if (loadingRouteProjectRef.current === route.projectId) return;
          loadingRouteProjectRef.current = route.projectId;
          await handleSelectProjectRef.current(route.projectId);
          return;
        }

        if (route.viewMode === 'graph' || route.viewMode === 'overview') {
          setViewMode(route.viewMode);
          setActiveDecisionId(null);
          if (route.pillarId) setActivePillarId(route.pillarId);
          hasAppliedInitialRouteRef.current = true;
          return;
        }

        if (route.viewMode === 'decision' && route.decisionId) {
          const resolvedPillarId = route.pillarId && findNodeById(pillars, route.pillarId)
            ? route.pillarId
            : findPillarContainingDecision(pillars, route.decisionId);

          if (resolvedPillarId) setActivePillarId(resolvedPillarId);
          setActiveDecisionId(route.decisionId);
          setViewMode('decision');
          hasAppliedInitialRouteRef.current = true;
          return;
        }

        setViewMode('pillar');
        setActiveDecisionId(null);
        if (route.pillarId && findNodeById(pillars, route.pillarId)) {
          setActivePillarId(route.pillarId);
        }
        hasAppliedInitialRouteRef.current = true;
      } finally {
        loadingRouteProjectRef.current = null;
        setTimeout(() => {
          isApplyingRouteRef.current = false;
        }, 0);
      }
    };

    applyRoute();

    const handlePopState = () => {
      applyRoute();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [projectId, pillars]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasAppliedInitialRouteRef.current) return;
    if (isApplyingRouteRef.current) return;

    const nextPath = buildPathFromState({
      projectId,
      viewMode,
      activePillarId,
      activeDecisionId
    });

    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  }, [projectId, viewMode, activePillarId, activeDecisionId]);

  return (
    <div className="app-layout">
      <ProjectsPanel
        currentProjectId={projectId}
        isOpen={isProjectsOpen}
        onSelectProject={handleSelectProject}
        onNewProject={() => {
          if (typeof window !== 'undefined' && window.location.pathname !== '/') {
            window.history.pushState({}, '', '/');
          }
          handleNewProject();
          setChatFocusTrigger((value) => value + 1);
        }}
        onToggle={() => setIsProjectsOpen(!isProjectsOpen)}
      />

      {isSettingsOpen && (
        <SettingsModal
          currentConfig={llmConfig}
          onClose={() => setIsSettingsOpen(false)}
          onSave={handleSaveLlmConfig}
        />
      )}

      <Sidebar
        pillars={pillars}
        domainDiscovery={v2State?.domain_discovery || null}
        activePillarId={activePillarId}
        activeDecisionId={activeDecisionId}
        onSelectPillar={(node) => setActivePillarId(node.id)}
        onSelectDecision={(pillarId, decisionId) => {
          setActivePillarId(pillarId);
          setActiveDecisionId(decisionId);
          setViewMode('decision');
        }}
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
            <button
              className={`btn-secondary ${viewMode === 'overview' ? 'active' : ''}`}
              style={{
                padding: '0.25rem 0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                borderColor: viewMode === 'overview' ? '#f59e0b' : 'rgba(255,255,255,0.1)'
              }}
              onClick={() => setViewMode('overview')}
              title="Project Overview"
            >
              <VscBook /> Overview
            </button>
            {activeDecisionId && (
              <button
                className={`btn-secondary ${viewMode === 'decision' ? 'active' : ''}`}
                style={{
                  padding: '0.25rem 0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  borderColor: viewMode === 'decision' ? '#ef4444' : 'rgba(255,255,255,0.1)'
                }}
                onClick={() => setViewMode('decision')}
                title="Decision Focus"
              >
                Focus
              </button>
            )}
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
                projectId={projectId}
                onSelectDecision={(pillarId, decisionId) => {
                  setActivePillarId(pillarId);
                  setActiveDecisionId(decisionId);
                  setViewMode('decision');
                }} 
              />
            ) : viewMode === 'decision' ? (
              <DecisionFocusView
                pillars={pillars}
                decisionId={activeDecisionId}
                projectId={projectId}
                onApplyDecision={handleUpdateDecision}
                onExitFocus={() => setViewMode('pillar')}
                onJumpToDecision={(pillarId, decisionId) => {
                  setActivePillarId(pillarId);
                  setActiveDecisionId(decisionId);
                  setViewMode('decision');
                }}
              />
            ) : viewMode === 'overview' ? (
              <ProjectOverview markdown={projectOverview} />
            ) : activePillar ? (
              <PillarWorkspace
                pillar={activePillar}
                allPillars={pillars}
                activeDecisionId={activeDecisionId}
                onUpdateDecision={handleUpdateDecision}
                onAddFeature={handleAddFeature}
                onDeleteFeature={handleDeleteFeature}
                onEditFeature={handleEditFeature}
                onJumpToDecision={(pillarId, decisionId) => {
                  setActivePillarId(pillarId);
                  setActiveDecisionId(decisionId);
                  setViewMode('pillar');
                }}
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
              focusTrigger={chatFocusTrigger}
              mentionHint={mentionHint}
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
