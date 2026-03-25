const { Project, Pillar, Decision, AppSettings } = require('../models');
const agentService = require('./agentService');

const buildDecisionEmbeddingText = (decision) => {
    const criteria = Array.isArray(decision.acceptanceCriteria) ? decision.acceptanceCriteria.join(' ') : '';
    const deps = Array.isArray(decision.dependencies) ? decision.dependencies.join(' ') : '';
    return [
        decision.question,
        decision.context,
        decision.answer,
        decision.technicalContext,
        criteria,
        deps,
        decision.priority
    ].filter(Boolean).join(' ');
};

const parseEmbedding = (raw) => {
    if (!raw) return null;
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
};

const cosineSimilarity = (a, b) => {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) return 0;
    const length = Math.min(a.length, b.length);
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < length; i += 1) {
        const av = Number(a[i]) || 0;
        const bv = Number(b[i]) || 0;
        dot += av * bv;
        magA += av * av;
        magB += bv * bv;
    }
    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
};

const getEmbeddingProviderConfig = async () => {
    const settings = await AppSettings.findOne({ where: { singletonKey: 'global' } });
    const keys = settings?.keys && typeof settings.keys === 'object' ? settings.keys : {};

    const hasOpenAI = !!(process.env.OPENAI_API_KEY || keys.openai);
    const hasGemini = !!(process.env.GEMINI_API_KEY || keys.gemini);
    const provider = hasOpenAI ? 'openai' : (hasGemini ? 'gemini' : null);

    return { provider, keys };
};

const ensureDecisionEmbedding = async (decision, providerConfig) => {
    const existing = parseEmbedding(decision.embedding);
    if (existing) return existing;

    const { provider, keys } = providerConfig;
    if (!provider) return null;

    const text = buildDecisionEmbeddingText(decision);
    if (!text.trim()) return null;

    const { embedding } = await agentService.requestProviderEmbedding({
        provider,
        text,
        clientKeys: keys
    });

    if (!Array.isArray(embedding)) return null;

    decision.embedding = JSON.stringify(embedding);
    await decision.save();
    return embedding;
};

const getPillarContextMaps = (pillars) => {
    const byId = new Map((pillars || []).map((p) => [p.id, p]));

    const lineageTitles = (pillarId) => {
        const titles = [];
        let current = byId.get(pillarId);
        while (current) {
            titles.unshift(current.title);
            current = current.parentId ? byId.get(current.parentId) : null;
        }
        return titles;
    };

    const topLevelTitle = (pillarId) => {
        const lineage = lineageTitles(pillarId);
        return lineage[0] || '';
    };

    const topLevelPillarId = (pillarId) => {
        const lineage = [];
        let current = byId.get(pillarId);
        while (current) {
            lineage.unshift(current);
            current = current.parentId ? byId.get(current.parentId) : null;
        }
        return lineage[0]?.pillarId || null;
    };

    return { lineageTitles, topLevelTitle, topLevelPillarId };
};

const getDecisionSemanticNeighbors = async (projectId, decisionId, limit = 8) => {
    const project = await Project.findByPk(projectId);
    if (!project) return null;

    const pillars = await Pillar.findAll({ where: { ProjectId: project.id } });
    const pillarIds = pillars.map((pillar) => pillar.id);
    if (pillarIds.length === 0) return { decisionId, neighbors: [] };

    const decisions = await Decision.findAll({ where: { PillarId: pillarIds } });
    const target = decisions.find((decision) => decision.decisionId === decisionId);
    if (!target) return { decisionId, neighbors: [] };

    const providerConfig = await getEmbeddingProviderConfig();
    const targetEmbedding = await ensureDecisionEmbedding(target, providerConfig);
    if (!targetEmbedding) return { decisionId, neighbors: [] };

    const { lineageTitles, topLevelTitle, topLevelPillarId } = getPillarContextMaps(pillars);

    const scored = [];
    for (const decision of decisions) {
        if (decision.decisionId === decisionId) continue;
        const embedding = await ensureDecisionEmbedding(decision, providerConfig);
        if (!embedding) continue;

        const score = cosineSimilarity(targetEmbedding, embedding);
        if (score <= 0) continue;

        const lineage = lineageTitles(decision.PillarId);
        scored.push({
            decisionId: decision.decisionId,
            question: decision.question,
            answer: decision.answer || '',
            pillarId: topLevelPillarId(decision.PillarId),
            pillarTitle: topLevelTitle(decision.PillarId),
            breadcrumb: lineage.join(' > '),
            score
        });
    }

    scored.sort((a, b) => b.score - a.score);
    return { decisionId, neighbors: scored.slice(0, Math.max(1, limit)) };
};

module.exports = {
    getDecisionSemanticNeighbors
};
