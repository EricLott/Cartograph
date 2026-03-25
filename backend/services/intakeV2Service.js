const agentService = require('./agentService');
const {
    resolveProviderConfig,
    getModelForTask,
    buildCompletionPayload
} = require('./providerConfigService');

const parseJson = (raw, fallback = null) => {
    if (typeof raw !== 'string' || !raw.trim()) return fallback;
    const trimmed = raw.trim();
    const objectMatch = trimmed.match(/\{[\s\S]*\}/);
    if (objectMatch) {
        try {
            return JSON.parse(objectMatch[0]);
        } catch {
            return fallback;
        }
    }
    try {
        return JSON.parse(trimmed);
    } catch {
        return fallback;
    }
};

const toStringList = (value, limit = 8) => {
    if (!Array.isArray(value)) return [];
    const cleaned = value.map((item) => String(item || '').trim()).filter(Boolean);
    return [...new Set(cleaned)].slice(0, limit);
};

const normalizeQuestions = (value) => {
    if (!Array.isArray(value)) return [];
    const normalized = [];
    value.forEach((entry, index) => {
        if (!entry) return;
        if (typeof entry === 'string') {
            const question = entry.trim();
            if (!question) return;
            normalized.push({
                id: `q_${index + 1}`,
                question,
                why: 'Required to lock architecture assumptions.'
            });
            return;
        }
        const question = String(entry.question || entry.text || '').trim();
        if (!question) return;
        normalized.push({
            id: String(entry.id || `q_${index + 1}`),
            question,
            why: String(entry.why || entry.rationale || 'Required to lock architecture assumptions.').trim()
        });
    });
    return normalized.slice(0, 5);
};

const wordCount = (value = '') => String(value).trim().split(/\s+/).filter(Boolean).length;

const isLikelyVagueIdea = (idea = '') => {
    const text = String(idea || '').toLowerCase().trim();
    if (!text) return true;
    const wc = wordCount(text);
    const highlyGeneric = /\b(build|create|make)\b.*\b(app|application|platform|system|crm|tool)\b/.test(text);
    const hasRoleMentions = /\b(users?|customers?|clients?|partners?|admins?|agents?|operators?|teams?)\b/.test(text);
    const hasFunctionalSurfaces = /\b(app|portal|api|workflow|process|dashboard|integration|automation|form|view|report)\b/.test(text);
    const hasContextualClause = /\b(for|with|including|where|such as|which are|that)\b/.test(text);
    const hasListStructure = /[,;:]/.test(text);
    const specificityScore = [hasRoleMentions, hasFunctionalSurfaces, hasContextualClause, hasListStructure, wc >= 16]
        .filter(Boolean).length;

    if (wc < 8 && highlyGeneric) return true;
    return specificityScore < 2;
};

const inferProjectSubject = (idea = '') => {
    const text = String(idea || '').trim();
    const match = text.match(/\b(?:build|create|design|plan)\b\s+(?:an?\s+|the\s+)?(.+?)(?:[.,;]|$)/i);
    if (match?.[1]) {
        const candidate = match[1].trim().replace(/\s+/g, ' ');
        return candidate.split(' ').slice(0, 8).join(' ');
    }
    return 'the solution';
};

const extractDomainTerms = (idea = '', chatHistory = []) => {
    const historyText = Array.isArray(chatHistory)
        ? chatHistory.map((msg) => String(msg?.content || '')).join(' ')
        : '';
    const text = `${String(idea || '')} ${historyText}`.toLowerCase();
    const stop = new Set([
        'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'within', 'build',
        'create', 'make', 'plan', 'project', 'solution', 'application', 'system', 'platform',
        'should', 'would', 'could', 'there', 'their', 'our', 'your', 'will', 'need', 'needs',
        'have', 'has', 'are', 'is', 'was', 'were', 'about', 'what', 'which', 'when', 'where',
        'how', 'why', 'also', 'then', 'than', 'using', 'use', 'user', 'users'
    ]);
    const tokens = text.match(/[a-z0-9][a-z0-9_-]{3,}/g) || [];
    const unique = [];
    tokens.forEach((token) => {
        if (stop.has(token)) return;
        if (unique.includes(token)) return;
        unique.push(token);
    });
    return unique.slice(0, 24);
};

const questionTouchesDomain = (question = '', domainTerms = []) => {
    const text = String(question || '').toLowerCase();
    if (!text) return false;
    return domainTerms.some((term) => term.length >= 4 && text.includes(term));
};

const questionIsPlatformTautology = (question = '') => {
    const text = String(question || '').toLowerCase().replace(/\s+/g, ' ');
    const broadDataPrompt = /\bhow\b.*\bdata\b.*\b(managed|stored|management|storage)\b/.test(text);
    const anchoredToPlatform = /\b(in|within)\b\s+[a-z0-9][a-z0-9\s-]{1,40}$/.test(text);
    const decisionSpecific = /\b(model|schema|entity|entities|table|ownership|permission|access|retention|partition|routing|mapping|lifecycle)\b/.test(text);
    return broadDataPrompt && anchoredToPlatform && !decisionSpecific;
};

const buildGenericGroundedQuestion = ({ idea = '', domainTerms = [] } = {}) => {
    const subject = inferProjectSubject(idea);
    const anchor = domainTerms.find((term) => /\b(user|client|customer|partner|vendor|record|entity|workflow|portal|integration|approval|case|intake)\b/.test(term))
        || domainTerms[0]
        || 'records';
    return {
        id: 'pm_domain_scope',
        question: `What are the core ${anchor} workflows, ownership boundaries, and access rules we must define first for ${subject}?`,
        why: 'This establishes the domain model and guardrails before architecture decomposition.'
    };
};

const isClearlyScopedIdea = (idea = '') => {
    const text = String(idea || '').toLowerCase().trim();
    const wc = wordCount(text);
    const hasDomainSignals = /\b(crm|erp|intake|onboarding|case|claims|booking|inventory|finance|support|compliance|approval|quoting|scheduling)\b/.test(text);
    const hasActorsOrSegments = /\b(users?|customers?|clients?|partners?|distributors?|admins?|agents?|operators?|restaurants?|teams?)\b/.test(text);
    const hasSurfaces = /\b(app|portal|api|workflow|dashboard|forms?|views?|automation|integration|process)\b/.test(text);
    const hasStructuredDetail = /[,;:]/.test(text) || /\bfor\b.+\bwith\b/.test(text) || /\bincluding\b/.test(text);
    return wc >= 16 && hasActorsOrSegments && hasSurfaces && hasStructuredDetail && (hasDomainSignals || /\bwhich are|such as\b/.test(text));
};

const enforceQuestionQuality = (questions = [], { idea = '', chatHistory = [] } = {}) => {
    if (!Array.isArray(questions) || questions.length === 0) return [];

    const one = [{ ...questions[0] }];
    const firstQuestion = String(one[0]?.question || '').trim();
    const domainTerms = extractDomainTerms(idea, chatHistory);

    if (!firstQuestion || questionIsPlatformTautology(firstQuestion) || !questionTouchesDomain(firstQuestion, domainTerms)) {
        return [buildGenericGroundedQuestion({ idea, domainTerms })];
    }
    return one;
};

const buildFallbackIntake = ({ idea, hasArchitecture = false }) => {
    const vague = isLikelyVagueIdea(idea);
    if (hasArchitecture && !vague) {
        return {
            agent: 'project_management',
            mode: 'ready_for_architecture',
            confidence: 0.8,
            understanding: 'Current context appears sufficiently scoped for architecture iteration.',
            missing_information: [],
            questions: [],
            assumptions: [],
            handoff_brief: String(idea || '').trim(),
            reason: 'existing-architecture-context'
        };
    }

    if (!vague) {
        return {
            agent: 'project_management',
            mode: 'ready_for_architecture',
            confidence: 0.75,
            understanding: String(idea || '').trim(),
            missing_information: [],
            questions: [],
            assumptions: ['Proceeding with currently provided scope; unresolved details will be tracked as explicit decisions.'],
            handoff_brief: String(idea || '').trim(),
            reason: 'sufficiently-specific-brief'
        };
    }

    return {
        agent: 'project_management',
        mode: 'requirements_discovery',
        confidence: 0.35,
        understanding: 'The brief is currently high-level. We should gather core requirements before architecture synthesis.',
        missing_information: [
            'Primary user personas and their distinct workflows',
            'Key business outcomes and success metrics',
            'Data model scope and critical record relationships',
            'Integration, compliance, and deployment constraints'
        ],
        questions: [
            {
                id: 'pm_users',
                question: 'Who are the primary user groups and what is the top workflow each group must complete?',
                why: 'This determines domain boundaries and capability structure.'
            }
        ],
        assumptions: [],
        handoff_brief: '',
        reason: 'insufficient-context'
    };
};

const normalizeIntakeResult = (raw = {}, fallback = {}, context = {}) => {
    const mode = String(raw.mode || '').trim() === 'ready_for_architecture'
        ? 'ready_for_architecture'
        : 'requirements_discovery';
    const confidenceRaw = Number(raw.confidence);
    const confidence = Number.isFinite(confidenceRaw)
        ? Math.max(0, Math.min(1, confidenceRaw))
        : (fallback.confidence ?? 0.5);
    const questions = enforceQuestionQuality(
        normalizeQuestions(raw.questions),
        context
    );
    const fallbackQuestions = enforceQuestionQuality(
        normalizeQuestions(fallback.questions),
        context
    );
    return {
        agent: 'project_management',
        mode,
        confidence,
        understanding: String(raw.understanding || fallback.understanding || '').trim(),
        missing_information: toStringList(raw.missing_information || raw.missingInformation || fallback.missing_information),
        questions: questions.length > 0 ? questions : fallbackQuestions,
        assumptions: toStringList(raw.assumptions || fallback.assumptions),
        handoff_brief: String(raw.handoff_brief || raw.handoffBrief || fallback.handoff_brief || '').trim(),
        reason: String(raw.reason || fallback.reason || '').trim()
    };
};

const assessIntakeV2 = async ({
    idea,
    chatHistory = [],
    priorState = null,
    hasArchitecture = false,
    runtimeConfig = null
}) => {
    const safeIdea = String(idea || '').trim();
    const fallback = buildFallbackIntake({ idea: safeIdea, hasArchitecture });
    const providerConfig = await resolveProviderConfig(runtimeConfig);
    const clearlyScoped = isClearlyScopedIdea(safeIdea);

    if (!hasArchitecture && clearlyScoped) {
        return {
            agent: 'project_management',
            mode: 'ready_for_architecture',
            confidence: 0.86,
            understanding: safeIdea,
            missing_information: [],
            questions: [],
            assumptions: ['Proceeding to architecture synthesis; unresolved details will be captured as explicit decisions.'],
            handoff_brief: safeIdea,
            reason: 'clearly-scoped-brief'
        };
    }

    if (!providerConfig.provider) return fallback;

    const model = getModelForTask(providerConfig.models, providerConfig.provider, 'planner');
    const condensedHistory = Array.isArray(chatHistory)
        ? chatHistory.slice(-12).map((msg) => ({
            role: msg?.role || 'user',
            content: String(msg?.content || '').slice(0, 1200)
        }))
        : [];

    const systemPrompt = [
        'You are the Cartograph Project Management Agent.',
        'You decide if the brief is ready for architecture synthesis or still requires requirements discovery.',
        'When context is insufficient, ask high-value, architecture-shaping questions.',
        'Ask EXACTLY ONE question per response (the single highest-impact next question).',
        'For any detected platform/domain, you must quickly ground yourself using web research when tools are available.',
        'Prefer official vendor/platform documentation first, then one additional corroborating source.',
        'Use platform/domain language from the user context; avoid generic filler questions.',
        'When context is sufficient, produce a concise handoff brief for the Architect Agent.',
        'Be domain-agnostic and avoid fixed software taxonomies.',
        'For domain/platform-specific contexts, your question must use that domain language and decision surface.',
        'Never ask tautological platform questions (example pattern: "how data is stored within <platform>").',
        'Return strict JSON with keys:',
        'mode, confidence, understanding, missing_information, questions, assumptions, handoff_brief, reason.',
        'mode must be requirements_discovery or ready_for_architecture.',
        'questions must be array with exactly one item when mode=requirements_discovery: [{id,question,why}].'
    ].join(' ');

    const userPrompt = [
        `Latest user input:\n${safeIdea}`,
        `Has existing architecture in progress: ${hasArchitecture ? 'yes' : 'no'}`,
        `Prior intake state:\n${JSON.stringify(priorState || {}, null, 2)}`,
        `Recent chat history:\n${JSON.stringify(condensedHistory, null, 2)}`,
        'Critical policy: if the idea is vague (for example "Let\'s build a CRM"), stay in requirements_discovery and ask focused questions before architecture generation.'
    ].join('\n\n');

    if (providerConfig.provider === 'openai') {
        try {
            const { completion, sources } = await agentService.requestProviderGroundedCompletion({
                provider: providerConfig.provider,
                clientKeys: providerConfig.keys,
                payload: {
                    model,
                    instructions: systemPrompt,
                    input: userPrompt,
                    tools: [{ type: 'web_search' }],
                    include: ['web_search_call.action.sources'],
                    tool_choice: 'auto',
                    reasoning: { effort: 'medium' },
                    timeoutMs: 120000
                }
            });
            const parsed = parseJson(completion, fallback) || fallback;
            return normalizeIntakeResult(
                { ...parsed, source_citations: sources },
                fallback,
                { idea: safeIdea, chatHistory: condensedHistory }
            );
        } catch {
            // Fall through to model-only completion.
        }
    }

    const payload = buildCompletionPayload(providerConfig.provider, model, systemPrompt, userPrompt, {
        temperature: 0.05,
        maxTokens: 1800
    });
    const { completion } = await agentService.requestProviderCompletion({
        provider: providerConfig.provider,
        payload,
        clientKeys: providerConfig.keys
    });
    const parsed = parseJson(completion, fallback) || fallback;
    return normalizeIntakeResult(parsed, fallback, { idea: safeIdea, chatHistory: condensedHistory });
};

module.exports = {
    assessIntakeV2
};
