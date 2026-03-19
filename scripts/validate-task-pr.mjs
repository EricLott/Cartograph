#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseFrontmatter } from './lib/frontmatter.mjs';
import { STATUS_TRANSITIONS, CLAIM_TRANSITIONS, getTaskPathKind } from './lib/task-workflow.mjs';
import {
  loadWorkflowConfig,
  getWorkflowPath,
  getWorkflowPolicy,
  getTaskSystemRoot,
  joinWorkflowPath,
} from './lib/workflow-config.mjs';

const REQUIRED_PR_FIELDS = [
  'Task ID',
  'Task File Path',
  'Task Title',
  'Acceptance Criteria',
  'Evidence',
  'Validation Results',
  'Assumptions Made',
  'Blockers Encountered',
  'Out-of-Scope Changes',
];
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

function parsePrimaryFromBranch(branch) {
  const cleaned = String(branch || '').trim();
  const fullPattern = /^(task|bug|spike|feature)\/((task|bug|spike|feature)-\d+)(-[a-z0-9-]+)?$/;
  const match = cleaned.match(fullPattern);

  if (!match) {
    return { error: `Branch "${cleaned}" does not match required pattern: <type>/<type-###>(-slug)` };
  }

  const [, prefixType, itemId, idType] = match;
  if (prefixType !== idType) {
    return { error: `Branch type (${prefixType}) must match item ID type (${idType}).` };
  }

  const idMatches = cleaned.match(/(task|bug|spike|feature)-\d+/g) || [];
  const unique = [...new Set(idMatches)];
  if (unique.length !== 1) {
    return { error: `Branch must contain exactly one primary item ID. Found: ${unique.join(', ') || 'none'}` };
  }

  return { id: itemId, type: prefixType };
}

function parsePrBodyFields(bodyText) {
  const body = bodyText || '';
  const fields = {};

  for (const label of REQUIRED_PR_FIELDS) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`###\\s+${escaped}\\s*\\r?\\n([\\s\\S]*?)(?=\\r?\\n###\\s+|$)`, 'i');
    const match = body.match(regex);

    if (!match) {
      fields[label] = null;
      continue;
    }

    fields[label] = match[1].trim();
  }

  return fields;
}

function isMeaningfulFieldValue(value) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
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

  if (base) {
    const result = runGit(['diff', '--name-only', `${base}...${head}`]);
    return result.stdout
      .split(/\r?\n/)
      .map((line) => normalizePath(line))
      .filter(Boolean);
  }

  const result = runGit(['diff', '--name-only']);
  return result.stdout
    .split(/\r?\n/)
    .map((line) => normalizePath(line))
    .filter(Boolean);
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
  const expectedDir = getExpectedDirectoryForType(primaryType, taskSystemRoot);
  if (!expectedDir) return [];
  const escapedExpected = escapeRegex(expectedDir);
  const nestedPattern = new RegExp(`^${escapedExpected}/[^/]+/${primaryId}-.+\\.md$`);
  const flatPattern = new RegExp(`^${escapedExpected}/${primaryId}-.+\\.md$`);
  return changedFiles.filter((file) => nestedPattern.test(file) || flatPattern.test(file));
}

function extractIdsFromText(text) {
  const matches = String(text || '').match(/(task|bug|spike|feature)-\d+/g) || [];
  return [...new Set(matches)];
}

function getDiffAddedLines(filePath, options) {
  const base = options.base || process.env.PR_BASE_SHA;
  const head = options.head || process.env.PR_HEAD_SHA || 'HEAD';

  let result;
  if (base) {
    result = runGit(['diff', '--unified=0', `${base}...${head}`, '--', filePath], { allowFailure: true });
  } else {
    result = runGit(['diff', '--unified=0', '--', filePath], { allowFailure: true });
  }

  const lines = (result.stdout || '')
    .split(/\r?\n/)
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1));

  return lines;
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
  const strictTaskPaths = shouldStrictTaskPaths(options, getWorkflowPolicy(config, 'task_path_policy', 'warn'));

  const errors = [];
  const warnings = [];
  const event = loadEventPayload();

  const branch = options.branch || process.env.PR_BRANCH || process.env.GITHUB_HEAD_REF || getCurrentBranch();
  const primaryFromBranch = parsePrimaryFromBranch(branch);

  if (primaryFromBranch.error) {
    addError(errors, primaryFromBranch.error);
  }

  const primaryId = options.taskId || primaryFromBranch.id;
  const primaryType = primaryFromBranch.type || (options.taskId ? options.taskId.split('-')[0] : null);

  if (!primaryId) {
    addError(errors, 'Unable to determine primary item ID from branch or --task-id.');
  }

  const changedFiles = loadChangedFiles(options);

  if (changedFiles.length === 0) {
    addError(errors, 'No changed files detected. Validation requires task-scoped changes.');
  }

  const title = options.title || process.env.PR_TITLE || event?.pull_request?.title || '';
  let body = options.body || process.env.PR_BODY || event?.pull_request?.body || '';
  const bodyFromFile = readIfExists(options.bodyFile);
  if (bodyFromFile) body = bodyFromFile;

  if (!options.selfCheck) {
    if (!title.trim()) {
      addError(errors, 'PR title is required for full validation.');
    } else if (!title.includes(primaryId)) {
      addError(errors, `PR title must include primary item ID ${primaryId}.`);
    }

    if (!body.trim()) {
      addError(errors, 'PR body is required for full validation.');
    }
  }

  const fields = !options.selfCheck ? parsePrBodyFields(body) : {};

  if (!options.selfCheck) {
    for (const field of REQUIRED_PR_FIELDS) {
      if (!isMeaningfulFieldValue(fields[field])) {
        addError(errors, `PR body field "${field}" is missing or empty.`);
      }
    }

    const bodyTaskId = fields['Task ID']?.split(/\s+/)[0]?.trim();
    if (bodyTaskId && bodyTaskId !== primaryId) {
      addError(errors, `Task ID in PR body (${bodyTaskId}) does not match branch ID (${primaryId}).`);
    }
  }

  const expectedDir = primaryType ? getExpectedDirectoryForType(primaryType, taskSystemRoot) : null;
  if (!expectedDir) {
    addError(errors, `Unsupported primary item type for validation: ${primaryType || 'unknown'}.`);
  }

  let primaryPath = null;

  if (!options.selfCheck) {
    const taskFileField = normalizePath(fields['Task File Path'] || '');
    if (taskFileField) {
      primaryPath = taskFileField;
      const escapedExpected = escapeRegex(expectedDir);
      const isValidTaskPath = new RegExp(`^${escapedExpected}/[^/]+/${primaryId}-.+\\.md$`).test(taskFileField)
        || new RegExp(`^${escapedExpected}/${primaryId}-.+\\.md$`).test(taskFileField);

      if (!isValidTaskPath) {
        const expectedPattern = `${expectedDir}/<status>/${primaryId}-*.md`;
        addError(errors, `Task File Path must point to ${expectedPattern}`);
      }
    }
  }

  const candidates = getPrimaryPathCandidates(changedFiles, primaryId, primaryType || 'task', taskSystemRoot);

  if (!primaryPath) {
    if (candidates.length === 1) {
      primaryPath = candidates[0];
    } else if (candidates.length === 0) {
      addError(errors, `Changed files must include the primary item file for ${primaryId}.`);
    } else {
      addError(errors, `Multiple possible primary item files found for ${primaryId}: ${candidates.join(', ')}`);
      primaryPath = candidates[0];
    }
  }

  if (primaryPath && !changedFiles.includes(primaryPath)) {
    addError(errors, `Primary item file must be changed in this PR: ${primaryPath}`);
  }

  if (primaryType === 'task' && primaryPath) {
    const kind = getTaskPathKind(primaryPath, tasksRoot);
    if (kind.flat) {
      const message = `Primary task path is legacy flat layout: ${primaryPath}. Migrate to ${tasksRoot}/<status>/...`;
      if (strictTaskPaths) addError(errors, message);
      else addWarning(warnings, message);
    }
  }

  const changedBacklogItemFiles = changedFiles.filter((file) => getBacklogItemFileId(file, taskSystemRoot));
  const invalidBacklogChanges = changedBacklogItemFiles.filter((file) => file !== primaryPath);
  if (invalidBacklogChanges.length > 0) {
    addError(errors, `Strict mode violation: other backlog item files changed: ${invalidBacklogChanges.join(', ')}`);
  }

  const multiItemIds = [...new Set(changedBacklogItemFiles.map((file) => getBacklogItemFileId(file, taskSystemRoot)).filter(Boolean))]
    .filter((id) => id !== primaryId);
  if (multiItemIds.length > 0) {
    addError(errors, `PR spans multiple primary items: ${multiItemIds.join(', ')}`);
  }

  const logFiles = [
    joinWorkflowPath(stateRoot, 'progress-log.md'),
    joinWorkflowPath(stateRoot, 'blockers.md'),
    joinWorkflowPath(stateRoot, 'decisions-log.md'),
  ];

  for (const logFile of logFiles) {
    if (!changedFiles.includes(logFile)) continue;
    const addedLines = getDiffAddedLines(logFile, options);
    const addedText = addedLines.join('\n');

    if (!addedText.includes(primaryId)) {
      addError(errors, `${logFile} was updated but added lines do not reference ${primaryId}.`);
    }

    const outsideRelatedIds = [];
    for (const line of addedLines) {
      const ids = extractIdsFromText(line).filter((id) => id !== primaryId);
      if (ids.length === 0) continue;
      if (isRelatedItemsLine(line)) continue;
      outsideRelatedIds.push(...ids);
    }

    if (outsideRelatedIds.length > 0) {
      addError(errors, `${logFile} added lines reference other primary IDs outside related_items: ${[...new Set(outsideRelatedIds)].join(', ')}`);
    }
  }

  if (primaryPath) {
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
