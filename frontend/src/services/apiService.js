export const saveStateToBackend = async (idea, pillars, projectId = null) => {
    try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/save-state`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idea, pillars, projectId })
        });

        if (!response.ok) {
            throw new Error(`Save-state request failed with status ${response.status}`);
        }

        const payload = await response.json();
        return payload.projectId ?? null;
    } catch (err) {
        console.error("Failed to persist state to backend MySQL instance:", err);
        return null;
    }
};
