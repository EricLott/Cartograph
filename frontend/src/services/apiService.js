export const saveStateToBackend = async (idea, pillars) => {
    try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        await fetch(`${apiUrl}/api/save-state`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idea, pillars })
        });
    } catch (err) {
        console.error("Failed to persist state to backend MySQL instance:", err);
    }
};
