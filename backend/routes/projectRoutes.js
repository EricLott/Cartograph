const express = require('express');
const router = express.Router();
const { Project } = require('../models');
const { 
    getProjectTree, 
    saveProjectState, 
    linkDecisions, 
    getDecisionGraph 
} = require('../services/projectService');

// Get all projects
router.get('/projects', async (req, res) => {
    try {
        const projects = await Project.findAll({
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

// Save project state (new or update)
router.post('/save-state', async (req, res) => {
    try {
        const { idea, pillars, projectId } = req.body;

        if (!idea || typeof idea !== 'string' || !idea.trim()) {
            return res.status(400).json({ error: 'Missing or empty idea.' });
        }
        if (!Array.isArray(pillars)) {
            return res.status(400).json({ error: 'pillars must be an array.' });
        }

        const resultId = await saveProjectState(idea, pillars, projectId);
        res.json({ success: true, projectId: resultId });
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

module.exports = router;
