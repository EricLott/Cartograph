export const saveStateToBackend = async (idea, pillars, projectId = null, isAgent = false, chatHistory = []) => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/save-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, pillars, projectId, isAgent, chatHistory })
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

export const fetchAllProjects = async () => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/projects`);
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
