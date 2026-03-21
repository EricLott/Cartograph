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

const validateDecisionNode = (node, path, contextLabel) => {
    assertPlainObject(node, path, contextLabel);
    assertNonEmptyString(node.id, `${path}.id`, contextLabel);
    assertNonEmptyString(node.question, `${path}.question`, contextLabel);
    assertNonEmptyString(node.context, `${path}.context`, contextLabel);
    assertNullableString(node.answer, `${path}.answer`, contextLabel);
};

export const validateCategoryNode = (node, path, contextLabel) => {
    assertPlainObject(node, path, contextLabel);
    assertNonEmptyString(node.id, `${path}.id`, contextLabel);
    assertNonEmptyString(node.title, `${path}.title`, contextLabel);
    assertNonEmptyString(node.description, `${path}.description`, contextLabel);

    assertArray(node.subcategories, `${path}.subcategories`, contextLabel);
    node.subcategories.forEach((subcategory, index) =>
        validateCategoryNode(subcategory, `${path}.subcategories[${index}]`, contextLabel)
    );

    assertArray(node.decisions, `${path}.decisions`, contextLabel);
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
    assertArray(output.subcategories, 'root.subcategories', contextLabel);
    output.subcategories.forEach((subcategory, index) =>
        validateCategoryNode(subcategory, `root.subcategories[${index}]`, contextLabel)
    );

    assertArray(output.decisions, 'root.decisions', contextLabel);
    output.decisions.forEach((decision, index) =>
        validateDecisionNode(decision, `${path}.decisions[${index}]`, contextLabel)
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
