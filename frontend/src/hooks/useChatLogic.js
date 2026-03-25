import { generatePillarsFromIdea, processChatTurn, generateCategoriesForPillar } from '../services/agentService';
import { saveStateToBackend } from '../services/apiService';
import { addDecisionToPillar, findNodeById, updateNodeDecisions } from '../utils/treeUtils';
import { normalizeFeatureDecision } from '../utils/featureNormalization';
import { resolveDecisionInsertion } from '../utils/chatMutationRouting';
import { detectActiveConflicts, clearAllDecisionConflicts } from '../services/conflictService';

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

const collectExistingConflictDescriptions = (nodes = [], bucket = new Set()) => {
  (nodes || []).forEach((node) => {
    (node.decisions || []).forEach((decision) => {
      const reasons = Array.isArray(decision.conflict_reasons)
        ? decision.conflict_reasons
        : (decision.conflict ? [decision.conflict] : []);
      reasons
        .map((reason) => String(reason || '').trim())
        .filter(Boolean)
        .forEach((reason) => bucket.add(reason));
    });
    if (node.subcategories?.length) collectExistingConflictDescriptions(node.subcategories, bucket);
  });
  return bucket;
};

const summarizeConflictsForReply = (conflicts = [], max = 3) => {
  return (conflicts || [])
    .slice(0, max)
    .map((conflict) => `- ${conflict.description}`)
    .join('\n');
};

const compactIdeaEcho = (text = '', maxLen = 220) => {
  const compact = String(text || '').replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  return compact.length > maxLen ? `${compact.slice(0, maxLen - 3)}...` : compact;
};

const countNestedSubcategories = (subcategories = []) => {
  return (subcategories || []).reduce((total, category) => {
    return total + 1 + countNestedSubcategories(category.subcategories || []);
  }, 0);
};

const countNestedDecisions = (subcategories = []) => {
  return (subcategories || []).reduce((total, category) => {
    return total + (category.decisions || []).length + countNestedDecisions(category.subcategories || []);
  }, 0);
};

const summarizeExpansion = (subData = {}) => {
  const subcategories = subData.subcategories || [];
  const rootDecisions = subData.decisions || [];
  return {
    categoryCount: countNestedSubcategories(subcategories),
    decisionCount: rootDecisions.length + countNestedDecisions(subcategories)
  };
};

const buildInitialProgressMessage = (idea) => {
  const echo = compactIdeaEcho(idea);
  return [
    'Great brief. Here is my understanding:',
    echo ? `- ${echo}` : '',
    'I am now generating your architecture pillars and first-pass decision map.'
  ].filter(Boolean).join('\n');
};

const buildInitialCompletionMessage = (pillars = [], runSummary = {}) => {
  const titles = (pillars || []).map((p) => p?.title).filter(Boolean);
  const listed = titles.length > 0 ? titles.slice(0, 6).join(', ') : 'core architecture pillars';
  const expansionCount = Array.isArray(runSummary.expansions) ? runSummary.expansions.length : 0;
  const callCount = (runSummary.callCount || 0) + expansionCount;
  const totalCategories = (runSummary.expansions || []).reduce((sum, item) => sum + (item.categoryCount || 0), 0);
  const totalDecisions = (runSummary.expansions || []).reduce((sum, item) => sum + (item.decisionCount || 0), 0);
  const durationSeconds = typeof runSummary.durationMs === 'number' ? (runSummary.durationMs / 1000).toFixed(1) : null;
  const expansionLines = (runSummary.expansions || [])
    .map((item) => `- ${item.title}: ${item.categoryCount} categories, ${item.decisionCount} decisions (${item.status}).`);
  return [
    `All set. I generated ${titles.length || 'the'} pillar${titles.length === 1 ? '' : 's'}: ${listed}.`,
    callCount > 0 ? `Execution summary: ${callCount} model call${callCount === 1 ? '' : 's'} completed${durationSeconds ? ` in ${durationSeconds}s` : ''}.` : '',
    (totalCategories + totalDecisions) > 0 ? `Discovered ${totalCategories} categories and ${totalDecisions} decisions across all pillars.` : '',
    expansionLines.length > 0 ? 'What each deep-dive call produced:' : '',
    ...expansionLines,
    'Suggested next step:',
    '- Start with the Features pillar to validate scope and sequencing.',
    '- Then resolve the highest-impact pending decision in Focus view.'
  ].filter(Boolean).join('\n');
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
    const runStartedAt = Date.now();
    const generatedPillars = await generatePillarsFromIdea(content, llmConfig);
    const extractingMessage = { role: 'agent', content: buildInitialProgressMessage(content) };
    const initialAgentMessages = [extractingMessage];
    const appendInitialAgentMessage = (message) => {
      const withId = {
        ...message,
        _id: message._id || `init-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      };
      initialAgentMessages.push(withId);
      setMessages(msgs => [...msgs, withId]);
      return withId._id;
    };
    const patchInitialAgentMessage = (messageId, patch) => {
      setMessages((msgs) => msgs.map((msg) => (msg._id === messageId ? { ...msg, ...patch } : msg)));
      const idx = initialAgentMessages.findIndex((msg) => msg._id === messageId);
      if (idx >= 0) {
        initialAgentMessages[idx] = { ...initialAgentMessages[idx], ...patch };
      }
    };

    setMessages([...newMessages, extractingMessage]);
    setPillars(generatedPillars);
    setIsWaiting(false);

    const planMessageId = appendInitialAgentMessage({
      role: 'agent',
      kind: 'thinking',
      status: 'working',
      content: `Working plan: 1 global pillar map call + ${generatedPillars.length} pillar deep-dive calls.`
    });

    const results = await Promise.all(generatedPillars.map(async (pillar) => {
      const progressMessageId = appendInitialAgentMessage({
        role: 'agent',
        kind: 'thinking',
        status: 'working',
        content: `Analyzing "${pillar.title}" to map subcategories and high-impact decisions...`
      });
      const startedAt = Date.now();
      try {
        const subData = await generateCategoriesForPillar(content, pillar, llmConfig);
        const stats = summarizeExpansion(subData);
        const durationMs = Date.now() - startedAt;
        setPillars(current => current.map(p => {
          if (p.id === pillar.id) {
            return { ...p, subcategories: subData.subcategories || [], decisions: subData.decisions || [] };
          }
          return p;
        }));
        patchInitialAgentMessage(progressMessageId, {
          status: 'completed',
          content: `Completed "${pillar.title}": ${stats.categoryCount} categories and ${stats.decisionCount} decisions identified (${(durationMs / 1000).toFixed(1)}s).`
        });
        return { ...subData, __stats: stats, __status: 'ok' };
      } catch {
        patchInitialAgentMessage(progressMessageId, {
          status: 'completed',
          content: `Completed "${pillar.title}" with fallback defaults (0 categories, 0 decisions).`
        });
        return { subcategories: [], decisions: [], __stats: { categoryCount: 0, decisionCount: 0 }, __status: 'fallback' };
      }
    }));

    patchInitialAgentMessage(planMessageId, {
      status: 'completed',
      content: `Completed run plan: 1 global pillar map call + ${generatedPillars.length} pillar deep-dive calls.`
    });

    const completionMessage = {
      role: 'agent',
      content: buildInitialCompletionMessage(generatedPillars, {
        callCount: 1,
        durationMs: Date.now() - runStartedAt,
        expansions: generatedPillars.map((pillar, idx) => ({
          title: pillar.title,
          categoryCount: results[idx]?.__stats?.categoryCount || 0,
          decisionCount: results[idx]?.__stats?.decisionCount || 0,
          status: results[idx]?.__status === 'fallback' ? 'fallback' : 'ok'
        }))
      })
    };
    appendInitialAgentMessage(completionMessage);
    const finalPillars = generatedPillars.map((p, idx) => ({
      ...p, subcategories: results[idx].subcategories || [], decisions: results[idx].decisions || []
    }));
    const finalMessages = [...newMessages, ...initialAgentMessages];
    const resultData = await saveStateToBackend(content, finalPillars, null, true, finalMessages);
    if (resultData?.projectId) setProjectId(resultData.projectId);
    if (typeof resultData?.projectOverview === 'string') setProjectOverview(resultData.projectOverview);
  };

  const handleSubsequentTurn = async (newMessages) => {
    const result = await processChatTurn(newMessages, pillars, llmConfig);
    let nextPillars = [...pillars];
    let attemptedInsertions = 0;
    let appliedInsertions = 0;
    const priorConflictDescriptions = collectExistingConflictDescriptions(pillars);
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
    const allConflicts = await detectActiveConflicts(nextPillars, llmConfig);
    const newlyIntroducedConflicts = allConflicts.filter(
      (conflict) => !priorConflictDescriptions.has(String(conflict.description || '').trim())
    );
    // Rebuild conflict state from scratch each turn so resolved conflicts disappear cleanly.
    nextPillars = clearAllDecisionConflicts(nextPillars);
    allConflicts.forEach(conflict => {
      nextPillars = updateNodeDecisions(nextPillars, conflict.decisionIds, (d) => {
        const priorReasons = Array.isArray(d.conflict_reasons)
          ? d.conflict_reasons
          : (d.conflict ? [d.conflict] : []);
        const mergedReasons = [...new Set([...priorReasons, conflict.description])];
        return {
          ...d,
          conflict: mergedReasons[0] || conflict.description,
          conflict_reasons: mergedReasons
        };
      });
    });

    const introducedByThisTurn = (result.updatedDecisions?.length || 0) > 0 || appliedInsertions > 0;
    const shouldPushBack = introducedByThisTurn && newlyIntroducedConflicts.length > 0;
    const baseReply = shouldPushBack
      ? [
          'I need to push back before we lock this in.',
          `This introduces ${newlyIntroducedConflicts.length} project conflict${newlyIntroducedConflicts.length === 1 ? '' : 's'}:`,
          summarizeConflictsForReply(newlyIntroducedConflicts),
          'Recommended next step: choose an option aligned with current architecture, or explicitly document this as an intentional exception.'
        ].join('\n')
      : (allConflicts.length > 0
        ? `${result.reply}\n\nI also detected cross-decision conflicts from a full-project consistency scan. If these are intentional, we should document the rationale explicitly.`
        : result.reply);

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

        if (action.type === 'open_url' && action.url && !openedExternal) {
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
