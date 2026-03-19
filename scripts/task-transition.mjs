#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { readMarkdownWithFrontmatter, writeMarkdownWithFrontmatter } from './lib/frontmatter.mjs';
import {
  TASK_KEY_ORDER,
  STATUS_TRANSITIONS,
  CLAIM_TRANSITIONS,
  collectTaskFilesRecursively,
  getTaskTargetPath,
  parseIsoDate,
} from './lib/task-workflow.mjs';
import { loadWorkflowConfig, getWorkflowPath, toAbsolutePath } from './lib/workflow-config.mjs';

const ALLOWED_TARGETS = new Set(['claimed', 'in_progress', 'done', 'blocked', 'expired', 'cancelled']);

function parseArgs(argv) {
  const options = {
    claimHours: 24,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--task-id') options.taskId = argv[++i];
    else if (arg === '--to') options.to = argv[++i];
    else if (arg === '--owner') options.owner = argv[++i];
    else if (arg === '--claim-hours') options.claimHours = Number.parseInt(argv[++i], 10);
    else if (arg === '--dry-run') options.dryRun = true;
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

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function validateTransition(oldValue, newValue, allowedMap, label) {
  if (!oldValue || !newValue) return null;
  const oldKey = String(oldValue).toLowerCase();
  const newKey = String(newValue).toLowerCase();
  const allowed = allowedMap[oldKey];

  if (!allowed) return `Unknown previous ${label}: ${oldValue}`;
  if (!allowed.has(newKey)) return `Invalid ${label} transition: ${oldValue} -> ${newValue}`;
  return null;
}

function computeClaimExpiry(frontmatter, claimHours) {
  const now = new Date();
  const proposed = new Date(now.getTime() + claimHours * 60 * 60 * 1000);
  const sla = parseIsoDate(frontmatter.sla_due_at);

  if (sla && proposed.getTime() > sla.getTime()) {
    return sla;
  }

  return proposed;
}

function resolveOwner(explicitOwner) {
  return explicitOwner
    || runGit(['config', 'user.name'], { allowFailure: true }).stdout.trim()
    || process.env.USER
    || process.env.USERNAME
    || 'unassigned';
}

function findTaskFile(rootDir, taskId, tasksRootRel) {
  const tasksDir = toAbsolutePath(rootDir, tasksRootRel);
  const files = collectTaskFilesRecursively(tasksDir);
  const matches = files.filter((filePath) => path.basename(filePath).startsWith(`${taskId}-`));

  if (matches.length === 0) {
    throw new Error(`Task file not found for ${taskId}.`);
  }
  if (matches.length > 1) {
    throw new Error(`Multiple task files found for ${taskId}: ${matches.join(', ')}`);
  }

  return { tasksDir, filePath: matches[0] };
}

function applyTargetState(frontmatter, target, owner, claimHours) {
  const updated = { ...frontmatter };
  const currentStatus = String(updated.status || '').toLowerCase();
  const claimExpiry = computeClaimExpiry(frontmatter, claimHours).toISOString();

  switch (target) {
    case 'claimed':
      updated.status = ['backlog', 'todo'].includes(currentStatus) ? currentStatus : 'todo';
      updated.owner = owner;
      updated.claim_owner = owner;
      updated.claim_status = 'claimed';
      updated.claim_expires_at = claimExpiry;
      break;
    case 'in_progress':
      updated.status = 'in_progress';
      updated.owner = owner;
      updated.claim_owner = owner;
      updated.claim_status = 'claimed';
      updated.claim_expires_at = claimExpiry;
      break;
    case 'done':
      updated.status = 'done';
      updated.claim_owner = 'unassigned';
      updated.claim_status = 'released';
      updated.claim_expires_at = null;
      break;
    case 'blocked':
      updated.status = 'blocked';
      if (['unclaimed', 'released', 'expired', ''].includes(String(updated.claim_status || '').toLowerCase())) {
        updated.owner = owner;
        updated.claim_owner = owner;
        updated.claim_status = 'claimed';
        updated.claim_expires_at = claimExpiry;
      }
      break;
    case 'expired':
      updated.status = ['backlog', 'todo'].includes(currentStatus) ? currentStatus : 'todo';
      updated.claim_status = 'expired';
      updated.claim_expires_at = null;
      break;
    case 'cancelled':
      updated.status = 'cancelled';
      updated.claim_owner = 'unassigned';
      updated.claim_status = 'released';
      updated.claim_expires_at = null;
      break;
    default:
      throw new Error(`Unsupported target state: ${target}`);
  }

  updated.last_updated = todayDateString();
  return updated;
}

function printHelp() {
  console.log(`task-transition\n\nUsage:\n  node scripts/task-transition.mjs --task-id task-### --to <state> [options]\n\nOptions:\n  --task-id <task-###>        Required task ID\n  --to <state>                claimed|in_progress|done|blocked|expired|cancelled\n  --owner <name>              Claim owner for claimed/in_progress/blocked transitions\n  --claim-hours <n>           Claim window in hours (default: 24)\n  --dry-run                   Preview changes without writing files\n  --help                      Show this help\n`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (!options.taskId || !/^task-\d+$/.test(String(options.taskId))) {
    throw new Error('--task-id is required and must match task-###.');
  }

  if (!options.to || !ALLOWED_TARGETS.has(String(options.to))) {
    throw new Error(`--to is required and must be one of: ${[...ALLOWED_TARGETS].join(', ')}`);
  }

  if (!Number.isInteger(options.claimHours) || options.claimHours <= 0) {
    throw new Error('--claim-hours must be a positive integer.');
  }

  const rootDir = process.cwd();
  const config = loadWorkflowConfig(rootDir);
  const tasksRootRel = getWorkflowPath(config, 'tasks_root');
  const owner = resolveOwner(options.owner);
  const { tasksDir, filePath } = findTaskFile(rootDir, String(options.taskId), tasksRootRel);
  const { frontmatter, body } = readMarkdownWithFrontmatter(filePath);

  const updated = applyTargetState(frontmatter, String(options.to), owner, options.claimHours);
  const statusError = validateTransition(frontmatter.status, updated.status, STATUS_TRANSITIONS, 'status');
  if (statusError) {
    throw new Error(statusError);
  }

  const claimError = validateTransition(frontmatter.claim_status, updated.claim_status, CLAIM_TRANSITIONS, 'claim_status');
  if (claimError) {
    throw new Error(claimError);
  }

  const targetPath = getTaskTargetPath(tasksDir, filePath, updated);

  if (options.dryRun) {
    console.log('[DRY RUN] task-transition preview');
    console.log(`- Task: ${options.taskId}`);
    console.log(`- From: ${path.relative(rootDir, filePath).replace(/\\\\/g, '/')}`);
    console.log(`- To:   ${path.relative(rootDir, targetPath).replace(/\\\\/g, '/')}`);
    console.log(`- status: ${frontmatter.status} -> ${updated.status}`);
    console.log(`- claim_status: ${frontmatter.claim_status} -> ${updated.claim_status}`);
    console.log(`- claim_owner: ${frontmatter.claim_owner} -> ${updated.claim_owner}`);
    return;
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  writeMarkdownWithFrontmatter(targetPath, updated, body, TASK_KEY_ORDER);

  if (targetPath !== filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  console.log(`task-transition updated ${options.taskId}`);
  console.log(`- Task file: ${path.relative(rootDir, targetPath).replace(/\\\\/g, '/')}`);
  console.log(`- status=${updated.status}, claim_status=${updated.claim_status}`);
}

try {
  main();
} catch (error) {
  console.error(`\ntask-transition failed: ${error.message}`);
  process.exit(1);
}
