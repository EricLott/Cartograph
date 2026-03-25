import { generatePillarsFromIdea, processChatTurn, generateCategoriesForPillar } from '../services/agentService';
import { saveStateToBackend } from '../services/apiService';
import { addDecisionToPillar, findNodeById, updateNodeDecisions } from '../utils/treeUtils';
import { normalizeFeatureDecision } from '../utils/featureNormalization';
import { resolveDecisionInsertion } from '../utils/chatMutationRouting';

const normalizeText = (value = '') => value.toLowerCase();

const findFirstNode = (nodes, predicate) => {
  for (const node of nodes) {
    if (predicate(node)) return node;
    if (node.subcategories?.length) {
      const found = findFirstNode(node.subcategories, predicate);
      if (found) return found;
    }
  }
  return null;
};

const decisionMatches = (decision, matcher) => {
  if (!decision) return false;
  if (matcher.id && decision.id === matcher.id) return true;
  if (!matcher.pattern) return false;
  const haystack = `${decision.question || ''} ${decision.context || ''}`.toLowerCase();
  return matcher.pattern.test(haystack);
};

const upsertDecisionOnNode = (pillars, targetId, decision, matcher = {}) => {
  const target = findNodeById(pillars, targetId);
  if (!target) return pillars;
  const isFeatureTarget = target.id === 'pillar-features';
  const normalizedDecision = isFeatureTarget ? normalizeFeatureDecision(decision) : decision;

  const existing = (target.decisions || []).find((d) => decisionMatches(d, matcher) || d.id === normalizedDecision.id);
  if (existing) {
    return updateNodeDecisions(pillars, existing.id, (d) => ({ ...d, ...normalizedDecision, id: d.id }));
  }

  return addDecisionToPillar(pillars, targetId, normalizedDecision);
};

const findDecisionLocation = (pillars, decisionId) => {
  for (const pillar of pillars) {
    const stack = [{ node: pillar }];
    while (stack.length > 0) {
      const { node } = stack.pop();
      if ((node.decisions || []).some((decision) => decision.id === decisionId)) {
        return { pillarId: pillar.id, decisionId };
      }
      (node.subcategories || []).forEach((child) => stack.push({ node: child }));
    }
  }
  return null;
};

const userRequestedNavigation = (text = '') => {
  return /\b(open|link|documentation|docs|navigate|take me|go to|show me)\b/i.test(text);
};

const applyRealtimeStripeFallback = (pillars, message) => {
  const normalized = normalizeText(message);
  if (!/\bstripe\b/.test(normalized)) return pillars;

  const mentionsSubscriptions = /\bsubscription|subscriptions|billing|recurring\b/.test(normalized);
  const mentionsWebhooks = /\bwebhook|webhooks|event endpoint|event endpoints\b/.test(normalized);

  let next = pillars;

  const featuresNode = findFirstNode(next, (node) => normalizeText(node.title).includes('feature'));
  if (featuresNode && (mentionsSubscriptions || mentionsWebhooks)) {
    next = upsertDecisionOnNode(
      next,
      featuresNode.id,
      normalizeFeatureDecision({
        id: 'feat_stripe_subscriptions',
        question: 'Stripe subscription payments',
        context: 'Support recurring subscriptions via Stripe Checkout/Billing and synchronize status to user accounts.',
        answer: 'Included',
        acceptance_criteria: [
          'Customers can start, manage, and cancel Stripe subscriptions.',
          'Subscription status is synchronized and reflected in product access controls.'
        ],
        technical_context: 'Implement Stripe Checkout/Billing flows and webhook-driven state reconciliation.',
        priority: 'P1'
      }),
      { pattern: /stripe.*subscription|subscription.*stripe|stripe.*billing/ }
    );
  }

  const apiNode = findFirstNode(
    next,
    (node) => normalizeText(node.title).includes('api') || normalizeText(node.id).includes('api')
  );
  if (apiNode && (mentionsWebhooks || mentionsSubscriptions)) {
    next = upsertDecisionOnNode(
      next,
      apiNode.id,
      {
        id: 'api_stripe_webhooks',
        question: 'Stripe webhook endpoint suite',
        context: 'Implement webhook endpoints for subscription lifecycle events (checkout/session completion, invoice, and subscription status changes).',
        answer: 'Required'
      },
      { pattern: /stripe.*webhook|webhook.*stripe|subscription.*event/ }
    );
  }

  return next;
};

const sanitizeAgentReply = (reply, { updatedDecisionsCount = 0 } = {}) => {
  if (typeof reply !== 'string' || !reply.trim()) return 'Captured. Proceeding to the next architectural step.';
  let nextReply = reply.trim();

  // If the user already made a clear choice, avoid confirmation loops.
  if (updatedDecisionsCount > 0) {
    nextReply = nextReply
      .replace(/\bdo you confirm\b/gi, 'noted')
      .replace(/\blet'?s confirm\b/gi, 'captured')
      .replace(/\bplease confirm\b/gi, 'captured');
  }

  // Keep the conversation focused: at most one clarifying question in a turn.
  // Preserve the full response content by converting extra '?' to '.' instead of truncating.
  const questionMarkCount = (nextReply.match(/\?/g) || []).length;
  if (questionMarkCount > 1) {
    let seenQuestion = false;
    nextReply = nextReply.replace(/\?/g, () => {
      if (!seenQuestion) {
        seenQuestion = true;
        return '?';
      }
      return '.';
    });
  }

  return nextReply;
};

const KNOWN_DATASTORES = [
  { key: 'firestore', label: 'Firestore', pattern: /\bfirestore\b/i },
  { key: 'cosmosdb', label: 'CosmosDB', pattern: /\bcosmos\s?db\b/i },
  { key: 'mysql', label: 'MySQL', pattern: /\bmysql\b/i },
  { key: 'postgres', label: 'PostgreSQL', pattern: /\bpostgres(?:ql)?\b/i },
  { key: 'mongodb', label: 'MongoDB', pattern: /\bmongo(?:db)?\b/i },
  { key: 'dynamodb', label: 'DynamoDB', pattern: /\bdynamodb\b/i }
];

const findStoresInText = (text = '') => {
  return KNOWN_DATASTORES
    .filter((store) => store.pattern.test(text))
    .map((store) => ({ key: store.key, label: store.label }));
};

const collectResolvedDatastoreDecisions = (nodes, bucket = []) => {
  (nodes || []).forEach((node) => {
    (node.decisions || []).forEach((decision) => {
      const answerText = `${decision.answer || ''} ${decision.question || ''} ${decision.context || ''}`;
      const stores = findStoresInText(answerText);
      if (stores.length > 0 && decision.answer) {
        bucket.push({ decisionId: decision.id, stores });
      }
    });
    if (node.subcategories?.length) collectResolvedDatastoreDecisions(node.subcategories, bucket);
  });
  return bucket;
};

const buildDatastoreConflict = (pillars, latestUserMessage) => {
  const proposedStores = findStoresInText(latestUserMessage);
  if (proposedStores.length === 0) return null;

  const resolved = collectResolvedDatastoreDecisions(pillars);
  if (resolved.length === 0) return null;

  const existingKeys = new Set(resolved.flatMap((r) => r.stores.map((s) => s.key)));
  const proposedNew = proposedStores.filter((s) => !existingKeys.has(s.key));
  if (proposedNew.length === 0) return null;

  const existingLabels = [...new Set(resolved.flatMap((r) => r.stores.map((s) => s.label)))];
  const proposedLabels = [...new Set(proposedNew.map((s) => s.label))];
  const decisionIds = [...new Set(resolved.map((r) => r.decisionId))];

  return {
    description: `Potential datastore divergence: existing decisions use ${existingLabels.join(', ')}, while the new proposal introduces ${proposedLabels.join(', ')}. Consider consolidating data stores or explicitly separating bounded contexts.`,
    decisionIds
  };
};

const compactIdeaEcho = (text = '', maxLen = 220) => {
  const compact = String(text || '').replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  return compact.length > maxLen ? `${compact.slice(0, maxLen - 3)}...` : compact;
};

const buildInitialProgressMessage = (idea) => {
  const echo = compactIdeaEcho(idea);
  return [
    'Great brief. Here is my understanding:',
    echo ? `- ${echo}` : '',
    'I am now generating your architecture pillars and first-pass decision map.'
  ].filter(Boolean).join('\n');
};

const buildInitialCompletionMessage = (pillars = []) => {
  const titles = (pillars || []).map((p) => p?.title).filter(Boolean);
  const listed = titles.length > 0 ? titles.slice(0, 6).join(', ') : 'core architecture pillars';
  return [
    `All set. I generated ${titles.length || 'the'} pillar${titles.length === 1 ? '' : 's'}: ${listed}.`,
    'Suggested next step:',
    '- Start with the Features pillar to validate scope and sequencing.',
    '- Then resolve the highest-impact pending decision in Focus view.'
  ].join('\n');
};

export function useChatLogic(state, setters) {
  const { messages, pillars, projectId, llmConfig } = state;
  const {
    setMessages,
    setPillars,
    setIsWaiting,
    setProjectId,
    setProjectOverview,
    setErrorMessage,
    setActivePillarId,
    setActiveDecisionId,
    setViewMode
  } = setters;

  const handleSendMessage = async (content) => {
    setErrorMessage(null);
    const newMessages = [...messages, { role: 'user', content }];
    setMessages(newMessages);
    setIsWaiting(true);

    try {
      if (pillars.length === 0) {
        await handleInitialIdea(content, newMessages);
      } else {
        await handleSubsequentTurn(newMessages);
      }
    } catch (err) {
      console.error("Chat flow failed:", err);
      setMessages(msgs => [...msgs, { role: 'agent', content: "An error occurred." }]);
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsWaiting(false);
    }
  };

  const handleInitialIdea = async (content, newMessages) => {
    const generatedPillars = await generatePillarsFromIdea(content, llmConfig);
    const extractingMessage = { role: 'agent', content: buildInitialProgressMessage(content) };
    setMessages([...newMessages, extractingMessage]);
    setPillars(generatedPillars);
    setIsWaiting(false);

    const results = await Promise.all(generatedPillars.map(async (pillar) => {
      try {
        const subData = await generateCategoriesForPillar(content, pillar, llmConfig);
        setPillars(current => current.map(p => {
          if (p.id === pillar.id) {
            return { ...p, subcategories: subData.subcategories || [], decisions: subData.decisions || [] };
          }
          return p;
        }));
        return subData;
      } catch {
        return { subcategories: [], decisions: [] };
      }
    }));

    const completionMessage = { role: 'agent', content: buildInitialCompletionMessage(generatedPillars) };
    setMessages(msgs => [...msgs, completionMessage]);
    const finalPillars = generatedPillars.map((p, idx) => ({
      ...p, subcategories: results[idx].subcategories || [], decisions: results[idx].decisions || []
    }));
    const finalMessages = [...newMessages, extractingMessage, completionMessage];
    const resultData = await saveStateToBackend(content, finalPillars, null, true, finalMessages);
    if (resultData?.projectId) setProjectId(resultData.projectId);
    if (typeof resultData?.projectOverview === 'string') setProjectOverview(resultData.projectOverview);
  };

  const handleSubsequentTurn = async (newMessages) => {
    const result = await processChatTurn(newMessages, pillars, llmConfig);
    const latestUserMessage = newMessages[newMessages.length - 1]?.content || '';
    let nextPillars = [...pillars];
    let attemptedInsertions = 0;
    let appliedInsertions = 0;
    if (result.newCategories?.length > 0) nextPillars = [...nextPillars, ...result.newCategories];
    if (result.newDecisions?.length > 0) {
      result.newDecisions.forEach((insertion) => {
        if (!insertion?.targetId || !insertion?.decision) return;
        attemptedInsertions += 1;
        const resolvedInsertion = resolveDecisionInsertion(nextPillars, insertion);
        if (!resolvedInsertion) return;
        const before = nextPillars;
        nextPillars = upsertDecisionOnNode(nextPillars, resolvedInsertion.targetId, resolvedInsertion.decision);
        if (nextPillars !== before) appliedInsertions += 1;
      });
    }
    if (result.updatedDecisions?.length > 0) {
      nextPillars = updateNodeDecisions(nextPillars, result.updatedDecisions, (d, update) => ({ ...d, answer: update.answer }));
    }
    const heuristicConflict = buildDatastoreConflict(nextPillars, latestUserMessage);
    const allConflicts = [...(result.conflicts || []), ...(heuristicConflict ? [heuristicConflict] : [])];
    if (allConflicts.length > 0) {
      allConflicts.forEach(conflict => {
        nextPillars = updateNodeDecisions(nextPillars, conflict.decisionIds, (d) => ({ ...d, conflict: conflict.description }));
      });
    }

    nextPillars = applyRealtimeStripeFallback(nextPillars, latestUserMessage);

    const baseReply = heuristicConflict
      ? `${result.reply}\n\nI also see a potential datastore divergence versus earlier decisions. We can keep multiple stores, but we should explicitly justify the boundary to avoid unnecessary complexity.`
      : result.reply;

    const insertionWarning =
      attemptedInsertions > 0 && appliedInsertions === 0
        ? '\n\nI could not safely place one or more new items into the current tree, so I did not apply those additions yet.'
        : '';
    const finalReply = sanitizeAgentReply(`${baseReply}${insertionWarning}`, {
      updatedDecisionsCount: result.updatedDecisions?.length || 0
    });

    setPillars(nextPillars);
    const responseMessage = { role: 'agent', content: finalReply, artifact: result.artifact || null };
    const nextMessages = [...newMessages, responseMessage];
    setMessages(nextMessages);

    if (Array.isArray(result.uiActions) && result.uiActions.length > 0) {
      const canOpenExternal = userRequestedNavigation(latestUserMessage);
      let openedExternal = false;

      result.uiActions.forEach((action) => {
        if (!action || !action.type) return;

        if (action.type === 'focus_pillar' && action.pillarId) {
          setViewMode('pillar');
          setActivePillarId(action.pillarId);
          setActiveDecisionId(null);
          return;
        }

        if (action.type === 'focus_decision' && action.decisionId) {
          const location = findDecisionLocation(nextPillars, action.decisionId);
          if (!location) return;
          setViewMode('decision');
          setActivePillarId(location.pillarId);
          setActiveDecisionId(location.decisionId);
          return;
        }

        if (action.type === 'open_url' && action.url && !openedExternal && canOpenExternal) {
          if (/^https?:\/\//i.test(action.url) && typeof window !== 'undefined' && typeof window.open === 'function') {
            window.open(action.url, '_blank', 'noopener,noreferrer');
            openedExternal = true;
          }
        }
      });
    }

    const ideaMsg = newMessages.find(m => m.role === 'user');
    if (ideaMsg) {
      const resultData = await saveStateToBackend(ideaMsg.content, nextPillars, projectId, true, nextMessages);
      if (resultData?.projectId) setProjectId(resultData.projectId);
      if (typeof resultData?.projectOverview === 'string') setProjectOverview(resultData.projectOverview);
    }
  };

  return { handleSendMessage };
}
