const registry = {
    coordinator: {
        id: 'coordinator',
        label: 'Cartograph Coordinator',
        handle: 'coord',
        aliases: ['coord', 'coordinator', 'cartograph', 'system']
    },
    pm: {
        id: 'pm',
        label: 'Project Management Agent',
        handle: 'pm',
        aliases: ['pm', 'project', 'projectmanager', 'project-management']
    },
    architect: {
        id: 'architect',
        label: 'Architect Agent',
        handle: 'architect',
        aliases: ['architect', 'arch']
    }
};

const aliasToId = Object.entries(registry).reduce((acc, [id, agent]) => {
    const aliases = Array.isArray(agent.aliases) ? agent.aliases : [];
    aliases.forEach((alias) => {
        acc[String(alias).toLowerCase()] = id;
    });
    return acc;
}, {});

export const AGENT_REGISTRY = registry;
export const DEFAULT_AGENT_ID = 'architect';

export const listAgentMentions = () => {
    return Object.values(registry).map((agent) => `@${agent.handle}`).join(' ');
};

export const getAgentById = (agentId) => {
    if (!agentId) return registry.coordinator;
    return registry[agentId] || registry.coordinator;
};

export const resolveMentionedAgent = (text = '') => {
    const source = String(text || '');
    const mentions = [...source.matchAll(/(?:^|\s)@([a-z0-9_-]+)/ig)];
    if (mentions.length === 0) {
        return {
            agentId: null,
            handle: null,
            cleanedContent: source.trim(),
            unknownHandle: null
        };
    }

    const rawHandle = String(mentions[0][1] || '').toLowerCase();
    const resolvedId = aliasToId[rawHandle] || null;
    const cleanedContent = source
        .replace(/(?:^|\s)@[a-z0-9_-]+/ig, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^[,;:\-]+\s*/, '')
        .trim();

    return {
        agentId: resolvedId,
        handle: rawHandle,
        cleanedContent: cleanedContent || source.trim(),
        unknownHandle: resolvedId ? null : rawHandle
    };
};
