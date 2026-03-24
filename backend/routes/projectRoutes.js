const express = require('express');
const router = express.Router();
const { Project, AppSettings } = require('../models');
const { 
    getProjectTree, 
    saveProjectState, 
    linkDecisions, 
    getDecisionGraph 
} = require('../services/projectService');
const { getProjectClusters } = require('../services/clusteringService');

// Get all projects
router.get('/projects', async (req, res) => {
    try {
        const projects = await Project.findAll({
            where: { archived: false },
            attributes: ['id', 'idea', 'createdAt'],
            order: [['createdAt', 'DESC']]
        });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get latest project
router.get('/projects/latest', async (req, res) => {
    try {
        const project = await Project.findOne({ order: [['createdAt', 'DESC']] });
        if (!project) return res.json({});
        const tree = await getProjectTree(project.id);
        res.json(tree);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get project by ID
router.get('/projects/:id', async (req, res) => {
    try {
        const tree = await getProjectTree(req.params.id);
        if (!tree) return res.status(404).json({ error: 'Project not found' });
        res.json(tree);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete project
router.delete('/projects/:id', async (req, res) => {
    try {
        const deleted = await Project.destroy({ where: { id: req.params.id } });
        if (!deleted) return res.status(404).json({ error: 'Project not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Archive project (soft delete)
router.put('/projects/:id/archive', async (req, res) => {
    try {
        const updated = await Project.update(
            { archived: true },
            { where: { id: req.params.id } }
        );
        if (!updated[0]) return res.status(404).json({ error: 'Project not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save project state (new or update)
router.post('/save-state', async (req, res) => {
    try {
        const { idea, pillars, projectId, isAgent, chatHistory } = req.body;

        if (!idea || typeof idea !== 'string' || !idea.trim()) {
            return res.status(400).json({ error: 'Missing or empty idea.' });
        }
        if (!Array.isArray(pillars)) {
            return res.status(400).json({ error: 'pillars must be an array.' });
        }

        const resultId = await saveProjectState(idea, pillars, projectId, isAgent, chatHistory);
        res.json({ success: true, projectId: resultId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// App settings (persisted server-side, no local-only storage)
router.get('/settings', async (req, res) => {
    try {
        const [settings] = await AppSettings.findOrCreate({
            where: { singletonKey: 'global' },
            defaults: {
                singletonKey: 'global',
                provider: 'mock',
                keys: { openai: '', anthropic: '', gemini: '' }
            }
        });
        res.json({ provider: settings.provider, keys: settings.keys || {} });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/settings', async (req, res) => {
    try {
        const provider = typeof req.body.provider === 'string' ? req.body.provider : 'mock';
        const keys = req.body.keys && typeof req.body.keys === 'object' ? req.body.keys : {};
        const [settings] = await AppSettings.findOrCreate({
            where: { singletonKey: 'global' },
            defaults: { singletonKey: 'global', provider, keys }
        });
        await settings.update({ provider, keys });
        res.json({ success: true, provider: settings.provider, keys: settings.keys || {} });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Link decisions
router.post('/decisions/:id/link', async (req, res) => {
    try {
        const { toId, type, strength } = req.body;
        const fromId = req.params.id;
        
        if (!toId || !type) {
            return res.status(400).json({ error: 'Missing toId or type.' });
        }

        const link = await linkDecisions(fromId, toId, type, strength);
        res.json({ success: true, link });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get decision graph
router.get('/decisions/:id/graph', async (req, res) => {
    try {
        const graph = await getDecisionGraph(req.params.id);
        if (!graph) return res.status(404).json({ error: 'Decision not found.' });
        res.json(graph);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get project clusters
router.get('/projects/:id/clusters', async (req, res) => {
    try {
        const clusters = await getProjectClusters(req.params.id);
        if (!clusters) return res.status(404).json({ error: 'Project not found' });
        res.json(clusters);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
