/**
 * Validation utilities for LLM provider outputs.
 */

const isPlainObject = (value) => 
    value !== null && typeof value === 'object' && !Array.isArray(value);

const stripJsonCodeFences = (text) => {
    let normalized = text.trim();
    if (normalized.startsWith('```')) {
        normalized = normalized.replace(/^```(?:json)?\s*/i, '');
        normalized = normalized.replace(/\s*```$/, '');
    }
    return normalized.trim();
};

const createSchemaError = (contextLabel, message) => {
    return new Error(`${contextLabel} output validation failed: ${message}`);
};

const parseJsonOutput = (text, contextLabel) => {
    if (typeof text !== 'string' || !text.trim()) {
        throw createSchemaError(contextLabel, 'provider returned empty content.');
    }

    const normalized = stripJsonCodeFences(text);

    try {
        return JSON.parse(normalized);
    } catch {
        throw createSchemaError(contextLabel, 'provider did not return valid JSON.');
    }
};

const assertPlainObject = (value, path, contextLabel) => {
    if (!isPlainObject(value)) {
        throw createSchemaError(contextLabel, `"${path}" must be an object.`);
    }
};

const assertArray = (value, path, contextLabel) => {
    if (!Array.isArray(value)) {
        throw createSchemaError(contextLabel, `"${path}" must be an array.`);
    }
};

const assertNonEmptyString = (value, path, contextLabel) => {
    if (typeof value !== 'string' || !value.trim()) {
        throw createSchemaError(contextLabel, `"${path}" must be a non-empty string.`);
    }
};

const assertNullableString = (value, path, contextLabel) => {
    if (value !== null && typeof value !== 'string') {
        throw createSchemaError(contextLabel, `"${path}" must be a string or null.`);
    }
};

const validateAdaptiveCardArtifact = (artifact, path, contextLabel) => {
    if (artifact === null || artifact === undefined) return null;
    assertPlainObject(artifact, path, contextLabel);
    assertNonEmptyString(artifact.type, `${path}.type`, contextLabel);
    if (artifact.type !== 'adaptive_card') {
        throw createSchemaError(contextLabel, `"${path}.type" must be "adaptive_card".`);
    }
    assertPlainObject(artifact.json, `${path}.json`, contextLabel);
    assertNonEmptyString(artifact.json.type, `${path}.json.type`, contextLabel);
    if (artifact.json.type !== 'AdaptiveCard') {
        throw createSchemaError(contextLabel, `"${path}.json.type" must be "AdaptiveCard".`);
    }
    return artifact;
};

const validateUiActions = (uiActions, path, contextLabel) => {
    const allowedTypes = new Set(['focus_decision', 'focus_pillar', 'open_url']);
    const safeActions = [];

    if (uiActions === null || uiActions === undefined) return safeActions;
    assertArray(uiActions, path, contextLabel);

    uiActions.forEach((action, index) => {
        const actionPath = `${path}[${index}]`;
        assertPlainObject(action, actionPath, contextLabel);
        assertNonEmptyString(action.type, `${actionPath}.type`, contextLabel);

        if (!allowedTypes.has(action.type)) {
            throw createSchemaError(contextLabel, `"${actionPath}.type" must be one of focus_decision|focus_pillar|open_url.`);
        }

        if (action.type === 'focus_decision') {
            assertNonEmptyString(action.decisionId, `${actionPath}.decisionId`, contextLabel);
            safeActions.push({ type: action.type, decisionId: action.decisionId });
            return;
        }

        if (action.type === 'focus_pillar') {
            assertNonEmptyString(action.pillarId, `${actionPath}.pillarId`, contextLabel);
            safeActions.push({ type: action.type, pillarId: action.pillarId });
            return;
        }

        if (action.type === 'open_url') {
            assertNonEmptyString(action.url, `${actionPath}.url`, contextLabel);
            safeActions.push({ type: action.type, url: action.url });
        }
    });

    return safeActions;
};

const validateDecisionNode = (node, path, contextLabel) => {
    assertPlainObject(node, path, contextLabel);
    assertNonEmptyString(node.id, `${path}.id`, contextLabel);
    assertNonEmptyString(node.question, `${path}.question`, contextLabel);
    assertNonEmptyString(node.context, `${path}.context`, contextLabel);
    assertNullableString(node.answer, `${path}.answer`, contextLabel);
    // Allow icon to be missing or null
    node.icon = typeof node.icon === 'string' ? node.icon : null;
    
    if (node.options) {
        assertArray(node.options, `${path}.options`, contextLabel);
        node.options.forEach((opt, i) => {
            const optPath = `${path}.options[${i}]`;
            assertPlainObject(opt, optPath, contextLabel);
            assertNonEmptyString(opt.id, `${optPath}.id`, contextLabel);
            assertNonEmptyString(opt.label, `${optPath}.label`, contextLabel);
            assertNullableString(opt.icon, `${optPath}.icon`, contextLabel);
        });
    }
    
    if (node.links) {
        assertArray(node.links, `${path}.links`, contextLabel);
        node.links.forEach((link, i) => {
            const linkPath = `${path}.links[${i}]`;
            assertPlainObject(link, linkPath, contextLabel);
            assertNonEmptyString(link.id, `${linkPath}.id`, contextLabel);
            assertNonEmptyString(link.type, `${linkPath}.type`, contextLabel);
        });
    }

    if (node.work_item_type !== undefined && node.work_item_type !== null) {
        const allowed = new Set(['epic', 'feature', 'task']);
        const value = String(node.work_item_type).toLowerCase();
        if (!allowed.has(value)) {
            throw createSchemaError(contextLabel, `"${path}.work_item_type" must be one of epic|feature|task.`);
        }
        node.work_item_type = value;
        if (value !== 'epic' && node.parent_id !== undefined && node.parent_id !== null) {
            assertNonEmptyString(node.parent_id, `${path}.parent_id`, contextLabel);
        }
    }
};

export const validateCategoryNode = (node, path, contextLabel) => {
    assertPlainObject(node, path, contextLabel);
    assertNonEmptyString(node.id, `${path}.id`, contextLabel);
    assertNonEmptyString(node.title, `${path}.title`, contextLabel);
    node.icon = typeof node.icon === 'string' ? node.icon : null;
    node.subcategories = Array.isArray(node.subcategories) ? node.subcategories : [];
    node.decisions = Array.isArray(node.decisions) ? node.decisions : [];

    node.subcategories.forEach((subcategory, index) =>
        validateCategoryNode(subcategory, `${path}.subcategories[${index}]`, contextLabel)
    );
    node.decisions.forEach((decision, index) =>
        validateDecisionNode(decision, `${path}.decisions[${index}]`, contextLabel)
    );
};

export const validatePillarArrayOutput = (output, contextLabel) => {
    assertArray(output, 'root', contextLabel);
    output.forEach((pillar, index) => validateCategoryNode(pillar, `root[${index}]`, contextLabel));
    return output;
};

export const validateCategoryExpansionOutput = (output, contextLabel) => {
    assertPlainObject(output, 'root', contextLabel);
    output.subcategories = Array.isArray(output.subcategories) ? output.subcategories : [];
    output.decisions = Array.isArray(output.decisions) ? output.decisions : [];

    output.subcategories.forEach((subcategory, index) =>
        validateCategoryNode(subcategory, `root.subcategories[${index}]`, contextLabel)
    );

    output.decisions.forEach((decision, index) =>
        validateDecisionNode(decision, `root.decisions[${index}]`, contextLabel)
    );
    return output;
};

export const validateChatTurnOutput = (output, contextLabel) => {
    assertPlainObject(output, 'root', contextLabel);
    assertNonEmptyString(output.reply, 'root.reply', contextLabel);

    assertArray(output.updatedDecisions, 'root.updatedDecisions', contextLabel);
    output.updatedDecisions.forEach((update, index) => {
        const path = `root.updatedDecisions[${index}]`;
        assertPlainObject(update, path, contextLabel);
        assertNonEmptyString(update.id, `${path}.id`, contextLabel);
        assertNonEmptyString(update.answer, `${path}.answer`, contextLabel);
    });

    assertArray(output.newCategories, 'root.newCategories', contextLabel);
    output.newCategories.forEach((category, index) =>
        validateCategoryNode(category, `root.newCategories[${index}]`, contextLabel)
    );

    output.newDecisions = Array.isArray(output.newDecisions) ? output.newDecisions : [];
    output.newDecisions.forEach((insertion, index) => {
        const path = `root.newDecisions[${index}]`;
        assertPlainObject(insertion, path, contextLabel);
        assertNonEmptyString(insertion.targetId, `${path}.targetId`, contextLabel);
        validateDecisionNode(insertion.decision, `${path}.decision`, contextLabel);
    });

    assertArray(output.conflicts, 'root.conflicts', contextLabel);
    output.conflicts.forEach((conflict, index) => {
        const path = `root.conflicts[${index}]`;
        assertPlainObject(conflict, path, contextLabel);
        assertNonEmptyString(conflict.description, `${path}.description`, contextLabel);
        assertArray(conflict.decisionIds, `${path}.decisionIds`, contextLabel);
        conflict.decisionIds.forEach((id, idIndex) =>
            assertNonEmptyString(id, `${path}.decisionIds[${idIndex}]`, contextLabel)
        );
    });

    output.uiActions = validateUiActions(output.uiActions, 'root.uiActions', contextLabel);
    output.artifact = validateAdaptiveCardArtifact(output.artifact, 'root.artifact', contextLabel);

    return output;
};

export const validateConsistencyOutput = (output, contextLabel) => {
    assertPlainObject(output, 'root', contextLabel);
    assertArray(output.conflicts, 'root.conflicts', contextLabel);
    output.conflicts.forEach((conflict, index) => {
        const path = `root.conflicts[${index}]`;
        assertPlainObject(conflict, path, contextLabel);
        assertNonEmptyString(conflict.description, `${path}.description`, contextLabel);
        assertArray(conflict.decisionIds, `${path}.decisionIds`, contextLabel);
        conflict.decisionIds.forEach((id, idIndex) =>
            assertNonEmptyString(id, `${path}.decisionIds[${idIndex}]`, contextLabel)
        );
    });
    return output;
};

export const parseAndValidateProviderOutput = (text, contextLabel, validator) => {
    const parsed = parseJsonOutput(text, contextLabel);
    return validator(parsed, contextLabel);
};
