export const saveStateToBackend = async (idea, pillars, projectId = null) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/save-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, pillars, projectId })
    });
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to save state (Status ${response.status})`);
    }
    return await response.json();
};

export const fetchLatestProject = async () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/projects/latest`);
    if (!response.ok) {
        if (response.status === 404) return null; // Expected if no project yet
        throw new Error(`Failed to fetch latest project (Status ${response.status})`);
    }
    return await response.json();
};
