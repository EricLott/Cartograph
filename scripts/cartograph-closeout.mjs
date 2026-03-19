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
        } else if (arg === '--commit') {
            options.commit = true;
        } else if (arg === '--push') {
            options.push = true;
            options.commit = true; // Push implies commit
        } else if (arg === '--stage-all') {
            options.stageAll = true;
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

function todayDateString() {
    return new Date().toISOString().slice(0, 10);
}

function printHelp() {
    console.log(`cartograph-closeout\n\nUsage:\n  node scripts/cartograph-closeout.mjs [options]\n\nOptions:\n  --task <task-###>           Target task ID (defaults to current branch ID)\n  --base <branch>             Base branch for validation (default: main)\n  --stage-all                 git add -A before validation/closeout\n  --commit                    git commit after successful transition\n  --push                      git pull --rebase and git push after commit\n  --dry-run                   Preview actions without mutating files/git\n  --force                     Skip validation checks\n  --help                      Show this help\n`);
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

    // 0. Stage changes if requested
    if (options.stageAll && !options.dryRun) {
        console.log(`- Staging all changes (--stage-all)...`);
        runGit(['add', '-A']);
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
    const allTasks = collectTaskFilesRecursively(tasksDir);
    const task = allTasks.find(t => path.basename(t).startsWith(`${taskId}-`));

    if (!task) {
        throw new Error(`Task file for ${taskId} not found in ${tasksRootRel}.`);
    }

    console.log(`- Found task file: ${path.relative(rootDir, task)}`);

    // 3. Update task file and move to completed
    const { frontmatter, body } = readMarkdownWithFrontmatter(task);

    const updated = { ...frontmatter };
    updated.status = 'completed';
    updated.claim_status = 'released';
    updated.claim_expires_at = null;
    updated.last_updated = todayDateString();

    const targetPath = getTaskTargetPath(tasksDir, task, updated);

    if (options.dryRun) {
        console.log(`\n[DRY RUN] Would move and update task:`);
        console.log(`  From: ${path.relative(rootDir, task)}`);
        console.log(`  To:   ${path.relative(rootDir, targetPath)}`);
        console.log(`  Status: completed, claim_status: released`);
    } else {
        console.log(`- Transitioning task to completed...`);
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        writeMarkdownWithFrontmatter(targetPath, updated, body, TASK_KEY_ORDER);

        if (targetPath !== task) {
            fs.unlinkSync(task);
            console.log(`- Moved to: ${path.relative(rootDir, targetPath)}`);
        }

        // 4. Git staging (specific files)
        console.log(`- Staging closeout changes...`);
        runGit(['add', targetPath]);
        if (targetPath !== task) {
            runGit(['add', task], { allowFailure: true }); // Catch the deletion if original was in git
        }

        // 5. Commit and Push
        if (options.commit) {
            console.log(`- Committing closeout changes...`);
            runGit(['commit', '-m', `[${taskId}] Closeout: completion of task goal`]);
        }

        if (options.push) {
            console.log(`- Syncing with remote (origin ${branch})...`);
            runGit(['pull', '--rebase', 'origin', branch], { allowFailure: true });
            console.log(`- Pushing to origin...`);
            runGit(['push', 'origin', branch]);
        }
    }

    console.log(`\n[SUCCESS] ${taskId} closeout prepared.`);
    console.log(`\nSummary:`);
    console.log(`- Task file moved to completed/ bucket.`);
    console.log(`- Frontmatter updated (status: completed, claim_status: released).`);
    if (options.commit) console.log(`- Changes committed.`);
    if (options.push) console.log(`- Branch pushed to origin.`);

    console.log(`\nNext steps:`);
    if (!options.push) {
        console.log(`1. Review staged changes: git status`);
        console.log(`2. Commit work: git commit -m "[${taskId}] Closeout: completion of task goal"`);
        console.log(`3. Push branch: git push origin ${branch}`);
    }
    console.log(`${options.push ? '1' : '4'}. Re-run node scripts/cartograph-contribute.mjs --auto to start next task.`);
}

main().catch((error) => {
    console.error(`\ncartograph-closeout failed: ${error.message}`);
    process.exit(1);
});
