export const saveStateToBackend = async (
    idea,
    pillars,
    projectId = null,
    isAgent = false,
    chatHistory = [],
    v2State = null
) => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/save-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, pillars, projectId, isAgent, chatHistory, v2State })
    });
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to save state (Status ${response.status})`);
    }
    return await response.json();
};

export const fetchLatestProject = async () => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/projects/latest`);
    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch latest project (Status ${response.status})`);
    }
    return await response.json();
};

export const fetchAllProjects = async (archived = false) => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/projects?archived=${archived}`);
    if (!response.ok) throw new Error(`Failed to fetch projects (Status ${response.status})`);
    return await response.json();
};

export const fetchProjectById = async (id) => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/projects/${id}`);
    if (!response.ok) throw new Error(`Failed to fetch project ${id} (Status ${response.status})`);
    return await response.json();
};

export const deleteProject = async (id) => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/projects/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(`Failed to delete project ${id} (Status ${response.status})`);
    return await response.json();
};

export const archiveProject = async (id) => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/projects/${id}/archive`, { method: 'PUT' });
    if (!response.ok) throw new Error(`Failed to archive project ${id} (Status ${response.status})`);
    return await response.json();
};

export const fetchAppSettings = async () => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/settings`);
    if (!response.ok) throw new Error(`Failed to fetch app settings (Status ${response.status})`);
    return await response.json();
};

export const saveAppSettings = async (settings) => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
    });
    if (!response.ok) throw new Error(`Failed to save app settings (Status ${response.status})`);
    return await response.json();
};

export const fetchDecisionSemanticNeighbors = async (projectId, decisionId, limit = 8) => {
    if (!projectId || !decisionId) return { decisionId, neighbors: [] };
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/projects/${projectId}/decisions/${decisionId}/semantic?limit=${limit}`);
    if (!response.ok) throw new Error(`Failed to fetch semantic neighbors (Status ${response.status})`);
    return await response.json();
};

export const fetchDecisionSuggestions = async (projectId, decisionId, limit = 6) => {
    if (!projectId || !decisionId) return { decisionId, suggestions: [] };
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/projects/${projectId}/decisions/${decisionId}/suggestions?limit=${limit}`);
    if (!response.ok) throw new Error(`Failed to fetch decision suggestions (Status ${response.status})`);
    return await response.json();
};

export const fetchProjectSemanticLinks = async (projectId, threshold = 0.62, maxLinksPerDecision = 2) => {
    if (!projectId) return { links: [] };
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(
        `${apiUrl}/api/projects/${projectId}/semantic-links?threshold=${threshold}&maxLinksPerDecision=${maxLinksPerDecision}`
    );
    if (!response.ok) throw new Error(`Failed to fetch project semantic links (Status ${response.status})`);
    return await response.json();
};

export const groundPlannerV2 = async (idea, config = null) => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/planner/v2/ground`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, config })
    });
    if (!response.ok) throw new Error(`Failed to run planner.v2 grounding (Status ${response.status})`);
    return await response.json();
};

export const generatePlannerV2 = async (idea, config = null, grounding = null, groundingMeta = null) => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/planner/v2/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, config, grounding, groundingMeta })
    });
    if (!response.ok) throw new Error(`Failed to generate planner.v2 state (Status ${response.status})`);
    return await response.json();
};

export const assessIntakeV2 = async ({
    idea,
    chatHistory = [],
    priorState = null,
    hasArchitecture = false,
    config = null
} = {}) => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/intake/v2/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, chatHistory, priorState, hasArchitecture, config })
    });
    if (!response.ok) throw new Error(`Failed to assess intake.v2 (Status ${response.status})`);
    return await response.json();
};

export const detectConflictsV2 = async (projectState, config = null) => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/conflicts/v2/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectState, config })
    });
    if (!response.ok) throw new Error(`Failed to detect conflicts.v2 (Status ${response.status})`);
    return await response.json();
};

export const resolveConflictsV2 = async (projectState, decisionUpdate, config = null) => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/conflicts/v2/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectState, decisionUpdate, config })
    });
    if (!response.ok) throw new Error(`Failed to resolve conflicts.v2 (Status ${response.status})`);
    return await response.json();
};

export const projectToExecutionV2 = async (projectState) => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/projection/v2/to-execution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectState })
    });
    if (!response.ok) throw new Error(`Failed to project execution.v2 (Status ${response.status})`);
    return await response.json();
};

export const exportBundleV2 = async ({ projectState = null, projectId = null } = {}) => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/export/v2/bundle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectState, projectId })
    });
    if (!response.ok) throw new Error(`Failed to build export.v2 bundle (Status ${response.status})`);
    return await response.json();
};
