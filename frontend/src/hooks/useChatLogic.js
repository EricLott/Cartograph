import { processChatTurn } from '../services/agentService';
import { saveStateToBackend, groundPlannerV2, generatePlannerV2, assessIntakeV2 } from '../services/apiService';
import { addDecisionToPillar, findNodeById, updateNodeDecisions } from '../utils/treeUtils';
import { normalizeFeatureDecision } from '../utils/featureNormalization';
import { resolveDecisionInsertion } from '../utils/chatMutationRouting';
import { detectActiveConflicts, clearAllDecisionConflicts } from '../services/conflictService';
import { DEFAULT_AGENT_ID, getAgentById, resolveMentionedAgent } from '../agents/agentRegistry';

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
  const targetContainsWorkItems = (target.decisions || []).some((d) => !!d?.work_item_type);
  const incomingIsWorkItem = !!(
    decision?.work_item_type
    || decision?.workItemType
    || decision?.parent_id
    || decision?.parentId
    || Array.isArray(decision?.acceptance_criteria)
  );
  const normalizedDecision = (targetContainsWorkItems || incomingIsWorkItem)
    ? normalizeFeatureDecision(decision)
    : decision;

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

const cloneJson = (value) => {
  try {
    return JSON.parse(JSON.stringify(value ?? {}));
  } catch {
    return {};
  }
};

const flattenDecisionsFromPillars = (nodes = [], bucket = []) => {
  (nodes || []).forEach((node) => {
    (node.decisions || []).forEach((decision) => {
      bucket.push({
        ...decision,
        __pillarId: node.id,
        __pillarTitle: node.title
      });
    });
    flattenDecisionsFromPillars(node.subcategories || [], bucket);
  });
  return bucket;
};

const syncV2StateWithPillars = (currentV2State = {}, updatedPillars = []) => {
  const next = cloneJson(currentV2State);
  const decisionsFromPillars = flattenDecisionsFromPillars(updatedPillars);
  const byId = new Map(decisionsFromPillars.map((decision) => [String(decision.id || ''), decision]));

  if (!next.decision_graph) next.decision_graph = { decisions: [], edges: [] };
  if (!Array.isArray(next.decision_graph.decisions)) next.decision_graph.decisions = [];

  next.decision_graph.decisions = next.decision_graph.decisions.map((decision) => {
    const source = byId.get(String(decision.id || ''));
    if (!source) return decision;
    return {
      ...decision,
      question: source.question || decision.question,
      short_title: source.short_title || decision.short_title || source.question || decision.question,
      context: source.context || decision.context,
      answer: source.answer ?? decision.answer,
      priority: source.priority || decision.priority,
      dependencies: Array.isArray(source.dependencies) ? source.dependencies : (decision.dependencies || []),
      work_item_type: source.work_item_type || decision.work_item_type || 'task',
      parent_id: source.parent_id ?? decision.parent_id ?? null
    };
  });

  const existingIds = new Set(next.decision_graph.decisions.map((decision) => String(decision.id || '')));
  decisionsFromPillars.forEach((decision) => {
    const id = String(decision.id || '');
    if (!id || existingIds.has(id)) return;
    next.decision_graph.decisions.push({
      id,
      capability_id: null,
      question: decision.question || id,
      short_title: decision.short_title || decision.question || id,
      context: decision.context || '',
      answer: decision.answer ?? null,
      options: Array.isArray(decision.options) ? decision.options : [],
      dependencies: Array.isArray(decision.dependencies) ? decision.dependencies : [],
      priority: decision.priority || 'P1',
      work_item_type: decision.work_item_type || 'task',
      parent_id: decision.parent_id ?? null,
      rationale: '',
      tags: Array.isArray(decision.tags) ? decision.tags : []
    });
  });

  return next;
};

const buildInitialProgressMessage = (idea) => {
  const echo = compactIdeaEcho(idea);
  return [
    'Great brief. Here is my understanding:',
    echo ? `- ${echo}` : '',
    'I am now generating your architecture pillars and first-pass decision map.'
  ].filter(Boolean).join('\n');
};

const buildPmDiscoveryMessage = (intake = {}) => {
  const understanding = String(intake?.understanding || '').trim();
  const missing = Array.isArray(intake?.missing_information) ? intake.missing_information.filter(Boolean) : [];
  const questions = Array.isArray(intake?.questions) ? intake.questions.filter((q) => q?.question) : [];
  const nextQuestion = questions[0] || null;
  return [
    'I need a bit more context before handing this to the Architect Agent.',
    understanding || null,
    missing.length > 0 ? 'Missing context to de-risk architecture:' : null,
    ...missing.slice(0, 4).map((item) => `- ${item}`),
    nextQuestion ? 'Next question:' : null,
    nextQuestion ? `1. ${nextQuestion.question}` : null,
    nextQuestion?.why ? `Why this matters: ${nextQuestion.why}` : null
  ].filter(Boolean).join('\n');
};

const buildPmHandoffMessage = (intake = {}) => {
  const understanding = String(intake?.understanding || '').trim();
  const brief = String(intake?.handoff_brief || '').trim();
  return [
    'Handoff complete: enough context captured. Passing this to Architect Agent for structure and decision mapping.',
    understanding || null,
    brief ? `Handoff brief: ${brief}` : null
  ].filter(Boolean).join('\n');
};

const createAgentMessage = (agentId, content, extra = {}) => {
  const agent = getAgentById(agentId || DEFAULT_AGENT_ID);
  return {
    role: 'agent',
    agentId: agent.id,
    agentLabel: agent.label,
    content,
    ...extra
  };
};

const shouldReopenDiscovery = (text = '') => {
  const normalized = String(text || '').toLowerCase();
  return /(start over|new project|new direction|pivot|re-scope|rescope|from scratch|reframe)/.test(normalized);
};

const buildInitialCompletionMessageV2 = (plan = {}, durationMs = 0) => {
  const capabilityCount = Array.isArray(plan?.capability_graph?.nodes) ? plan.capability_graph.nodes.length : 0;
  const decisionCount = Array.isArray(plan?.decision_graph?.decisions) ? plan.decision_graph.decisions.length : 0;
  const lensCount = Array.isArray(plan?.capability_graph?.lenses) ? plan.capability_graph.lenses.length : 0;
  const primitiveCount = Array.isArray(plan?.domain_discovery?.domain_primitives) ? plan.domain_discovery.domain_primitives.length : 0;
  const sourceCount = Number(plan?.planner_meta?.sources_used || 0);
  const ecosystem = String(plan?.domain_discovery?.detected_ecosystem || '').trim();
  const epics = Array.isArray(plan?.execution_projection?.epics) ? plan.execution_projection.epics.length : 0;
  const features = Array.isArray(plan?.execution_projection?.features) ? plan.execution_projection.features.length : 0;
  const tasks = Array.isArray(plan?.execution_projection?.tasks) ? plan.execution_projection.tasks.length : 0;
  const uncovered = Array.isArray(plan?.planner_meta?.uncovered_items) ? plan.planner_meta.uncovered_items.length : 0;
  const seconds = durationMs > 0 ? (durationMs / 1000).toFixed(1) : null;

  return [
    `All set. planner.v2${seconds ? ` in ${seconds}s` : ''}: ${lensCount} lenses, ${capabilityCount} capabilities, ${decisionCount} scoped decisions.`,
    ecosystem ? `Detected ecosystem: ${ecosystem}.` : null,
    `Grounding footprint: ${primitiveCount} domain primitives${sourceCount > 0 ? `, ${sourceCount} source citations` : ''}.`,
    uncovered > 0 ? `Coverage audit flagged ${uncovered} potential gap${uncovered === 1 ? '' : 's'} for follow-up.` : 'Coverage audit: no obvious domain gaps flagged.',
    `Execution projection prepared ${epics} epics, ${features} features, and ${tasks} tasks.`,
    'Suggested next step:',
    '- Open the highest-impact pending decision in Focus view.',
    '- Validate capability coverage before handing off to downstream agent swarms.'
  ].filter(Boolean).join('\n');
};

export function useChatLogic(state, setters) {
  const { messages, pillars, projectId, llmConfig, v2State } = state;
  const {
    setMessages,
    setPillars,
    setIsWaiting,
    setProjectId,
    setProjectOverview,
    setV2State,
    setErrorMessage,
    setActivePillarId,
    setActiveDecisionId,
    setViewMode
  } = setters;

  const handleSendMessage = async (content) => {
    setErrorMessage(null);
    const mention = resolveMentionedAgent(content);
    if (mention.unknownHandle) {
      const unknownMentionReply = createAgentMessage(
        'coordinator',
        `I don't recognize @${mention.unknownHandle}. Available agents: @pm and @architect.`
      );
      setMessages([...messages, { role: 'user', content }, unknownMentionReply]);
      return;
    }

    if (mention.agentId === 'coordinator') {
      const coordinatorReply = createAgentMessage(
        'coordinator',
        'I can route this for you. Use @pm for requirements discovery and @architect for solution design.'
      );
      setMessages([...messages, { role: 'user', content }, coordinatorReply]);
      return;
    }

    const targetAgent = mention.agentId ? getAgentById(mention.agentId) : null;
    const newMessages = [
      ...messages,
      {
        role: 'user',
        content,
        targetAgentId: targetAgent?.id || null,
        targetAgentLabel: targetAgent?.label || null
      }
    ];
    setMessages(newMessages);
    setIsWaiting(true);

    try {
      const routedContent = mention.cleanedContent || content;
      if (pillars.length === 0) {
        await handleInitialIdea(routedContent, newMessages, mention.agentId);
      } else {
        await handleSubsequentTurn(newMessages, routedContent, mention.agentId);
      }
    } catch (err) {
      console.error("Chat flow failed:", err);
      setMessages(msgs => [...msgs, createAgentMessage('coordinator', 'An error occurred.')]);
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsWaiting(false);
    }
  };

  const handleInitialIdea = async (content, newMessages, preferredAgentId = null) => {
    const projectIdea = String(v2State?.idea || content || '').trim();
    const intakeState = await assessIntakeV2({
      idea: projectIdea,
      chatHistory: newMessages,
      priorState: v2State?.intake_state || null,
      hasArchitecture: false,
      config: llmConfig
    });

    if (preferredAgentId === 'pm') {
      const pmOnlyMessage = createAgentMessage(
        'pm',
        String(intakeState?.mode || '') === 'ready_for_architecture'
          ? `${buildPmHandoffMessage(intakeState)}\n\nMention @architect when you want me to generate the capability and decision graph.`
          : buildPmDiscoveryMessage(intakeState)
      );
      const nextMessages = [...newMessages, pmOnlyMessage];
      const nextV2State = {
        ...v2State,
        idea: projectIdea,
        intake_state: intakeState,
        planner_meta: {
          ...(v2State?.planner_meta || {}),
          lifecycle_stage: String(intakeState?.mode || '') === 'ready_for_architecture'
            ? 'ready_for_architecture'
            : 'requirements_discovery'
        }
      };

      setV2State(nextV2State);
      setMessages(nextMessages);

      const resultData = await saveStateToBackend(
        projectIdea || content,
        [],
        projectId,
        true,
        nextMessages,
        nextV2State
      );
      if (resultData?.projectId) setProjectId(resultData.projectId);
      if (typeof resultData?.projectOverview === 'string') setProjectOverview(resultData.projectOverview);
      if (resultData?.v2State && typeof resultData.v2State === 'object') setV2State(resultData.v2State);
      return;
    }

    if (String(intakeState?.mode || '') !== 'ready_for_architecture') {
      const pmMessage = createAgentMessage('pm', buildPmDiscoveryMessage(intakeState));
      const nextMessages = [...newMessages, pmMessage];
      const nextV2State = {
        ...v2State,
        idea: projectIdea,
        intake_state: intakeState,
        planner_meta: {
          ...(v2State?.planner_meta || {}),
          lifecycle_stage: 'requirements_discovery'
        }
      };

      setV2State(nextV2State);
      setMessages(nextMessages);

      const resultData = await saveStateToBackend(
        projectIdea || content,
        [],
        projectId,
        true,
        nextMessages,
        nextV2State
      );
      if (resultData?.projectId) setProjectId(resultData.projectId);
      if (typeof resultData?.projectOverview === 'string') setProjectOverview(resultData.projectOverview);
      if (resultData?.v2State && typeof resultData.v2State === 'object') setV2State(resultData.v2State);
      return;
    }

    const runStartedAt = Date.now();
    const extractingMessage = createAgentMessage('architect', buildInitialProgressMessage(projectIdea));
    const handoffMessage = createAgentMessage('pm', buildPmHandoffMessage(intakeState));
    const initialAgentMessages = [handoffMessage, extractingMessage];
    const appendInitialAgentMessage = (message) => {
      const normalizedMessage = message?.role === 'agent'
        ? {
          ...message,
          agentId: message.agentId || 'architect',
          agentLabel: message.agentLabel || getAgentById(message.agentId || 'architect').label
        }
        : message;
      const withId = {
        ...normalizedMessage,
        _id: normalizedMessage?._id || `init-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      };
      initialAgentMessages.push(withId);
      setMessages((msgs) => [...msgs, withId]);
      return withId._id;
    };
    const patchInitialAgentMessage = (messageId, patch) => {
      setMessages((msgs) => msgs.map((msg) => (msg._id === messageId ? { ...msg, ...patch } : msg)));
      const idx = initialAgentMessages.findIndex((msg) => msg._id === messageId);
      if (idx >= 0) {
        initialAgentMessages[idx] = { ...initialAgentMessages[idx], ...patch };
      }
    };

    setMessages([...newMessages, ...initialAgentMessages]);
    setIsWaiting(false);

    const planMessageId = appendInitialAgentMessage({
      role: 'agent',
      kind: 'thinking',
      status: 'working',
      content: 'Working plan: step 1/2 domain grounding, then step 2/2 discovery + capability graph + decision synthesis + coverage audit + execution projection + artifact manifest.'
    });

    const phaseMessages = {
      grounding: appendInitialAgentMessage({
        role: 'agent',
        kind: 'thinking',
        status: 'working',
        content: 'Grounding in domain knowledge and platform references...'
      }),
      discovery: appendInitialAgentMessage({
        role: 'agent',
        kind: 'thinking',
        status: 'pending',
        content: 'Queued: waiting for domain grounding to complete.'
      }),
      capabilities: appendInitialAgentMessage({
        role: 'agent',
        kind: 'thinking',
        status: 'pending',
        content: 'Queued: waiting for domain grounding to complete.'
      }),
      decisions: appendInitialAgentMessage({
        role: 'agent',
        kind: 'thinking',
        status: 'pending',
        content: 'Queued: waiting for domain grounding to complete.'
      }),
      coverage: appendInitialAgentMessage({
        role: 'agent',
        kind: 'thinking',
        status: 'pending',
        content: 'Queued: waiting for domain grounding to complete.'
      }),
      projection: appendInitialAgentMessage({
        role: 'agent',
        kind: 'thinking',
        status: 'pending',
        content: 'Queued: waiting for domain grounding to complete.'
      })
    };

    const plannerInput = intakeState?.handoff_brief
      ? `${projectIdea}\n\nProject Management Handoff Brief:\n${intakeState.handoff_brief}`
      : projectIdea;
    const groundingStage = await groundPlannerV2(plannerInput, llmConfig);
    const groundingSources = Number(groundingStage?.planner_meta?.sources_used || 0);
    const groundingPrimitives = Array.isArray(groundingStage?.grounding?.domain_primitives)
      ? groundingStage.grounding.domain_primitives.length
      : 0;
    const groundingMode = String(groundingStage?.planner_meta?.grounding_mode || groundingStage?.grounding?.mode || 'model_only');

    patchInitialAgentMessage(phaseMessages.grounding, {
      status: 'completed',
      content: `Completed domain grounding: ${groundingPrimitives} primitives identified${groundingSources > 0 ? ` with ${groundingSources} source citations` : ` (${groundingMode.replace(/_/g, ' ')})`}.`
    });
    patchInitialAgentMessage(planMessageId, {
      status: 'working',
      content: 'Grounding complete. Running downstream passes with grounded context: discovery + capability graph + decision synthesis + coverage audit + execution projection + artifact manifest.'
    });
    patchInitialAgentMessage(phaseMessages.discovery, {
      status: 'working',
      content: 'Translating grounded findings into detected ecosystem and planning lenses...'
    });
    const plan = await generatePlannerV2(
      plannerInput,
      llmConfig,
      groundingStage?.grounding || null,
      groundingStage?.planner_meta || null
    );
    const generatedPillars = Array.isArray(plan?.pillars) ? plan.pillars : [];
    const uncovered = Array.isArray(plan?.planner_meta?.uncovered_items) ? plan.planner_meta.uncovered_items.length : 0;
    const nextV2State = {
      idea: projectIdea,
      intake_state: intakeState,
      domain_discovery: plan?.domain_discovery || null,
      capability_graph: plan?.capability_graph || { nodes: [], edges: [], lenses: [] },
      decision_graph: plan?.decision_graph || { decisions: [], edges: [] },
      execution_projection: plan?.execution_projection || { epics: [], features: [], tasks: [], spikes: [], bugs: [], dependency_map: { nodes: [], edges: [] } },
      artifact_manifest: plan?.artifact_manifest || plan?.artifacts || null,
      planner_meta: {
        ...(plan?.planner_meta || {}),
        lifecycle_stage: 'architecture_active'
      }
    };

    setPillars(generatedPillars);
    setV2State(nextV2State);

    patchInitialAgentMessage(phaseMessages.discovery, {
      status: 'completed',
      content: `Completed domain discovery: ${(plan?.capability_graph?.lenses || []).length || 0} lenses detected.`
    });
    patchInitialAgentMessage(phaseMessages.capabilities, {
      status: 'completed',
      content: `Completed capability graph: ${(plan?.capability_graph?.nodes || []).length || 0} capabilities + ${(plan?.capability_graph?.edges || []).length || 0} relationships.`
    });
    patchInitialAgentMessage(phaseMessages.decisions, {
      status: 'completed',
      content: `Completed decision synthesis: ${(plan?.decision_graph?.decisions || []).length || 0} decisions mapped.`
    });
    patchInitialAgentMessage(phaseMessages.coverage, {
      status: 'completed',
      content: uncovered > 0
        ? `Completed coverage audit: ${uncovered} potential gap${uncovered === 1 ? '' : 's'} surfaced for review.`
        : 'Completed coverage audit: no obvious domain coverage gaps found.'
    });
    patchInitialAgentMessage(phaseMessages.projection, {
      status: 'completed',
      content: `Completed execution projection: ${(plan?.execution_projection?.epics || []).length || 0} epics, ${(plan?.execution_projection?.features || []).length || 0} features, ${(plan?.execution_projection?.tasks || []).length || 0} tasks.`
    });

    patchInitialAgentMessage(planMessageId, {
      status: 'completed',
      content: 'Completed run plan: domain grounding + discovery + capability graph + decision synthesis + coverage audit + execution projection + artifact manifest.'
    });

    const completionMessage = createAgentMessage(
      'architect',
      buildInitialCompletionMessageV2(plan, Date.now() - runStartedAt)
    );
    appendInitialAgentMessage(completionMessage);
    const finalMessages = [...newMessages, ...initialAgentMessages];
    const resultData = await saveStateToBackend(projectIdea, generatedPillars, projectId, true, finalMessages, nextV2State);
    if (resultData?.projectId) setProjectId(resultData.projectId);
    if (typeof resultData?.projectOverview === 'string') setProjectOverview(resultData.projectOverview);
    if (resultData?.v2State && typeof resultData.v2State === 'object') setV2State(resultData.v2State);
  };

  const handleSubsequentTurn = async (newMessages, routedContent = '', preferredAgentId = null) => {
    const latestUserMessage = String(routedContent || newMessages?.[newMessages.length - 1]?.content || '');

    if (preferredAgentId === 'pm') {
      const intakeState = await assessIntakeV2({
        idea: latestUserMessage,
        chatHistory: newMessages,
        priorState: v2State?.intake_state || null,
        hasArchitecture: pillars.length > 0,
        config: llmConfig
      });
      const pmReply = createAgentMessage(
        'pm',
        String(intakeState?.mode || '') === 'ready_for_architecture'
          ? `${buildPmHandoffMessage(intakeState)}\n\nMention @architect to continue architecture synthesis.`
          : buildPmDiscoveryMessage(intakeState)
      );
      const nextMessages = [...newMessages, pmReply];
      const nextV2State = {
        ...v2State,
        intake_state: intakeState,
        planner_meta: {
          ...(v2State?.planner_meta || {}),
          lifecycle_stage: String(intakeState?.mode || '') === 'ready_for_architecture'
            ? 'ready_for_architecture'
            : 'requirements_discovery'
        }
      };
      setV2State(nextV2State);
      setMessages(nextMessages);

      const baseIdea = String(v2State?.idea || '').trim() || latestUserMessage;
      const resultData = await saveStateToBackend(
        baseIdea,
        pillars,
        projectId,
        true,
        nextMessages,
        nextV2State
      );
      if (resultData?.projectId) setProjectId(resultData.projectId);
      if (typeof resultData?.projectOverview === 'string') setProjectOverview(resultData.projectOverview);
      if (resultData?.v2State && typeof resultData.v2State === 'object') setV2State(resultData.v2State);
      return;
    }

    if (shouldReopenDiscovery(latestUserMessage)) {
      const intakeState = await assessIntakeV2({
        idea: latestUserMessage,
        chatHistory: newMessages,
        priorState: v2State?.intake_state || null,
        hasArchitecture: true,
        config: llmConfig
      });
      if (String(intakeState?.mode || '') !== 'ready_for_architecture') {
        const pmMessage = createAgentMessage('pm', buildPmDiscoveryMessage(intakeState));
        const nextMessages = [...newMessages, pmMessage];
        const nextV2State = {
          ...v2State,
          intake_state: intakeState,
          planner_meta: {
            ...(v2State?.planner_meta || {}),
            lifecycle_stage: 'requirements_discovery'
          }
        };
        setV2State(nextV2State);
        setMessages(nextMessages);

        const baseIdea = String(v2State?.idea || '').trim() || latestUserMessage;
        const resultData = await saveStateToBackend(
          baseIdea,
          pillars,
          projectId,
          true,
          nextMessages,
          nextV2State
        );
        if (resultData?.projectId) setProjectId(resultData.projectId);
        if (typeof resultData?.projectOverview === 'string') setProjectOverview(resultData.projectOverview);
        if (resultData?.v2State && typeof resultData.v2State === 'object') setV2State(resultData.v2State);
        return;
      }
    }

    const routedHistory = [...newMessages];
    if (routedHistory.length > 0) {
      routedHistory[routedHistory.length - 1] = {
        ...routedHistory[routedHistory.length - 1],
        content: latestUserMessage
      };
    }

    const result = await processChatTurn(routedHistory, pillars, llmConfig);
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
    let nextV2State = syncV2StateWithPillars(v2State, nextPillars);
    const allConflicts = await detectActiveConflicts(nextPillars, llmConfig, {
      ...nextV2State,
      pillars: nextPillars
    });
    const newlyIntroducedConflicts = allConflicts.filter(
      (conflict) => !priorConflictDescriptions.has(String(conflict.description || '').trim())
    );
    // Rebuild conflict state from scratch each turn so resolved conflicts disappear cleanly.
    nextPillars = clearAllDecisionConflicts(nextPillars);
    allConflicts.forEach(conflict => {
      const ids = Array.isArray(conflict.decisionIds)
        ? conflict.decisionIds
        : (Array.isArray(conflict.decision_ids) ? conflict.decision_ids : []);
      const reason = conflict.description || conflict.reason || '';
      nextPillars = updateNodeDecisions(nextPillars, ids, (d) => {
        const priorReasons = Array.isArray(d.conflict_reasons)
          ? d.conflict_reasons
          : (d.conflict ? [d.conflict] : []);
        const mergedReasons = [...new Set([...priorReasons, reason])];
        return {
          ...d,
          conflict: mergedReasons[0] || reason,
          conflict_reasons: mergedReasons
        };
      });
    });
    nextV2State = syncV2StateWithPillars(nextV2State, nextPillars);
    nextV2State.planner_meta = {
      ...(nextV2State.planner_meta || {}),
      lifecycle_stage: 'architecture_active'
    };

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
    setV2State(nextV2State);
    const responseMessage = createAgentMessage('architect', finalReply, { artifact: result.artifact || null });
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
      const resultData = await saveStateToBackend(
        ideaMsg.content,
        nextPillars,
        projectId,
        true,
        nextMessages,
        nextV2State
      );
      if (resultData?.projectId) setProjectId(resultData.projectId);
      if (typeof resultData?.projectOverview === 'string') setProjectOverview(resultData.projectOverview);
      if (resultData?.v2State && typeof resultData.v2State === 'object') setV2State(resultData.v2State);
    }
  };

  return { handleSendMessage };
}
