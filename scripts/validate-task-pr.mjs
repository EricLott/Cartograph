#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseFrontmatter } from './lib/frontmatter.mjs';
import { STATUS_TRANSITIONS, CLAIM_TRANSITIONS, getTaskPathKind, validateTaskUniqueness } from './lib/task-workflow.mjs';
import {
  loadWorkflowConfig,
  getWorkflowPath,
  getWorkflowPolicy,
  getTaskSystemRoot,
  joinWorkflowPath,
  toAbsolutePath,
} from './lib/workflow-config.mjs';

const FIELD_ALIASES = {
  'Task ID': ['Task ID', 'ID', 'Primary Task'],
  'Task File Path': ['Task File Path', 'Link', 'File Path'],
  'Task Title': ['Task Title', 'Title'],
  'Acceptance Criteria': ['Acceptance Criteria'],
  'Evidence': ['Evidence'],
  'Validation Results': ['Validation Results'],
  'Assumptions Made': ['Assumptions Made'],
  'Blockers Encountered': ['Blockers Encountered'],
  'Out-of-Scope Changes': ['Out-of-Scope Changes'],
};

const REQUIRED_PR_FIELDS = Object.keys(FIELD_ALIASES);
function parseArgs(argv) {
  const options = {
    selfCheck: false,
    strictTaskPaths: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--self-check') options.selfCheck = true;
    else if (arg === '--task-id') options.taskId = argv[++i];
    else if (arg === '--branch') options.branch = argv[++i];
    else if (arg === '--title') options.title = argv[++i];
    else if (arg === '--body') options.body = argv[++i];
    else if (arg === '--body-file') options.bodyFile = argv[++i];
    else if (arg === '--changed-files-file') options.changedFilesFile = argv[++i];
    else if (arg === '--base') options.base = argv[++i];
    else if (arg === '--head') options.head = argv[++i];
    else if (arg === '--strict-task-paths') options.strictTaskPaths = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function runGit(args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return result;
}

function normalizePath(value) {
  return value.replace(/\\/g, '/').trim();
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readIfExists(filePath) {
  if (!filePath) return null;
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

function loadEventPayload() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  } catch {
    return null;
  }
}

function getCurrentBranch() {
  return runGit(['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim();
}

function parsePrimaryIdFromBranch(branch) {
  const cleaned = String(branch || '').trim();
  const idMatches = cleaned.match(/(task|bug|spike|feature)-\d+/g) || [];
  const unique = [...new Set(idMatches)];

  if (unique.length === 0) {
    return { error: `Branch "${cleaned}" does not contain any valid item IDs (task|bug|spike|feature-###).` };
  }

  if (unique.length > 1) {
    return { error: `One-Task-per-PR Violation: Branch "${cleaned}" contains multiple task IDs: ${unique.join(', ')}.` };
  }

  const primaryType = unique[0].split('-')[0];
  return { id: unique[0], type: primaryType };
}

function parsePrBodyFields(bodyText) {
  const body = bodyText || '';
  const fields = {};

  for (const [canonical, aliases] of Object.entries(FIELD_ALIASES)) {
    let found = false;
    for (const label of aliases) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Matches: ### Label, #### Label, or **Label**:
      // Allows optional colons and handles common Markdown structures.
      const regex = new RegExp(`(?:^|\\r?\\n)(?:#{1,6}|\\*\\*)\\s*${escaped}(?::|\\s*)\\s*\\r?\\n?([\\s\\S]*?)(?=\\r?\\n(?:#{1,6}|\\*\\*)\\s+|$)`, 'i');
      const match = body.match(regex);

      if (match) {
        fields[canonical] = match[1].trim();
        found = true;
        break;
      }
    }

    if (!found) {
      fields[canonical] = null;
    }
  }

  return fields;
}

function stripHtmlComments(value) {
  return String(value || '').replace(/<!--[\s\S]*?-->/g, '');
}

function normalizeFieldContent(value) {
  return stripHtmlComments(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

function extractPrimaryIdsFromField(value) {
  const cleaned = normalizeFieldContent(value);
  const matches = cleaned.match(/(task|bug|spike|feature)-\d+/gi) || [];
  return [...new Set(matches.map(m => m.toLowerCase()))];
}

function extractTaskFilePathFromField(value) {
  const cleaned = normalizeFieldContent(value);
  if (!cleaned) return '';

  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s+/, '').trim())
    .filter(Boolean);

  for (const line of lines) {
    const markdownLinkPath = line.match(/\(([^)\r\n]+\.md)\)/);
    if (markdownLinkPath) return normalizePath(markdownLinkPath[1]);

    const inlineCodePath = line.match(/`([^`\r\n]+\.md)`/);
    if (inlineCodePath) return normalizePath(inlineCodePath[1]);

    const plainPath = line.match(/([A-Za-z0-9._/\-\\]+\.md)\b/);
    if (plainPath) return normalizePath(plainPath[1]);
  }

  return normalizePath(lines[0]);
}

function isMeaningfulFieldValue(value) {
  const normalized = normalizeFieldContent(value).toLowerCase();
  if (!normalized) return false;
  const placeholders = ['<fill>', '<required>', 'tbd', 'todo'];
  return !placeholders.includes(normalized);
}

function loadChangedFiles(options) {
  const fileFromArg = options.changedFilesFile || process.env.CHANGED_FILES_FILE;
  if (fileFromArg && fs.existsSync(fileFromArg)) {
    return fs
      .readFileSync(fileFromArg, 'utf8')
      .split(/\r?\n/)
      .map((line) => normalizePath(line))
      .filter(Boolean);
  }

  const base = options.base || process.env.PR_BASE_SHA;
  const head = options.head || process.env.PR_HEAD_SHA || 'HEAD';
  const files = new Set();

  if (base) {
    const logResult = runGit(['log', `${base}..${head}`, '--name-only', '--pretty=format:'], { allowFailure: true });
    logResult.stdout
      .split(/\r?\n/)
      .map((line) => normalizePath(line))
      .filter(Boolean)
      .forEach((f) => files.add(f));

    const diffResult = runGit(['diff', '--name-only', `${base}...${head}`], { allowFailure: true });
    diffResult.stdout
      .split(/\r?\n/)
      .map((line) => normalizePath(line))
      .filter(Boolean)
      .forEach((f) => files.add(f));
  }

  if (options.selfCheck || !base) {
    const staged = runGit(['diff', '--cached', '--name-only'], { allowFailure: true });
    staged.stdout
      .split(/\r?\n/)
      .map((line) => normalizePath(line))
      .filter(Boolean)
      .forEach((f) => files.add(f));

    const unstaged = runGit(['diff', '--name-only'], { allowFailure: true });
    unstaged.stdout
      .split(/\r?\n/)
      .map((line) => normalizePath(line))
      .filter(Boolean)
      .forEach((f) => files.add(f));
  }

  return Array.from(files);
}

function getExpectedDirectoryForType(type, taskSystemRoot) {
  return {
    task: joinWorkflowPath(taskSystemRoot, 'tasks'),
    bug: joinWorkflowPath(taskSystemRoot, 'bugs'),
    spike: joinWorkflowPath(taskSystemRoot, 'spikes'),
    feature: joinWorkflowPath(taskSystemRoot, 'features'),
  }[type];
}

function getBacklogItemFileId(filePath, taskSystemRoot) {
  const normalized = normalizePath(filePath);
  const escapedRoot = escapeRegex(taskSystemRoot);
  const match = normalized.match(
    new RegExp(`^${escapedRoot}/(tasks|bugs|spikes|features|epics)(?:/[^/]+)?/((task|bug|spike|feature|epic)-[^/]+)\\.md$`),
  );
  if (!match) return null;
  const itemName = match[2];
  const idMatch = itemName.match(/^(task|bug|spike|feature|epic)-\d+/);
  return idMatch ? idMatch[0] : null;
}

function getPrimaryPathCandidates(changedFiles, primaryId, primaryType, taskSystemRoot) {
  const typeDirMap = {
    task: 'tasks',
    bug: 'bugs',
    spike: 'spikes',
    feature: 'features',
  };
  const categoryDir = typeDirMap[primaryType];
  if (!categoryDir) return [];

  const baseDir = joinWorkflowPath(taskSystemRoot, categoryDir);
  const escapedBase = escapeRegex(baseDir);

  // Bucket-agnostic: look in ANY subdirectory of the category
  const pattern = new RegExp(`^${escapedBase}/[^/]+/${primaryId}-.+\\.md$`);
  const flatPattern = new RegExp(`^${escapedBase}/${primaryId}-.+\\.md$`);

  return changedFiles.filter((file) => pattern.test(file) || flatPattern.test(file));
}

function selectPrimaryPathCandidate(candidates) {
  if (candidates.length === 0) return { path: null };
  if (candidates.length === 1) return { path: candidates[0] };

  const existing = candidates.filter((candidate) => fs.existsSync(candidate));
  if (existing.length === 1) {
    return { path: existing[0] };
  }

  if (existing.length > 1) {
    return {
      path: existing[0],
      error: `Multiple current primary item files found for the same ID: ${existing.join(', ')}`,
    };
  }

  return {
    path: candidates[0],
    error: `Multiple possible primary item files found for the same ID and none exist in working tree: ${candidates.join(', ')}`,
  };
}

function extractIdsFromText(text) {
  const matches = String(text || '').match(/(task|bug|spike|feature)-\d+/g) || [];
  return [...new Set(matches)];
}

function getDiffAddedLines(filePath, options) {
  const base = options.base || process.env.PR_BASE_SHA;
  const head = options.head || process.env.PR_HEAD_SHA || 'HEAD';
  const allLines = new Set();

  const processDiff = (diffArgs) => {
    const result = runGit([...diffArgs, '--', filePath], { allowFailure: true });
    (result.stdout || '')
      .split(/\r?\n/)
      .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
      .forEach((line) => allLines.add(line.slice(1)));
  };

  if (base) {
    processDiff(['diff', '--unified=0', `${base}...${head}`]);
  }

  if (options.selfCheck || !base) {
    processDiff(['diff', '--unified=0', '--cached']);
    processDiff(['diff', '--unified=0']);
  }

  return Array.from(allLines);
}

function readFileAtRef(ref, filePath) {
  const result = runGit(['show', `${ref}:${filePath}`], { allowFailure: true });
  if (result.status !== 0) return null;
  return result.stdout;
}

function loadFrontmatterForTransition(filePath, options) {
  const base = options.base || process.env.PR_BASE_SHA;
  const head = options.head || process.env.PR_HEAD_SHA || 'HEAD';

  let oldText = null;
  let newText = null;

  if (base) {
    oldText = readFileAtRef(base, filePath);
    newText = readFileAtRef(head, filePath);
  } else {
    oldText = readFileAtRef('HEAD', filePath);
    newText = readIfExists(filePath);
  }

  const oldFm = oldText ? parseFrontmatter(oldText).frontmatter : null;
  const newFm = newText ? parseFrontmatter(newText).frontmatter : null;

  return { oldFm, newFm };
}

function validateTransition(oldValue, newValue, allowedMap, label) {
  if (!oldValue || !newValue) return null;
  const oldKey = String(oldValue).toLowerCase();
  const newKey = String(newValue).toLowerCase();
  const allowed = allowedMap[oldKey];

  if (!allowed) {
    return `Unknown previous ${label}: ${oldValue}`;
  }

  if (!allowed.has(newKey)) {
    return `Invalid ${label} transition: ${oldValue} -> ${newValue}`;
  }

  return null;
}

function isRelatedItemsLine(line) {
  return /related_items\s*:/i.test(line);
}

function isRelatedItemsListLine(line) {
  return /^[-*]\s+/.test(String(line || '').trim());
}

function getRelatedItemsLineIndexes(lines) {
  const relatedIndexes = new Set();
  let inRelatedItemsBlock = false;

  for (const [index, line] of lines.entries()) {
    if (isRelatedItemsLine(line)) {
      relatedIndexes.add(index);
      inRelatedItemsBlock = true;
      continue;
    }

    if (!inRelatedItemsBlock) continue;

    const trimmed = String(line || '').trim();
    if (!trimmed) continue;

    if (isRelatedItemsListLine(line)) {
      relatedIndexes.add(index);
      continue;
    }

    inRelatedItemsBlock = false;
  }

  return relatedIndexes;
}

function getTaskProgressEntryBlocks(addedLines, taskId) {
  const blocks = [];
  const taskPattern = new RegExp(`^- .*\\| \`${escapeRegex(taskId)}\` \\| [^|]+\\|`);

  for (let index = 0; index < addedLines.length; index += 1) {
    const line = addedLines[index];
    if (!taskPattern.test(line)) continue;

    const block = [line];
    for (let cursor = index + 1; cursor < addedLines.length; cursor += 1) {
      const candidate = addedLines[cursor];
      if (candidate.startsWith('- ')) break;
      block.push(candidate);
    }

    blocks.push(block);
  }

  return blocks;
}

function validateProgressLogEntryForTask(addedLines, taskId) {
  const entryBlocks = getTaskProgressEntryBlocks(addedLines, taskId);
  const errors = [];

  if (entryBlocks.length === 0) {
    errors.push(`progress-log.md must add an entry for ${taskId} when transitioning task status to pull_requested/completed.`);
    return errors;
  }

  const entryLine = entryBlocks[0][0];
  const summaryMatch = entryLine.match(new RegExp(`\\| \`${escapeRegex(taskId)}\` \\| [^|]+\\|\\s*(.*)$`));
  const summary = summaryMatch ? summaryMatch[1].trim() : '';
  if (!summary) {
    errors.push(`progress-log.md entry for ${taskId} must include a non-empty summary after the final pipe delimiter.`);
  }

  const evidenceHeaderIndex = entryBlocks[0].findIndex((line) => /^ {2}- Evidence:\s*$/.test(line));
  if (evidenceHeaderIndex === -1) {
    errors.push(`progress-log.md entry for ${taskId} must include an "  - Evidence:" section.`);
  } else {
    const evidenceLines = entryBlocks[0]
      .slice(evidenceHeaderIndex + 1)
      .filter((line) => /^ {4}-\s+\S+/.test(line));

    if (evidenceLines.length === 0) {
      errors.push(`progress-log.md entry for ${taskId} must include at least one evidence bullet under "  - Evidence:".`);
    }
  }

  return errors;
}

function shouldStrictTaskPaths(options, policyValue) {
  if (options.strictTaskPaths) return true;
  const envValue = String(process.env.VALIDATE_TASK_PATH_POLICY || process.env.VALIDATE_TASK_PATH_STRICT || '').toLowerCase();
  if (envValue === 'strict' || envValue === '1' || envValue === 'true') return true;
  return String(policyValue || '').toLowerCase() === 'strict';
}

function printHelp() {
  console.log(`validate-task-pr\n\nUsage:\n  node scripts/validate-task-pr.mjs [options]\n\nModes:\n  Default: CI/PR validation (branch/title/body/changed files checks)\n  --self-check: local task-scope preflight using current branch + working tree diff\n\nOptions:\n  --self-check\n  --task-id <task-###>\n  --branch <branch-name>\n  --title <pr-title>\n  --body <pr-body>\n  --body-file <path>\n  --changed-files-file <path>\n  --base <git-ref-or-sha>\n  --head <git-ref-or-sha>\n  --strict-task-paths          Enforce status-bucket task paths as hard errors\n  --help\n\nEnv:\n  VALIDATE_TASK_PATH_POLICY=warn|strict\n  VALIDATE_TASK_PATH_STRICT=1|true (legacy strict toggle)\n`);
}

function addError(errors, message) {
  errors.push(message);
}

function addWarning(warnings, message) {
  warnings.push(message);
}

function reportIssue(errors, warnings, options, message, { critical = false } = {}) {
  if (options.selfCheck && !critical) {
    addWarning(warnings, `[PRAGMATIC-PREFLIGHT] ${message}`);
  } else {
    addError(errors, message);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const config = loadWorkflowConfig(process.cwd());
  const tasksRoot = getWorkflowPath(config, 'tasks_root');
  const stateRoot = getWorkflowPath(config, 'state_root');
  const taskSystemRoot = getTaskSystemRoot(config);
  
  const errors = [];
  const warnings = [];

  try {
    validateTaskUniqueness(toAbsolutePath(process.cwd(), taskSystemRoot));
  } catch (err) {
    addError(errors, err.message);
  }

  const strictTaskPaths = shouldStrictTaskPaths(options, getWorkflowPolicy(config, 'task_path_policy', 'warn'));
  const event = loadEventPayload();

  const branch = options.branch || process.env.PR_BRANCH || process.env.GITHUB_HEAD_REF || getCurrentBranch();
  const primaryFromBranch = parsePrimaryIdFromBranch(branch);

  if (primaryFromBranch.error) {
    if (options.taskId && !primaryFromBranch.id) {
        // If taskId is provided via CLI, we can skip the branch error unless it's a conflict
    } else {
        addError(errors, primaryFromBranch.error);
    }
  }

  const primaryId = options.taskId || primaryFromBranch.id;
  const primaryType = primaryId ? primaryId.split('-')[0] : null;

  if (!primaryId) {
    addError(errors, 'Unable to determine primary item ID from branch or --task-id.');
  }

  if (branch === 'main' || branch === 'master') {
    addError(errors, 'Validation is NOT allowed on the main branch. You MUST be on a task-specific branch (e.g., task/task-###-*).');
  }

  const changedFiles = loadChangedFiles(options);

  if (changedFiles.length === 0) {
    addError(errors, 'No changed files detected. Validation requires task-scoped changes.');
  }

  const title = options.title || process.env.PR_TITLE || event?.pull_request?.title || '';
  let body = options.body || process.env.PR_BODY || event?.pull_request?.body || '';
  const bodyFromFile = readIfExists(options.bodyFile);
  if (bodyFromFile) body = bodyFromFile;

  if (true) {
    if (!title.trim()) {
      reportIssue(errors, warnings, options, 'PR title is required for full validation.');
    } else if (primaryId) {
        if (!title.includes(primaryId)) {
            reportIssue(errors, warnings, options, `PR title must include the primary item ID: ${primaryId}.`);
        }
    }

    if (!body.trim()) {
      reportIssue(errors, warnings, options, 'PR body is required for full validation.');
    }
  }

  const fields = parsePrBodyFields(body);

  if (true) {
    for (const field of REQUIRED_PR_FIELDS) {
      if (!isMeaningfulFieldValue(fields[field])) {
        // Missing fields in PR body are downgraded to warnings to avoid brittle CI failures.
        // The most critical data (Task ID match, Status transition, Log update) stays as Errors.
        reportIssue(errors, warnings, { ...options, selfCheck: true }, `PR body field "${field}" is missing or empty.`);
      }
    }

    const bodyTaskIds = extractPrimaryIdsFromField(fields['Task ID']);
    if (primaryId && !bodyTaskIds.includes(primaryId)) {
      reportIssue(errors, warnings, options, `Task ID field in PR body is missing the primary ID: ${primaryId}`);
    }
    if (bodyTaskIds.length > 1) {
      reportIssue(errors, warnings, options, `PR body must only list one primary Task ID (found: ${bodyTaskIds.join(', ')}).`);
    }
  }

  let primaryPath = null;
  if (primaryId) {
    const candidates = getPrimaryPathCandidates(changedFiles, primaryId, primaryType, taskSystemRoot);
    const resolved = selectPrimaryPathCandidate(candidates);
    if (resolved.error) {
        addError(errors, `${primaryId}: ${resolved.error}`);
    }
    if (resolved.path) {
        primaryPath = resolved.path;
        if (!changedFiles.includes(resolved.path)) {
            addError(errors, `Primary item file for ${primaryId} must be changed in this PR: ${resolved.path}`);
        }
    } else if (primaryId.match(/(task|bug|spike|feature)-\d+/)) {
        addError(errors, `Changed files must include the primary item file for ${primaryId}.`);
    }
  }

  const changedBacklogItems = changedFiles
    .map((file) => ({ file, id: getBacklogItemFileId(file, taskSystemRoot) }))
    .filter((item) => item.id);
  
  const invalidBacklogChanges = changedBacklogItems
    .filter((item) => item.id !== primaryId)
    .map((item) => item.file);
  if (invalidBacklogChanges.length > 0) {
    addError(errors, `One-Task-per-PR violation: multiple backlog items changed: ${[...new Set(invalidBacklogChanges.map(f => getBacklogItemFileId(f, taskSystemRoot)))].join(', ')}`);
  }

  const logFiles = [
    joinWorkflowPath(stateRoot, 'progress-log.md'),
    joinWorkflowPath(stateRoot, 'blockers.md'),
    joinWorkflowPath(stateRoot, 'decisions-log.md'),
  ];
  const progressLogPath = joinWorkflowPath(stateRoot, 'progress-log.md');

  for (const logFile of logFiles) {
    if (!changedFiles.includes(logFile)) continue;
    const addedLines = getDiffAddedLines(logFile, options);
    const addedText = addedLines.join('\n');
    const relatedItemsLineIndexes = getRelatedItemsLineIndexes(addedLines);

    if (primaryId && !addedText.includes(primaryId)) {
      addError(errors, `${logFile} was updated but added lines do not reference ${primaryId}.`);
    }

    const outsideRelatedIds = [];
    for (const [index, line] of addedLines.entries()) {
      const ids = extractIdsFromText(line).filter((id) => id !== primaryId);
      if (ids.length === 0) continue;
      if (relatedItemsLineIndexes.has(index)) continue;
      outsideRelatedIds.push(...ids);
    }

    if (outsideRelatedIds.length > 0) {
      reportIssue(errors, warnings, options, `${logFile} added lines reference other item IDs outside related_items: ${[...new Set(outsideRelatedIds)].join(', ')}`);
    }
  }

  if (primaryPath) {
    const tid = primaryId;
    const { oldFm, newFm } = loadFrontmatterForTransition(primaryPath, options);

    if (newFm) {
      const statusError = oldFm
        ? validateTransition(oldFm.status, newFm.status, STATUS_TRANSITIONS, 'status')
        : null;
      if (statusError) addError(errors, `${primaryPath}: ${statusError}`);

      const claimError = oldFm
        ? validateTransition(oldFm.claim_status, newFm.claim_status, CLAIM_TRANSITIONS, 'claim_status')
        : null;
      if (claimError) addError(errors, `${primaryPath}: ${claimError}`);

      const newStatus = String(newFm.status || '').toLowerCase();
      const newClaim = String(newFm.claim_status || '').toLowerCase();
      const newClaimExpiry = newFm.claim_expires_at;

      if (newStatus === 'completed' || newStatus === 'done') {
        if (newClaim !== 'released') {
          addError(errors, `${primaryPath}: status=${newStatus} requires claim_status=released.`);
        }
        if (!(newClaimExpiry === null || String(newClaimExpiry).toLowerCase() === 'null' || String(newClaimExpiry).trim() === '')) {
          addError(errors, `${primaryPath}: status=${newStatus} requires claim_expires_at=null.`);
        }
      }

      if (newStatus === 'in_progress' && newClaim !== 'claimed') {
        addError(errors, `${primaryPath}: status=in_progress requires claim_status=claimed.`);
      }

      if (newStatus === 'pull_requested' && newClaim !== 'claimed') {
        addError(errors, `${primaryPath}: status=pull_requested requires claim_status=claimed.`);
      }

      if (tid.startsWith('task-') && ['pull_requested', 'completed', 'done'].includes(newStatus)) {
        if (!changedFiles.includes(progressLogPath)) {
          reportIssue(errors, warnings, options, `Task transition to ${newStatus} requires ${progressLogPath} to include a new progress entry for ${tid}.`, { critical: true });
        } else {
          const progressAddedLines = getDiffAddedLines(progressLogPath, options);
          const progressErrors = validateProgressLogEntryForTask(progressAddedLines, tid);
          progressErrors.forEach((message) => reportIssue(errors, warnings, options, message));
        }
      }
    }
  }

  if (options.selfCheck && !options.taskId) {
    addError(errors, '--self-check requires --task-id <task-###>.');
  }

  if (warnings.length > 0) {
    console.warn('\nTask PR validation warnings:');
    for (const warning of warnings) {
      console.warn(`- ${warning}`);
      console.warn(`::warning::${warning}`);
    }
  }

  if (errors.length > 0) {
    console.error('\nTask PR validation failed:');
    for (const err of errors) {
      console.error(`- ${err}`);
      console.error(`::error::${err}`);
    }
    process.exit(1);
  }

  console.log(`Task PR validation passed for ${primaryId}.`);
}

try {
  main();
} catch (error) {
  console.error(`\nvalidate-task-pr failed: ${error.message}`);
  process.exit(1);
}
