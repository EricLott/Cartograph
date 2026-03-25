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
const { getDecisionSemanticNeighbors, getProjectSemanticLinks } = require('../services/semanticService');
const { getDecisionSuggestions } = require('../services/decisionSuggestionService');
const { assessIntakeV2 } = require('../services/intakeV2Service');
const { groundPlannerV2, generatePlannerV2 } = require('../services/plannerV2Service');
const { detectConflictsV2, resolveConflictsV2 } = require('../services/conflictsV2Service');
const { toExecutionProjection } = require('../services/projectionV2Service');
const { buildExportBundleV2 } = require('../services/exportV2Service');
// Get all projects
router.get('/projects', async (req, res) => {
    try {
        const showArchived = req.query.archived === 'true';
        const projects = await Project.findAll({
            where: { archived: showArchived },
            attributes: ['id', 'idea', 'createdAt', 'archived'],
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
        const { idea, pillars, projectId, isAgent, chatHistory, v2State } = req.body;

        if (!idea || typeof idea !== 'string' || !idea.trim()) {
            return res.status(400).json({ error: 'Missing or empty idea.' });
        }
        if (!Array.isArray(pillars)) {
            return res.status(400).json({ error: 'pillars must be an array.' });
        }

        const result = await saveProjectState(idea, pillars, projectId, isAgent, chatHistory, v2State);
        res.json({
            success: true,
            projectId: result.projectId,
            projectOverview: result.projectOverview,
            v2State: result.v2State
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// App settings (persisted server-side, no local-only storage)
router.get('/settings', async (req, res) => {
    try {
        const defaultModels = {
            openai: { interactions: 'gpt-4o', planner: 'gpt-4o', suggestions: 'gpt-4o-mini', conflicts: 'gpt-4o' },
            anthropic: { interactions: 'claude-3-5-sonnet-20240620', planner: 'claude-3-5-sonnet-20240620', suggestions: 'claude-3-5-sonnet-20240620', conflicts: 'claude-3-5-sonnet-20240620' },
            gemini: { interactions: 'gemini-1.5-pro', planner: 'gemini-1.5-pro', suggestions: 'gemini-1.5-flash', conflicts: 'gemini-1.5-pro' }
        };
        const [settings] = await AppSettings.findOrCreate({
            where: { singletonKey: 'global' },
            defaults: {
                singletonKey: 'global',
                provider: 'mock',
                keys: { openai: '', anthropic: '', gemini: '', _models: defaultModels }
            }
        });
        const rawKeys = settings.keys && typeof settings.keys === 'object' ? settings.keys : {};
        const { _models, ...keys } = rawKeys;
        res.json({
            provider: settings.provider,
            keys,
            models: _models || defaultModels
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/settings', async (req, res) => {
    try {
        const defaultModels = {
            openai: { interactions: 'gpt-4o', planner: 'gpt-4o', suggestions: 'gpt-4o-mini', conflicts: 'gpt-4o' },
            anthropic: { interactions: 'claude-3-5-sonnet-20240620', planner: 'claude-3-5-sonnet-20240620', suggestions: 'claude-3-5-sonnet-20240620', conflicts: 'claude-3-5-sonnet-20240620' },
            gemini: { interactions: 'gemini-1.5-pro', planner: 'gemini-1.5-pro', suggestions: 'gemini-1.5-flash', conflicts: 'gemini-1.5-pro' }
        };
        const provider = typeof req.body.provider === 'string' ? req.body.provider : 'mock';
        const keys = req.body.keys && typeof req.body.keys === 'object' ? req.body.keys : {};
        const models = req.body.models && typeof req.body.models === 'object' ? req.body.models : defaultModels;
        const [settings] = await AppSettings.findOrCreate({
            where: { singletonKey: 'global' },
            defaults: { singletonKey: 'global', provider, keys: { ...keys, _models: models } }
        });
        await settings.update({ provider, keys: { ...keys, _models: models } });
        const { _models, ...publicKeys } = settings.keys || {};
        res.json({
            success: true,
            provider: settings.provider,
            keys: publicKeys,
            models: _models || defaultModels
        });
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

// Get semantic neighbors for a decision (embedding-based similarity)
router.get('/projects/:id/decisions/:decisionId/semantic', async (req, res) => {
    try {
        const limit = Number(req.query.limit || 8);
        const result = await getDecisionSemanticNeighbors(req.params.id, req.params.decisionId, limit);
        if (!result) return res.status(404).json({ error: 'Project not found' });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get embedding-based semantic links for the project graph
router.get('/projects/:id/semantic-links', async (req, res) => {
    try {
        const threshold = Number(req.query.threshold || 0.62);
        const maxLinksPerDecision = Number(req.query.maxLinksPerDecision || 2);
        const result = await getProjectSemanticLinks(req.params.id, { threshold, maxLinksPerDecision });
        if (!result) return res.status(404).json({ error: 'Project not found' });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get LLM-generated suggestions for a decision (provider/API-key driven)
router.get('/projects/:id/decisions/:decisionId/suggestions', async (req, res) => {
    try {
        const limit = Number(req.query.limit || 6);
        const result = await getDecisionSuggestions(req.params.id, req.params.decisionId, limit);
        if (!result) return res.status(404).json({ error: 'Project not found' });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// planner.v2.ground
router.post('/planner/v2/ground', async (req, res) => {
    try {
        const idea = typeof req.body.idea === 'string' ? req.body.idea.trim() : '';
        if (!idea) {
            return res.status(400).json({ error: 'Missing or empty idea.' });
        }
        const runtimeConfig = req.body.config && typeof req.body.config === 'object' ? req.body.config : null;
        const grounding = await groundPlannerV2({ idea, runtimeConfig });
        res.json(grounding);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// planner.v2.generate
router.post('/planner/v2/generate', async (req, res) => {
    try {
        const idea = typeof req.body.idea === 'string' ? req.body.idea.trim() : '';
        if (!idea) {
            return res.status(400).json({ error: 'Missing or empty idea.' });
        }
        const runtimeConfig = req.body.config && typeof req.body.config === 'object' ? req.body.config : null;
        const seedGrounding = req.body.grounding && typeof req.body.grounding === 'object'
            ? req.body.grounding
            : null;
        const seedGroundingMeta = req.body.groundingMeta && typeof req.body.groundingMeta === 'object'
            ? req.body.groundingMeta
            : null;
        const plan = await generatePlannerV2({ idea, runtimeConfig, seedGrounding, seedGroundingMeta });
        res.json(plan);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// intake.v2.assess
router.post('/intake/v2/assess', async (req, res) => {
    try {
        const idea = typeof req.body.idea === 'string' ? req.body.idea.trim() : '';
        if (!idea) {
            return res.status(400).json({ error: 'Missing or empty idea.' });
        }
        const runtimeConfig = req.body.config && typeof req.body.config === 'object' ? req.body.config : null;
        const result = await assessIntakeV2({
            idea,
            chatHistory: Array.isArray(req.body.chatHistory) ? req.body.chatHistory : [],
            priorState: req.body.priorState && typeof req.body.priorState === 'object' ? req.body.priorState : null,
            hasArchitecture: !!req.body.hasArchitecture,
            runtimeConfig
        });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// conflicts.v2.detect
router.post('/conflicts/v2/detect', async (req, res) => {
    try {
        const projectState = req.body.projectState && typeof req.body.projectState === 'object'
            ? req.body.projectState
            : null;
        if (!projectState) {
            return res.status(400).json({ error: 'projectState is required.' });
        }
        const runtimeConfig = req.body.config && typeof req.body.config === 'object' ? req.body.config : null;
        const result = await detectConflictsV2(projectState, runtimeConfig);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// conflicts.v2.resolve
router.post('/conflicts/v2/resolve', async (req, res) => {
    try {
        const projectState = req.body.projectState && typeof req.body.projectState === 'object'
            ? req.body.projectState
            : null;
        const decisionUpdate = req.body.decisionUpdate && typeof req.body.decisionUpdate === 'object'
            ? req.body.decisionUpdate
            : null;
        if (!projectState || !decisionUpdate) {
            return res.status(400).json({ error: 'projectState and decisionUpdate are required.' });
        }
        const runtimeConfig = req.body.config && typeof req.body.config === 'object' ? req.body.config : null;
        const result = await resolveConflictsV2(projectState, decisionUpdate, runtimeConfig);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// projection.v2.to_execution
router.post('/projection/v2/to-execution', async (req, res) => {
    try {
        const projectState = req.body.projectState && typeof req.body.projectState === 'object'
            ? req.body.projectState
            : null;
        if (!projectState) {
            return res.status(400).json({ error: 'projectState is required.' });
        }
        const projection = toExecutionProjection(projectState);
        res.json(projection);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// export.v2.bundle
router.post('/export/v2/bundle', async (req, res) => {
    try {
        let projectState = req.body.projectState && typeof req.body.projectState === 'object'
            ? req.body.projectState
            : null;

        if (!projectState && req.body.projectId) {
            const tree = await getProjectTree(req.body.projectId);
            if (!tree) return res.status(404).json({ error: 'Project not found.' });
            projectState = {
                idea: tree.idea,
                pillars: tree.pillars,
                ...(tree.v2State && typeof tree.v2State === 'object' ? tree.v2State : {})
            };
        }

        if (!projectState) {
            return res.status(400).json({ error: 'projectState or projectId is required.' });
        }

        const bundle = buildExportBundleV2(projectState);
        res.json(bundle);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
