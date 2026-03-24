// backend/routes/agentRoutes.js
const express = require('express');
const router = express.Router();
const agentService = require('../services/agentService');

router.post('/agent/complete', async (req, res) => {
    console.log(`[Backend] /agent/complete - Provider: ${req.body.provider}`);
    try {
        const { provider, payload, clientKeys } = req.body;
        if (!provider || !payload) {
            console.warn('[Backend] Missing provider or payload');
            return res.status(400).json({ error: 'Missing provider or completion payload.' });
        }

        const { completion, usage, latency_ms } = await agentService.requestProviderCompletion({ provider, payload, clientKeys });
        res.status(200).json({ 
            completion, 
            usage: { ...usage, latency_ms } 
        });
    } catch (err) {
        console.error('[Backend] LLM Proxy Error detail:', err);
        res.status(502).json({ 
            error: 'Failed to retrieve completion from LLM provider.',
            detail: err.message
        });
    }
});

router.post('/agent/embed', async (req, res) => {
    try {
        const { provider, text, clientKeys } = req.body;
        if (!provider || !text) {
            return res.status(400).json({ error: 'Missing provider or text for embedding.' });
        }

        const { embedding, usage, latency_ms } = await agentService.requestProviderEmbedding({ provider, text, clientKeys });
        res.status(200).json({ 
            embedding, 
            usage: { ...usage, latency_ms } 
        });
    } catch (err) {
        console.error('LLM Embedding Proxy error:', err);
        res.status(502).json({ 
            error: 'Failed to retrieve embedding from LLM provider.',
            detail: err.message
        });
    }
});


module.exports = router;
