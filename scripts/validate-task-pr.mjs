#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { loadWorkflowConfig, getWorkflowPath, joinWorkflowPath } from './lib/workflow-config.mjs';

function parseArgs(argv) {
  const options = {
    selfCheck: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--self-check') options.selfCheck = true;
    else if (arg === '--task-id') options.taskId = argv[++i];
    else if (arg === '--branch') options.branch = argv[++i];
    else if (arg === '--changed-files-file') options.changedFilesFile = argv[++i];
    else if (arg === '--base') options.base = argv[++i];
    else if (arg === '--head') options.head = argv[++i];
    else if (arg === '--title') options.title = argv[++i];
    else if (arg === '--body') options.body = argv[++i];
    else if (arg === '--body-file') options.bodyFile = argv[++i];
    else if (arg === '--strict-task-paths') options.strictTaskPaths = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`validate-task-pr

Usage:
  node scripts/validate-task-pr.mjs [options]

Validation behavior:
  Ensures the primary task file exists only in tasks/pull_requested in the current PR head.

Options:
  --self-check
  --task-id <task-###>
  --branch <branch-name>
  --changed-files-file <path>
  --base <git-ref-or-sha>
  --head <git-ref-or-sha>
  --title <ignored, accepted for compatibility>
  --body <ignored, accepted for compatibility>
  --body-file <ignored, accepted for compatibility>
  --strict-task-paths <ignored, accepted for compatibility>
  --help
`);
}

function runGit(args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return result;
}

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/').trim();
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getCurrentBranch() {
  return runGit(['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim();
}

function parseTaskIdFromBranch(branch) {
  const cleaned = String(branch || '').trim();
  const match = cleaned.match(/\b(task-\d+)\b/);
  return match ? match[1] : null;
}

function findTaskFilesForId(files, tasksRoot, taskId) {
  const escapedRoot = escapeRegex(tasksRoot);
  const escapedTaskId = escapeRegex(taskId);
  const taskPattern = new RegExp(`^${escapedRoot}/[^/]+/${escapedTaskId}-.+\\.md$`);
  return files.filter((file) => taskPattern.test(file));
}

function isPullRequestedTaskPath(filePath, tasksRoot, taskId) {
  const escapedRoot = escapeRegex(tasksRoot);
  const escapedTaskId = escapeRegex(taskId);
  const pullRequestedPattern = new RegExp(`^${escapedRoot}/pull_requested/${escapedTaskId}-.+\\.md$`);
  return pullRequestedPattern.test(filePath);
}

function listTrackedTaskFiles(tasksRoot) {
  const result = runGit(['ls-files', '--', tasksRoot], { allowFailure: true });
  return String(result.stdout || '')
    .split(/\r?\n/)
    .map((line) => normalizePath(line))
    .filter(Boolean);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const config = loadWorkflowConfig(process.cwd());
  const tasksRoot = normalizePath(getWorkflowPath(config, 'tasks_root'));
  const primaryTaskId = options.taskId || parseTaskIdFromBranch(options.branch || process.env.PR_BRANCH || process.env.GITHUB_HEAD_REF || getCurrentBranch());

  if (!primaryTaskId) {
    throw new Error('Unable to determine task ID from --task-id or branch name.');
  }

  if (!/^task-\d+$/.test(primaryTaskId)) {
    throw new Error(`Unsupported primary item ID "${primaryTaskId}". This validator accepts only task IDs (task-###).`);
  }

  const trackedTaskFiles = listTrackedTaskFiles(tasksRoot);
  const taskFilesForId = findTaskFilesForId(trackedTaskFiles, tasksRoot, primaryTaskId);
  if (taskFilesForId.length === 0) {
    throw new Error(`No task file found for ${primaryTaskId}.`);
  }

  const nonPullRequestedPaths = taskFilesForId.filter(
    (file) => !isPullRequestedTaskPath(file, tasksRoot, primaryTaskId),
  );
  if (nonPullRequestedPaths.length > 0) {
    throw new Error(
      `${primaryTaskId} task file must only exist in ${joinWorkflowPath(tasksRoot, 'pull_requested')}/. Found invalid path(s): ${nonPullRequestedPaths.join(', ')}`,
    );
  }

  console.log(`Task PR validation passed for ${primaryTaskId}.`);
}

try {
  main();
} catch (error) {
  console.error(`\nvalidate-task-pr failed: ${error.message}`);
  console.error(`::error::${error.message}`);
  process.exit(1);
}
