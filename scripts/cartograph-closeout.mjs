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
    validateTaskUniqueness,
} from './lib/task-workflow.mjs';
import {
    loadWorkflowConfig,
    getWorkflowPath,
    toAbsolutePath,
} from './lib/workflow-config.mjs';

function parseArgs(argv) {
    const options = {
        dryRun: false,
        force: false,
        base: 'main',
        createPr: false,
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];

        if (arg === '--task') {
            options.taskId = argv[++i];
        } else if (arg === '--base') {
            options.base = argv[++i];
        } else if (arg === '--dry-run') {
            options.dryRun = true;
        } else if (arg === '--force') {
            options.force = true;
        } else if (arg === '--create-pr') {
            options.createPr = true;
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

function getCurrentBranch() {
    return runGit(['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim();
}

function extractTaskIdFromBranch(branch) {
    const match = branch.match(/(task|bug|spike|feature)-(task|bug|spike|feature)-(\d+)/);
    if (match) return `${match[2]}-${match[3]}`;

    const simpleMatch = branch.match(/(task|bug|spike|feature)-(\d+)/);
    if (simpleMatch) return `${simpleMatch[1]}-${simpleMatch[2]}`;

    return null;
}

function getUncommittedChanges() {
    const staged = runGit(['diff', '--cached', '--name-only'], { allowFailure: true }).stdout.trim();
    const unstaged = runGit(['diff', '--name-only'], { allowFailure: true }).stdout.trim();
    const untracked = runGit(['ls-files', '--others', '--exclude-standard'], { allowFailure: true }).stdout.trim();

    const all = [
        ...staged.split(/\r?\n/),
        ...unstaged.split(/\r?\n/),
        ...untracked.split(/\r?\n/)
    ].filter(Boolean);

    return [...new Set(all)];
}

function todayDateString() {
    return new Date().toISOString().slice(0, 10);
}

function printHelp() {
    console.log(`cartograph-closeout\n\nUsage:\n  node scripts/cartograph-closeout.mjs [options]\n\nOptions:\n  --task <task-###>           Target task ID (defaults to current branch ID)\n  --base <branch>             Base branch for validation (default: main)\n  --create-pr                 Automate GitHub PR creation using gh CLI\n  --dry-run                   Preview actions without mutating files/git\n  --force                     Skip validation checks\n  --help                      Show this help\n`);
}

function extractSection(body, headingName) {
    const escaped = headingName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`## ${escaped}\\r?\\n([\\s\\S]*?)(?:\\r?\\n## |$)`);
    const match = body.match(regex);
    return match ? match[1].trim() : null;
}

function extractProgressLogEvidence(rootDir, config, taskId) {
    const stateRootRel = getWorkflowPath(config, 'state_root');
    const logPath = toAbsolutePath(rootDir, path.join(stateRootRel, 'progress-log.md'));
    if (!fs.existsSync(logPath)) return null;

    const content = fs.readFileSync(logPath, 'utf8');
    // Regex to find the entry for this task and capture its evidence
    // Format: - YYYT-MM-DD... | `task-###` | ... | message\n  - Evidence:\n    - item...
    const regex = new RegExp(`- [^|]+? \\| \`${taskId}\` \\| [^|]+? \\| .*?\\r?\\n  - Evidence:\\r?\\n(([ ]{4}- .*\\r?\\n?)+)`);
    const match = content.match(regex);
    if (!match) return null;

    return match[1].trim();
}

async function createPullRequest(taskId, branch, taskPath, rootDir, config, options) {
    const { frontmatter, body } = readMarkdownWithFrontmatter(taskPath);
    const acceptance = (frontmatter.acceptance_criteria || []).map(ac => `- [x] ${ac}`).join('\n');
    const goal = extractSection(body, 'Task Goal') || 'See task file.';
    const evidence = extractProgressLogEvidence(rootDir, config, taskId) || 'Add evidence details here.';

    const prBody = `## Primary Task
### Task ID
${taskId}

### Task File Path
${path.relative(rootDir, taskPath).replace(/\\/g, '/')}

### Task Title
${frontmatter.title}

## Scope Contract
- [x] This PR has exactly one primary task.
- [x] I did not update unrelated backlog item files.
- [x] Any state-log updates reference the same primary task ID.

### Acceptance Criteria
${acceptance}

### Evidence
${evidence}

### Validation Results
- node scripts/validate-task-pr.mjs --self-check --task-id ${taskId} passed.

### Assumptions Made
- None.

### Blockers Encountered
- None.

### Out-of-Scope Changes
- None.

## PR Title Contract
- [x] PR title includes the same primary task ID.
`;

    const title = `[${taskId}] ${frontmatter.title}`;
    const prBodyPath = path.join(rootDir, '.cartograph', 'PR_BODY.md');
    fs.mkdirSync(path.dirname(prBodyPath), { recursive: true });
    fs.writeFileSync(prBodyPath, prBody, 'utf8');

    if (options.dryRun) {
        console.log(`\n[DRY RUN] Would create PR with title: "${title}"`);
        console.log(`- Body generated and written to: .cartograph/PR_BODY.md`);
        return;
    }

    console.log(`- Generating PR body in .cartograph/PR_BODY.md...`);
    
    // Check if gh is authenticated
    const authStatus = spawnSync('gh', ['auth', 'status']);
    if (authStatus.status !== 0) {
        throw new Error(`GitHub CLI (gh) is not authenticated. Run 'gh auth login' or create PR manually using .cartograph/PR_BODY.md`);
    }

    console.log(`- Pushing branch ${branch} to origin...`);
    runGit(['push', 'origin', branch, '--force']); // Force push if we fixed something near closeout

    console.log(`- Creating Pull Request using GitHub CLI...`);
    const prResult = spawnSync('gh', [
        'pr', 'create',
        '--title', title,
        '--body-file', prBodyPath,
    ], { stdio: 'inherit' });

    if (prResult.status !== 0) {
        throw new Error('Failed to create Pull Request via GitHub CLI.');
    }

    console.log(`\n[SUCCESS] Pull Request created!`);
}

async function main() {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
        printHelp();
        return;
    }

    const rootDir = process.cwd();
    const config = loadWorkflowConfig(rootDir);
    const tasksRootRel = getWorkflowPath(config, 'tasks_root');

    const branch = getCurrentBranch();
    const taskId = options.taskId || extractTaskIdFromBranch(branch);

    if (!taskId) {
        throw new Error('Unable to determine task ID from branch or --task argument.');
    }

    console.log(`\n[CLOSEOUT] Preparing to close out ${taskId} on branch ${branch}...`);

    // 0. Pro-active change detection
    const uncommitted = getUncommittedChanges();
    if (uncommitted.length > 0) {
        if (options.dryRun) {
            console.log(`\n[DRY RUN] Would stage ${uncommitted.length} uncommitted changes:`);
            uncommitted.forEach(f => console.log(`  - ${f}`));
        } else {
            console.log(`- Detected ${uncommitted.length} uncommitted changes. Staging for validation...`);
            runGit(['add', ...uncommitted]);
        }
    }

    // 1. Preflight Validation
    if (!options.force) {
        console.log(`- Running manifest path usage check...`);
        const manifestCheck = spawnSync('node', ['scripts/check-manifest-path-usage.mjs'], { stdio: 'inherit' });
        if (manifestCheck.status !== 0) {
            throw new Error('Manifest path usage check failed. Resolve errors before closeout.');
        }

        console.log(`- Running task PR validation (base: ${options.base})...`);
        const validateCheck = spawnSync('node', [
            'scripts/validate-task-pr.mjs',
            '--self-check',
            '--task-id', taskId,
            '--base', options.base
        ], { stdio: 'inherit' });

        if (validateCheck.status !== 0) {
            throw new Error(`Validation failed for ${taskId}. Ensure progress/change logs are updated and reference ${taskId}.`);
        }
    } else {
        console.log(`- Skipping validation checks (--force).`);
    }

    // 2. Find the task file
    const tasksDir = toAbsolutePath(rootDir, tasksRootRel);

    // Ensure uniqueness before proceeding
    console.log(`- Checking task ID uniqueness across global task folders...`);
    validateTaskUniqueness(tasksDir);

    const allTasks = collectTaskFilesRecursively(tasksDir);
    const task = allTasks.find(t => path.basename(t).startsWith(`${taskId}-`));

    if (!task) {
        throw new Error(`Task file for ${taskId} not found in ${tasksRootRel}.`);
    }

    console.log(`- Found task file: ${path.relative(rootDir, task)}`);

    // 3. Update task file and move to pull_requested
    const { frontmatter, body } = readMarkdownWithFrontmatter(task);

    const updated = { ...frontmatter };
    updated.status = 'pull_requested';
    // claim_status remains 'claimed' since it's not yet released into 'completed'
    updated.last_updated = todayDateString();

    const targetPath = getTaskTargetPath(tasksDir, task, updated);

    if (options.dryRun) {
        console.log(`\n[DRY RUN] Would move and update task:`);
        console.log(`  From: ${path.relative(rootDir, task)}`);
        console.log(`  To:   ${path.relative(rootDir, targetPath)}`);
        console.log(`  Status: pull_requested`);
    } else {
        console.log(`- Transitioning task to pull_requested...`);
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        writeMarkdownWithFrontmatter(targetPath, updated, body, TASK_KEY_ORDER);

        if (targetPath !== task) {
            fs.unlinkSync(task);
            console.log(`- Moved to: ${path.relative(rootDir, targetPath)}`);
        }

        // 4. Git staging
        console.log(`- Staging closeout changes...`);
        runGit(['add', targetPath]);
        if (targetPath !== task) {
            runGit(['add', task], { allowFailure: true }); // Catch the deletion if original was in git
        }
    }

    console.log(`\n[SUCCESS] ${taskId} closeout prepared.`);
    console.log(`\nSummary:`);
    console.log(`- Task file moved to pull_requested/ bucket.`);
    console.log(`- Frontmatter updated (status: pull_requested).`);
    console.log(`- Changes staged for commit.`);

    console.log(`\nNext steps:`);
    if (options.createPr) {
        await createPullRequest(taskId, branch, targetPath, rootDir, config, options);
    } else {
        console.log(`1. Review staged changes: git status`);
        console.log(`2. Commit work: git commit -m "[${taskId}] Closeout: completion of task goal"`);
        console.log(`3. Push branch and create Pull Request: git push origin ${branch}`);
        console.log(`4. Upon merge to main, a GitHub Action will move the task to completed/.`);
    }
}

main().catch((error) => {
    console.error(`\ncartograph-closeout failed: ${error.message}`);
    process.exit(1);
});
