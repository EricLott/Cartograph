const KNOWN_ICONS = [
    { icon: 'vsc:azure', aliases: ['azure', 'microsoft azure'] },
    { icon: 'fa6-brands:aws', aliases: ['aws', 'amazon web services'] },
    { icon: 'si:googlecloud', aliases: ['gcp', 'google cloud', 'google cloud platform'] },
    { icon: 'vsc:server', aliases: ['onprem', 'on-prem', 'on premise', 'server', 'self-hosted'] },
    { icon: 'vsc:hubot', aliases: ['hybrid'] },
    { icon: 'si:docker', aliases: ['docker', 'container'] },
    { icon: 'si:kubernetes', aliases: ['kubernetes', 'k8s'] },
    { icon: 'si:terraform', aliases: ['terraform', 'iac'] },
    { icon: 'si:pulumi', aliases: ['pulumi'] },
    { icon: 'tb:file-lambda', aliases: ['cdk', 'aws cdk'] },
    { icon: 'mdi:database-outline', aliases: ['database', 'db', 'sql', 'nosql'] },
    { icon: 'mdi:shield-check-outline', aliases: ['security', 'auth', 'authentication'] },
    { icon: 'mdi:api', aliases: ['api', 'integration', 'webhook'] },
    { icon: 'mdi:web', aliases: ['frontend', 'ui', 'web'] },
    { icon: 'mdi:server-outline', aliases: ['backend', 'service'] },
    { icon: 'mdi:cloud-outline', aliases: ['cloud'] }
];

const FALLBACK_ICON = 'vsc:question';
const ICONIFY_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*$/i;

const normalize = (value) => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const buildKnownIconMap = () => {
    const map = new Map();
    KNOWN_ICONS.forEach((entry) => {
        entry.aliases.forEach((alias) => {
            map.set(normalize(alias), entry.icon);
        });
    });
    return map;
};

const KNOWN_ICON_MAP = buildKnownIconMap();

const dedupe = (values) => {
    return [...new Set(values.filter(Boolean))];
};

const slugFromInput = (name) => {
    return normalize(name).replace(/\s+/g, '-').replace(/^-+|-+$/g, '');
};

const resolveIndexedIcon = (name) => {
    const normalizedName = normalize(name);
    if (!normalizedName) return null;

    if (KNOWN_ICON_MAP.has(normalizedName)) {
        return KNOWN_ICON_MAP.get(normalizedName);
    }

    const bestMatch = KNOWN_ICONS
        .flatMap(({ icon, aliases }) => aliases.map((alias) => ({ icon, alias: normalize(alias) })))
        .map(({ icon, alias }) => ({ icon, alias, index: normalizedName.indexOf(alias) }))
        .filter(({ index }) => index >= 0)
        .sort((a, b) => a.index - b.index || b.alias.length - a.alias.length)[0];

    return bestMatch ? bestMatch.icon : null;
};

export const getIconCandidates = (name) => {
    if (typeof name !== 'string' || !name.trim()) {
        return [FALLBACK_ICON];
    }

    const indexedIcon = resolveIndexedIcon(name);
    const candidates = [];

    if (indexedIcon) {
        candidates.push(indexedIcon);
    }

    if (ICONIFY_NAME_RE.test(name.trim())) {
        candidates.push(name.trim());
    } else {
        const slug = slugFromInput(name);
        if (slug) {
            candidates.push(`mdi:${slug}`);
            candidates.push(`vsc:${slug}`);
        }
    }

    candidates.push(FALLBACK_ICON);
    return dedupe(candidates);
};

export const ICON_INDEX_HINT = KNOWN_ICONS
    .map((entry) => `${entry.aliases[0]}=${entry.icon}`)
    .join(', ');
