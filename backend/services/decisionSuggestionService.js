const { Project, Pillar, Decision, AppSettings } = require('../models');
const agentService = require('./agentService');
const { getDecisionSemanticNeighbors } = require('./semanticService');

const parseStructuredSuggestions = (raw) => {
    if (!raw || typeof raw !== 'string') return [];
    const trimmed = raw.trim();

    const candidates = [];
    const objectMatch = trimmed.match(/\{[\s\S]*\}/);
    if (objectMatch) candidates.push(objectMatch[0]);
    const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
    if (arrayMatch) candidates.push(arrayMatch[0]);
    candidates.push(trimmed);

    for (const candidate of candidates) {
        try {
            const parsed = JSON.parse(candidate);
            const list = Array.isArray(parsed)
                ? parsed
                : Array.isArray(parsed?.suggestions)
                    ? parsed.suggestions
                    : [];
            if (list.length > 0) {
                return list
                    .map((item) => ({
                        label: String(item?.label || item?.decision || item?.title || '').trim(),
                        reason: String(item?.reason || item?.why || '').trim(),
                        source: 'LLM suggestion'
                    }))
                    .filter((item) => item.label.length > 0);
            }
        } catch {
            // Try next candidate
        }
    }

    return [];
};

const getProviderConfig = async () => {
    const defaultModels = {
        openai: { interactions: 'gpt-4o', planner: 'gpt-4o', suggestions: 'gpt-4o-mini', conflicts: 'gpt-4o' },
        anthropic: { interactions: 'claude-3-5-sonnet-20240620', planner: 'claude-3-5-sonnet-20240620', suggestions: 'claude-3-5-sonnet-20240620', conflicts: 'claude-3-5-sonnet-20240620' },
        gemini: { interactions: 'gemini-1.5-pro', planner: 'gemini-1.5-pro', suggestions: 'gemini-1.5-flash', conflicts: 'gemini-1.5-pro' }
    };
    const settings = await AppSettings.findOne({ where: { singletonKey: 'global' } });
    const rawKeys = settings?.keys && typeof settings.keys === 'object' ? settings.keys : {};
    const { _models, ...keys } = rawKeys;
    const envHas = {
        openai: !!process.env.OPENAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        gemini: !!process.env.GEMINI_API_KEY
    };

    let provider = settings?.provider || null;
    if (!provider || provider === 'mock') {
        provider = envHas.openai ? 'openai' : (envHas.anthropic ? 'anthropic' : (envHas.gemini ? 'gemini' : null));
    }

    return { provider, keys, models: _models || defaultModels };
};

const buildPayload = (provider, systemPrompt, userPrompt, model) => {
    if (provider === 'openai') {
        return {
            model: model || 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.2
        };
    }
    if (provider === 'anthropic') {
        return {
            model: model || 'claude-3-5-sonnet-20240620',
            max_tokens: 800,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }]
        };
    }
    if (provider === 'gemini') {
        return {
            model: model || 'gemini-1.5-pro',
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
        };
    }
    throw new Error(`Unsupported provider: ${provider}`);
};

const getDecisionSuggestions = async (projectId, decisionId, limit = 6) => {
    const project = await Project.findByPk(projectId);
    if (!project) return null;

    const pillars = await Pillar.findAll({ where: { ProjectId: project.id } });
    const pillarIds = pillars.map((pillar) => pillar.id);
    if (pillarIds.length === 0) return { decisionId, suggestions: [] };

    const decisions = await Decision.findAll({ where: { PillarId: pillarIds } });
    const target = decisions.find((decision) => decision.decisionId === decisionId);
    if (!target) return { decisionId, suggestions: [] };

    const { provider, keys, models } = await getProviderConfig();
    if (!provider) {
        return { decisionId, suggestions: [] };
    }

    const semantic = await getDecisionSemanticNeighbors(projectId, decisionId, Math.max(4, limit));
    const semanticNeighbors = Array.isArray(semantic?.neighbors) ? semantic.neighbors.slice(0, Math.max(4, limit)) : [];
    const resolvedCount = decisions.filter((d) => d.answer && !d.conflict).length;

    const systemPrompt = [
        'You are an architecture assistant that proposes concrete decision options.',
        'Generate suggestions ONLY for the target decision.',
        'Ground suggestions in provided project context and related decisions.',
        `Return strict JSON only with this shape: {"suggestions":[{"label":"string","reason":"string"}]}.`,
        `Return between 3 and ${Math.max(3, Math.min(8, limit))} suggestions.`,
        'Do not include markdown or explanatory text outside JSON.'
    ].join(' ');

    const userPrompt = [
        `Project idea: ${project.idea || ''}`,
        `Target decision id: ${target.decisionId}`,
        `Target question: ${target.question || ''}`,
        `Target context: ${target.context || ''}`,
        `Current answer: ${target.answer || ''}`,
        `Dependencies: ${(Array.isArray(target.dependencies) ? target.dependencies : []).join(', ') || 'none'}`,
        `Options: ${JSON.stringify(target.options || [])}`,
        `Project resolution coverage: ${resolvedCount}/${decisions.length}`,
        `Top semantic neighbors (embedding-based): ${JSON.stringify(semanticNeighbors.map((n) => ({
            decisionId: n.decisionId,
            question: n.question,
            answer: n.answer || '',
            breadcrumb: n.breadcrumb,
            score: n.score
        })))}`
    ].join('\n');

    const model = models?.[provider]?.suggestions || models?.[provider]?.interactions || null;
    const payload = buildPayload(provider, systemPrompt, userPrompt, model);
    const { completion } = await agentService.requestProviderCompletion({
        provider,
        payload,
        clientKeys: keys
    });

    const parsed = parseStructuredSuggestions(completion)
        .slice(0, Math.max(1, limit))
        .map((item) => ({
            ...item,
            reason: item.reason || 'Model-generated recommendation grounded in project context.'
        }));

    return { decisionId, suggestions: parsed };
};

module.exports = {
    getDecisionSuggestions
};
