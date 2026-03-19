#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { readMarkdownWithFrontmatter, writeMarkdownWithFrontmatter } from './lib/frontmatter.mjs';
import {
  TASK_KEY_ORDER,
  collectTaskFilesRecursively,
  getTaskTargetPath,
  parseIsoDate,
} from './lib/task-workflow.mjs';
import {
  loadWorkflowConfig,
  getWorkflowPath,
  joinWorkflowPath,
  toAbsolutePath,
} from './lib/workflow-config.mjs';

const PRIORITY_ORDER = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

function parseArgs(argv) {
  const options = {
    claimHours: 24,
    dryRun: false,
    allowDirty: false,
    auto: false,
    resume: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--task') {
      options.taskId = argv[++i];
    } else if (arg === '--owner') {
      options.owner = argv[++i];
    } else if (arg === '--claim-hours') {
      options.claimHours = Number.parseInt(argv[++i], 10);
    } else if (arg === '--launch-cmd') {
      options.launchCmd = argv[++i];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--allow-dirty') {
      options.allowDirty = true;
    } else if (arg === '--auto') {
      options.auto = true;
    } else if (arg === '--resume') {
      options.resume = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
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

function assertRepoStructure(rootDir, config) {
  const agentPackRoot = getWorkflowPath(config, 'agent_pack_root');
  const tasksRoot = getWorkflowPath(config, 'tasks_root');
  const stateRoot = getWorkflowPath(config, 'state_root');

  const required = [
    'AGENTS.md',
    joinWorkflowPath(agentPackRoot, '03-agent-ops', 'AGENTS.md'),
    joinWorkflowPath(agentPackRoot, '04-task-system', 'README.md'),
    joinWorkflowPath(tasksRoot, 'README.md'),
    joinWorkflowPath(stateRoot, 'progress-log.md'),
  ];

  const missing = required.filter((rel) => !fs.existsSync(toAbsolutePath(rootDir, rel)));
  if (missing.length > 0) {
    throw new Error(`Required workflow files are missing:\n- ${missing.join('\n- ')}`);
  }
}

function slugify(text, maxLength = 48) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function loadTasks(rootDir, tasksRootRel) {
  const tasksDir = toAbsolutePath(rootDir, tasksRootRel);
  const files = collectTaskFilesRecursively(tasksDir);

  const tasks = files.map((filePath) => {
    const { frontmatter, body } = readMarkdownWithFrontmatter(filePath);
    if (!frontmatter.id || !frontmatter.title || !frontmatter.status) {
      throw new Error(`Task file is missing required metadata: ${filePath}`);
    }
    return {
      filePath,
      relativePath: path.relative(rootDir, filePath).replace(/\\/g, '/'),
      frontmatter,
      body,
    };
  });

  return tasks.sort((a, b) => a.frontmatter.id.localeCompare(b.frontmatter.id));
}

function isDependencySatisfied(taskMap, dependencyId) {
  if (!dependencyId.startsWith('task-')) return true;
  const dependencyTask = taskMap.get(dependencyId);
  if (!dependencyTask) return false;
  return dependencyTask.frontmatter.status === 'done';
}

function getEligibility(task, taskMap) {
  const status = String(task.frontmatter.status || '').toLowerCase();
  const claimStatus = String(task.frontmatter.claim_status || '').toLowerCase();
  const dependsOn = Array.isArray(task.frontmatter.depends_on) ? task.frontmatter.depends_on : [];

  const errors = [];

  if (!['todo', 'backlog'].includes(status)) {
    errors.push(`status must be todo/backlog (current: ${task.frontmatter.status ?? 'unset'})`);
  }

  if (!['unclaimed', 'expired'].includes(claimStatus)) {
    errors.push(`claim_status must be unclaimed/expired (current: ${task.frontmatter.claim_status ?? 'unset'})`);
  }

  const unresolvedDeps = dependsOn.filter((dep) => !isDependencySatisfied(taskMap, String(dep)));
  if (unresolvedDeps.length > 0) {
    errors.push(`dependencies not done: ${unresolvedDeps.join(', ')}`);
  }

  return {
    eligible: errors.length === 0,
    reasons: errors,
  };
}

function getDependencyDepth(task, taskMap, seen = new Set()) {
  const dependsOn = Array.isArray(task.frontmatter.depends_on) ? task.frontmatter.depends_on : [];
  const taskId = String(task.frontmatter.id || '');

  if (seen.has(taskId) || dependsOn.length === 0) return 0;

  const nextSeen = new Set(seen);
  nextSeen.add(taskId);

  let maxDepth = 0;
  for (const dep of dependsOn) {
    const depId = String(dep);
    if (!depId.startsWith('task-')) continue;
    const depTask = taskMap.get(depId);
    if (!depTask) {
      maxDepth = Math.max(maxDepth, 9999);
      continue;
    }
    maxDepth = Math.max(maxDepth, 1 + getDependencyDepth(depTask, taskMap, nextSeen));
  }

  return maxDepth;
}

function sortEligibleTasks(eligibleTasks, taskMap) {
  return [...eligibleTasks].sort((a, b) => {
    const aPriority = PRIORITY_ORDER[String(a.frontmatter.priority || '').toUpperCase()] ?? 99;
    const bPriority = PRIORITY_ORDER[String(b.frontmatter.priority || '').toUpperCase()] ?? 99;
    if (aPriority !== bPriority) return aPriority - bPriority;

    const aDepth = getDependencyDepth(a, taskMap);
    const bDepth = getDependencyDepth(b, taskMap);
    if (aDepth !== bDepth) return aDepth - bDepth;

    const aUpdated = parseIsoDate(a.frontmatter.last_updated)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bUpdated = parseIsoDate(b.frontmatter.last_updated)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (aUpdated !== bUpdated) return aUpdated - bUpdated;

    return String(a.frontmatter.id).localeCompare(String(b.frontmatter.id));
  });
}

async function selectTaskInteractive(eligibleTasks) {
  if (!process.stdout.isTTY) {
    throw new Error('Interactive selection requires a TTY. Use --task task-### or --auto for non-interactive mode.');
  }

  const rl = createInterface({ input, output });
  try {
    output.write('\nEligible tasks:\n');
    eligibleTasks.forEach((task, index) => {
      output.write(`${index + 1}. ${task.frontmatter.id} - ${task.frontmatter.title}\n`);
    });

    const answer = await rl.question('\nSelect a task number: ');
    const selectedIndex = Number.parseInt(answer, 10) - 1;

    if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= eligibleTasks.length) {
      throw new Error('Invalid selection. Please rerun and choose a listed task number.');
    }

    return eligibleTasks[selectedIndex];
  } finally {
    rl.close();
  }
}

function computeClaimExpiry(frontmatter, claimHours) {
  const now = new Date();
  const proposed = new Date(now.getTime() + claimHours * 60 * 60 * 1000);
  const sla = frontmatter.sla_due_at ? new Date(String(frontmatter.sla_due_at)) : null;

  if (sla && !Number.isNaN(sla.getTime()) && proposed.getTime() > sla.getTime()) {
    return sla;
  }

  return proposed;
}

function getFastVerifyCommands(itemType, taskId) {
  const type = String(itemType || '').toLowerCase();
  const commands = [`node scripts/validate-task-pr.mjs --self-check --task-id ${taskId}`];

  if (['task', 'bug', 'feature'].includes(type)) {
    commands.push('cd frontend && npm run lint');
    commands.push('cd frontend && npm run build');
  }

  return commands;
}

function buildContextBundle(task, owner, branchName, config) {
  const fm = task.frontmatter;
  const agentPackRoot = getWorkflowPath(config, 'agent_pack_root');
  const readPath1 = joinWorkflowPath(agentPackRoot, '03-agent-ops', 'AGENTS.md');
  const readPath2 = joinWorkflowPath(agentPackRoot, '02-execution', 'implementation-strategy.md');
  const readPath3 = joinWorkflowPath(agentPackRoot, '02-execution', 'dependency-map.md');

  const dependsOn = Array.isArray(fm.depends_on) && fm.depends_on.length > 0
    ? fm.depends_on.map((dep) => `- ${dep}`).join('\n')
    : '- None';
  const acceptance = Array.isArray(fm.acceptance_criteria) && fm.acceptance_criteria.length > 0
    ? fm.acceptance_criteria.map((item) => `- ${item}`).join('\n')
    : '- Add acceptance criteria in task file.';
  const fastVerify = getFastVerifyCommands(fm.type, fm.id).map((command) => `- ${command}`).join('\n');

  return `# Cartograph Contribution Context: ${fm.id}\n\n## Primary Task\n- Task ID: ${fm.id}\n- Task File: ${task.relativePath}\n- Task Title: ${fm.title}\n- Branch: ${branchName}\n- Owner: ${owner}\n\n## Task Goal\n${extractSection(task.body, 'Task Goal') || 'See task file.'}\n\n## Dependencies\n${dependsOn}\n\n## Acceptance Criteria\n${acceptance}\n\n## Source-of-Truth Read Order\n1. AGENTS.md\n2. ${readPath1}\n3. ${readPath2}\n4. ${readPath3}\n5. ${task.relativePath}\n\n## PR Contract Checklist\n- [ ] PR title includes ${fm.id}\n- [ ] PR body includes required task linkage fields\n- [ ] Changed backlog files are limited to this primary task file\n- [ ] Progress/decision/blocker updates (if any) reference ${fm.id}\n\n## Local Validation\n- Run: node scripts/validate-task-pr.mjs --self-check --task-id ${fm.id}\n\n## Fast Verify\n${fastVerify}\n\n## Ready Prompt\nRead AGENTS.md and ${readPath1}. Implement only ${fm.id} (${fm.title}). Keep scope to this primary task plus required state logs. Do not modify other backlog items. Produce evidence aligned to acceptance criteria and keep PR title/body linked to ${fm.id}.\n`;
}

function extractSection(body, headingName) {
  const escaped = headingName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`## ${escaped}\\r?\\n([\\s\\S]*?)(?:\\r?\\n## |$)`);
  const match = body.match(regex);
  return match ? match[1].trim() : null;
}

function ensureCleanWorktree(allowDirty) {
  if (allowDirty) return;
  const status = runGit(['status', '--porcelain']).stdout.trim();
  if (status) {
    throw new Error('Working tree is not clean. Commit/stash changes before running cartograph-contribute. Use --allow-dirty only for controlled dry runs.');
  }
}

function branchExists(branchName) {
  return runGit(['rev-parse', '--verify', '--quiet', `refs/heads/${branchName}`], { allowFailure: true }).status === 0;
}

function createOrSwitchBranch(branchName, { dryRun, resume }) {
  const currentBranch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim();
  if (currentBranch === branchName) {
    return { reused: true };
  }

  const exists = branchExists(branchName);

  if (exists) {
    if (!resume) {
      throw new Error(`Branch ${branchName} already exists. Rerun with --resume to reuse it, or choose a different task.`);
    }

    if (!dryRun) {
      runGit(['switch', branchName]);
    }

    return { reused: true };
  }

  if (!dryRun) {
    runGit(['switch', '-c', branchName]);
  }

  return { reused: false };
}

function isClaimExpired(frontmatter) {
  const claimStatus = String(frontmatter.claim_status || '').toLowerCase();
  if (claimStatus !== 'claimed') return false;
  const expiry = parseIsoDate(frontmatter.claim_expires_at);
  if (!expiry) return false;
  return expiry.getTime() < Date.now();
}

function isResumeEligible(task, owner) {
  const claimStatus = String(task.frontmatter.claim_status || '').toLowerCase();
  const status = String(task.frontmatter.status || '').toLowerCase();
  const claimOwner = String(task.frontmatter.claim_owner || '');

  const claimedByOwner = claimStatus === 'claimed'
    && claimOwner === owner
    && !isClaimExpired(task.frontmatter)
    && ['todo', 'backlog', 'in_progress', 'blocked'].includes(status);

  return claimedByOwner;
}

function printSummary({ task, branchName, owner, claimExpiry, bundlePath, dryRun, resumed }) {
  const mode = dryRun ? 'DRY RUN' : 'READY';
  const reuseLabel = resumed ? ' (resumed)' : '';
  console.log(`\n[${mode}] cartograph-contribute prepared ${task.frontmatter.id}${reuseLabel}`);
  console.log(`- Branch: ${branchName}`);
  console.log(`- Task file: ${task.relativePath}`);
  console.log(`- Owner: ${owner}`);
  console.log(`- Claim expires: ${claimExpiry ? claimExpiry.toISOString() : String(task.frontmatter.claim_expires_at || 'n/a')}`);
  console.log(`- Context bundle: ${bundlePath.replace(/\\/g, '/')}`);
  console.log('\nNext steps:');
  console.log('1. Implement only this primary task and required related files.');
  console.log('2. Update progress/decision/blocker logs only if they reference this task ID.');
  console.log(`3. Run local check: node scripts/validate-task-pr.mjs --self-check --task-id ${task.frontmatter.id}`);
  console.log(`4. Use PR title format: [${task.frontmatter.id}] <short summary>`);
}

function printHelp() {
  console.log(`cartograph-contribute\n\nUsage:\n  node scripts/cartograph-contribute.mjs [options]\n\nOptions:\n  --task <task-###>           Select task non-interactively\n  --auto                      Auto-select highest-priority eligible task\n  --resume                    Reuse existing task branch if it already exists\n  --owner <name>              Set task owner/claim owner\n  --claim-hours <n>           Claim window in hours (default: 24)\n  --launch-cmd "...{bundle}"  Optional command to launch an agent using context bundle path\n  --dry-run                   Preview actions without mutating files/git\n  --allow-dirty               Skip clean-worktree check (intended for controlled dry runs)\n  --help                      Show this help\n`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (!Number.isInteger(options.claimHours) || options.claimHours <= 0) {
    throw new Error('--claim-hours must be a positive integer.');
  }

  const rootDir = process.cwd();
  const config = loadWorkflowConfig(rootDir);
  assertRepoStructure(rootDir, config);
  ensureCleanWorktree(options.allowDirty || options.dryRun);

  const tasksRootRel = getWorkflowPath(config, 'tasks_root');
  const tasks = loadTasks(rootDir, tasksRootRel);
  const taskMap = new Map(tasks.map((task) => [String(task.frontmatter.id), task]));

  const owner = options.owner
    || runGit(['config', 'user.name'], { allowFailure: true }).stdout.trim()
    || process.env.USER
    || process.env.USERNAME
    || 'unassigned';

  const eligibleTasks = sortEligibleTasks(
    tasks.filter((task) => getEligibility(task, taskMap).eligible),
    taskMap,
  );

  if (eligibleTasks.length === 0) {
    throw new Error('No eligible tasks found. Create/refine tasks or resolve dependencies/claims first.');
  }

  let selectedTask;

  if (options.taskId) {
    selectedTask = taskMap.get(options.taskId);
    if (!selectedTask) {
      throw new Error(`Task ${options.taskId} was not found.`);
    }
  } else if (options.auto) {
    selectedTask = eligibleTasks[0];
  } else {
    selectedTask = await selectTaskInteractive(eligibleTasks);
  }

  const taskId = String(selectedTask.frontmatter.id);
  const taskSlug = slugify(String(selectedTask.frontmatter.title || taskId));
  const branchName = `task/${taskId}${taskSlug ? `-${taskSlug}` : ''}`;
  const existingBranch = branchExists(branchName);

  const eligibility = getEligibility(selectedTask, taskMap);
  const canResumeClaim = options.resume && existingBranch && isResumeEligible(selectedTask, owner);
  const canClaimNow = eligibility.eligible;

  if (!canClaimNow && !canResumeClaim) {
    throw new Error(`Task ${taskId} is not eligible: ${eligibility.reasons.join('; ')}${options.resume ? '. Resume requires the task to be claim-eligible or already claimed by the same owner.' : ''}`);
  }

  let claimExpiry = canClaimNow ? computeClaimExpiry(selectedTask.frontmatter, options.claimHours) : null;
  let resumed = false;

  if (claimExpiry && Number.isNaN(claimExpiry.getTime())) {
    throw new Error('Unable to compute claim expiry. Check task SLA metadata.');
  }

  if (!options.dryRun) {
    const branchResult = createOrSwitchBranch(branchName, { dryRun: options.dryRun, resume: options.resume });
    resumed = branchResult.reused && existingBranch;

    if (canClaimNow) {
      const updated = { ...selectedTask.frontmatter };
      updated.owner = owner;
      updated.claim_owner = owner;
      updated.claim_status = 'claimed';
      updated.claim_expires_at = claimExpiry.toISOString();
      updated.status = 'in_progress';
      updated.last_updated = todayDateString();

      const tasksDir = toAbsolutePath(rootDir, tasksRootRel);
      const targetPath = getTaskTargetPath(tasksDir, selectedTask.filePath, updated);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      writeMarkdownWithFrontmatter(targetPath, updated, selectedTask.body, TASK_KEY_ORDER);

      if (targetPath !== selectedTask.filePath && fs.existsSync(selectedTask.filePath)) {
        fs.unlinkSync(selectedTask.filePath);
      }

      selectedTask.filePath = targetPath;
      selectedTask.relativePath = path.relative(rootDir, targetPath).replace(/\\/g, '/');
      selectedTask.frontmatter = updated;
    }
  }

  const bundleDir = path.join(rootDir, '.cartograph', 'context');
  const bundlePath = path.join(bundleDir, `${taskId}.md`);
  const bundleContent = buildContextBundle(selectedTask, owner, branchName, config);

  if (!options.dryRun) {
    fs.mkdirSync(bundleDir, { recursive: true });
    fs.writeFileSync(bundlePath, bundleContent, 'utf8');
  }

  printSummary({
    task: selectedTask,
    branchName,
    owner,
    claimExpiry,
    bundlePath,
    dryRun: options.dryRun,
    resumed,
  });

  if (options.launchCmd) {
    const launchCommand = options.launchCmd.replaceAll('{bundle}', bundlePath.replace(/\\/g, '/'));
    console.log(`\nLaunch command: ${launchCommand}`);

    if (!options.dryRun) {
      const result = spawnSync(launchCommand, {
        shell: true,
        stdio: 'inherit',
        env: process.env,
      });

      if (result.status !== 0) {
        throw new Error(`Agent launch command failed with exit code ${result.status}.`);
      }
    }
  }
}

main().catch((error) => {
  console.error(`\ncartograph-contribute failed: ${error.message}`);
  process.exit(1);
});
