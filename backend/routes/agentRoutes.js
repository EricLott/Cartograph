// backend/routes/agentRoutes.js
const express = require('express');
const router = express.Router();
const agentService = require('../services/agentService');

router.post('/agent/complete', async (req, res) => {
    try {
        const { provider, payload } = req.body;
        if (!provider || !payload) {
            return res.status(400).json({ error: 'Missing provider or completion payload.' });
        }

        const { completion, usage, latency_ms } = await agentService.requestProviderCompletion({ provider, payload });
        res.status(200).json({ 
            completion, 
            usage: { ...usage, latency_ms } 
        });
    } catch (err) {
        console.error('LLM Proxy error:', err);
        res.status(502).json({ 
            error: 'Failed to retrieve completion from LLM provider.',
            detail: err.message
        });
    }
});

module.exports = router;
