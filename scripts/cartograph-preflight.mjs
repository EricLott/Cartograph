#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function parseArgs(argv) {
  const options = {
    base: 'main',
    skipFrontend: false,
    skipBackend: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--task') options.taskId = argv[++i];
    else if (arg === '--base') options.base = argv[++i];
    else if (arg === '--skip-frontend') options.skipFrontend = true;
    else if (arg === '--skip-backend') options.skipBackend = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`cartograph-preflight

Usage:
  node scripts/cartograph-preflight.mjs [options]

Options:
  --task <task-###>      Task ID (defaults to branch-derived ID)
  --base <branch>        Base branch for validate-task-pr (default: main)
  --skip-frontend        Skip frontend lint/build checks
  --skip-backend         Skip backend test check
  --help                 Show this help
`);
}

function runCommand(command, args, cwd = process.cwd()) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: false,
  });
  return result.status === 0;
}

function getCurrentBranch() {
  const result = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`Unable to determine current branch: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function extractTaskIdFromBranch(branch) {
  const match = String(branch || '').match(/(task|bug|spike|feature)-(\d+)/);
  return match ? `${match[1]}-${match[2]}` : null;
}

function backendHasTestScript(rootDir) {
  const packageJsonPath = path.join(rootDir, 'backend', 'package.json');
  if (!fs.existsSync(packageJsonPath)) return false;
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return typeof pkg?.scripts?.test === 'string' && pkg.scripts.test.trim().length > 0;
  } catch {
    return false;
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const rootDir = process.cwd();
  const branch = getCurrentBranch();
  const taskId = options.taskId || extractTaskIdFromBranch(branch);
  if (!taskId) {
    throw new Error('Unable to determine task ID. Provide --task <task-###> or run on a task branch.');
  }

  console.log(`\n[PREFLIGHT] Running preflight for ${taskId} (base: ${options.base})...`);

  const results = [];
  const run = (label, command, args, cwd = rootDir) => {
    console.log(`- ${label}...`);
    const ok = runCommand(command, args, cwd);
    results.push({ label, ok });
    return ok;
  };

  run('Manifest path usage check', 'node', ['scripts/check-manifest-path-usage.mjs'], rootDir);
  run(
    'Task scope validation',
    'node',
    ['scripts/validate-task-pr.mjs', '--self-check', '--task-id', taskId, '--base', options.base],
    rootDir
  );

  const frontendDir = path.join(rootDir, 'frontend');
  if (!options.skipFrontend && fs.existsSync(frontendDir)) {
    run('Frontend lint', 'npm', ['run', 'lint'], frontendDir);
    run('Frontend build', 'npm', ['run', 'build'], frontendDir);
  } else if (options.skipFrontend) {
    console.log('- Skipping frontend checks (--skip-frontend).');
  }

  const backendDir = path.join(rootDir, 'backend');
  if (!options.skipBackend && fs.existsSync(backendDir) && backendHasTestScript(rootDir)) {
    run('Backend tests', 'npm', ['test'], backendDir);
  } else if (options.skipBackend) {
    console.log('- Skipping backend checks (--skip-backend).');
  }

  const failed = results.filter(result => !result.ok);
  console.log(`\nPreflight summary: ${results.length - failed.length}/${results.length} checks passed.`);
  results.forEach(result => {
    console.log(`- ${result.ok ? 'PASS' : 'FAIL'}: ${result.label}`);
  });

  if (failed.length > 0) {
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error(`\ncartograph-preflight failed: ${error.message}`);
  process.exit(1);
}
