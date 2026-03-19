#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { readMarkdownWithFrontmatter, writeMarkdownWithFrontmatter } from './lib/frontmatter.mjs';
import { TASK_KEY_ORDER } from './lib/task-workflow.mjs';
import { loadWorkflowConfig, getWorkflowPath, toAbsolutePath } from './lib/workflow-config.mjs';

const VALID_TARGETS = new Set(['pull_requested', 'completed']);

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--task-id') options.taskId = argv[++i];
    else if (arg === '--to') options.to = argv[++i];
    else if (arg === '--branch') options.branch = argv[++i];
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function printHelp() {
  console.log(`task-status-sync

Usage:
  node scripts/task-status-sync.mjs --to <pull_requested|completed> [--task-id task-###] [--branch task/task-###-slug]

Notes:
  - If --task-id is omitted, the task ID is parsed from --branch.
  - The task file is moved into agent-pack/04-task-system/tasks/<status>/.
`);
}

function parseTaskIdFromBranch(branch) {
  const match = String(branch || '').match(/(task-\d+)/);
  return match ? match[1] : null;
}

function toDateString() {
  return new Date().toISOString().slice(0, 10);
}

function listMarkdownFilesRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listMarkdownFilesRecursive(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') {
      files.push(fullPath);
    }
  }
  return files;
}

function findTaskFilePath(taskId, tasksDir) {
  const files = listMarkdownFilesRecursive(tasksDir);
  const matches = files.filter((filePath) => path.basename(filePath).startsWith(`${taskId}-`));
  if (matches.length === 0) {
    throw new Error(`Task file not found for ${taskId}.`);
  }
  if (matches.length > 1) {
    const prioritized = matches.find((filePath) => filePath.includes(`${path.sep}in_progress${path.sep}`))
      || matches.find((filePath) => !filePath.replace(/\\/g, '/').match(/\/(todo|claimed|in_progress|blocked|claim_expired|pull_requested|completed|complete|cancelled)\//));
    if (prioritized) return prioritized;
    throw new Error(`Multiple task files found for ${taskId}: ${matches.join(', ')}`);
  }
  return matches[0];
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function transitionFrontmatter(frontmatter, targetStatus) {
  const next = { ...frontmatter };
  if (targetStatus === 'pull_requested') {
    next.status = 'pull_requested';
    next.claim_status = 'claimed';
    if (!next.claim_owner || String(next.claim_owner).trim() === '' || String(next.claim_owner).toLowerCase() === 'unassigned') {
      next.claim_owner = next.owner || 'unassigned';
    }
  }

  if (targetStatus === 'completed') {
    next.status = 'completed';
    next.claim_status = 'released';
    next.claim_expires_at = null;
  }

  next.last_updated = toDateString();
  return next;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  if (!VALID_TARGETS.has(options.to)) {
    throw new Error(`--to must be one of: ${[...VALID_TARGETS].join(', ')}`);
  }

  const config = loadWorkflowConfig(process.cwd());
  const tasksRootRel = getWorkflowPath(config, 'tasks_root');
  const tasksDir = toAbsolutePath(process.cwd(), tasksRootRel);

  const taskId = options.taskId || parseTaskIdFromBranch(options.branch);
  if (!taskId) {
    throw new Error('Task ID is required. Pass --task-id task-### or --branch task/task-###-slug.');
  }

  const sourcePath = findTaskFilePath(taskId, tasksDir);
  const { frontmatter, body } = readMarkdownWithFrontmatter(sourcePath);
  const nextFrontmatter = transitionFrontmatter(frontmatter, options.to);
  const destinationDir = path.join(tasksDir, options.to);
  const destinationPath = path.join(destinationDir, path.basename(sourcePath));

  ensureDir(destinationDir);

  if (path.resolve(sourcePath) === path.resolve(destinationPath)) {
    writeMarkdownWithFrontmatter(sourcePath, nextFrontmatter, body, TASK_KEY_ORDER);
    console.log(`Updated ${sourcePath.replace(/\\/g, '/')} -> status=${options.to}`);
    return;
  }

  if (fs.existsSync(destinationPath)) {
    throw new Error(`Destination task file already exists: ${destinationPath}`);
  }

  writeMarkdownWithFrontmatter(sourcePath, nextFrontmatter, body, TASK_KEY_ORDER);
  fs.renameSync(sourcePath, destinationPath);
  console.log(`Moved ${sourcePath.replace(/\\/g, '/')} -> ${destinationPath.replace(/\\/g, '/')} (status=${options.to})`);
}

try {
  main();
} catch (error) {
  console.error(`task-status-sync failed: ${error.message}`);
  process.exit(1);
}
