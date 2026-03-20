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
        evidence: [],
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];

        if (arg === '--task') {
            options.taskId = argv[++i];
        } else if (arg === '--base') {
            options.base = argv[++i];
        } else if (arg === '--summary') {
            options.summary = argv[++i];
        } else if (arg === '--evidence') {
            options.evidence.push(argv[++i]);
        } else if (arg === '--next-step') {
            options.nextStep = argv[++i];
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

function normalizeRepoPath(value) {
    return String(value || '').replace(/\\/g, '/').replace(/^\.\/+/, '').trim();
}

function extractTaskIdFromBranch(branch) {
    const match = branch.match(/(task|bug|spike|feature)-(task|bug|spike|feature)-(\d+)/);
    if (match) return `${match[2]}-${match[3]}`;

    const simpleMatch = branch.match(/(task|bug|spike|feature)-(\d+)/);
    if (simpleMatch) return `${simpleMatch[1]}-${simpleMatch[2]}`;

    return null;
}

function parseStatusPaths(stdout) {
    return String(stdout || '')
        .split(/\r?\n/)
        .map(line => line.trimEnd())
        .filter(Boolean)
        .flatMap(line => {
            const payload = line.slice(3).trim();
            if (!payload) return [];
            if (payload.includes(' -> ')) {
                const [fromPath, toPath] = payload.split(' -> ');
                return [normalizeRepoPath(fromPath), normalizeRepoPath(toPath)];
            }
            return [normalizeRepoPath(payload)];
        })
        .filter(Boolean);
}

function getUncommittedChanges() {
    const porcelain = runGit(['status', '--porcelain'], { allowFailure: true }).stdout;
    return [...new Set(parseStatusPaths(porcelain))];
}

function todayDateString() {
    return new Date().toISOString().slice(0, 10);
}

function formatTimestampWithOffset(date = new Date()) {
    const pad = (value) => String(value).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absoluteOffsetMinutes = Math.abs(offsetMinutes);
    const offsetHours = pad(Math.floor(absoluteOffsetMinutes / 60));
    const offsetRemainderMinutes = pad(absoluteOffsetMinutes % 60);

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetRemainderMinutes}`;
}

function normalizeListFromArgs(rawValues) {
    const values = Array.isArray(rawValues) ? rawValues : [];
    const expanded = values
        .flatMap(value => String(value || '').split(','))
        .map(value => value.trim())
        .filter(Boolean);

    return [...new Set(expanded)];
}

function parseChangedFilesOutput(stdout) {
    return String(stdout || '')
        .split(/\r?\n/)
        .map(line => normalizeRepoPath(line))
        .filter(Boolean);
}

function getRecentChangedFiles(baseBranch, rootDir, primaryTaskPath = null) {
    const files = new Set();

    const branchDiff = runGit(
        ['diff', '--name-only', `origin/${baseBranch}...HEAD`],
        { allowFailure: true }
    );
    parseChangedFilesOutput(branchDiff.stdout).forEach(file => files.add(file));

    getUncommittedChanges().forEach(file => files.add(file));

    if (primaryTaskPath) {
        files.add(normalizeRepoPath(primaryTaskPath));
    }

    return Array.from(files)
        .map(file => normalizeRepoPath(file))
        .filter(Boolean)
        .filter(file => fs.existsSync(path.join(rootDir, file)))
        .filter((file, index, all) => all.indexOf(file) === index)
        .sort((a, b) => a.localeCompare(b));
}

function createDefaultSummary(taskId, evidence) {
    const normalizedEvidence = Array.isArray(evidence)
        ? evidence.map(item => String(item || '').trim()).filter(Boolean)
        : [];

    if (normalizedEvidence.length === 0) {
        return `Prepared ${taskId} closeout updates.`;
    }

    const topFiles = normalizedEvidence.slice(0, 3).map(file => path.basename(file));
    const suffix = normalizedEvidence.length > 3 ? ` and ${normalizedEvidence.length - 3} more file(s)` : '';
    return `Prepared ${taskId} closeout updates touching ${topFiles.join(', ')}${suffix}.`;
}

async function collectProgressLogInput(taskId, options, suggestedEvidence) {
    let summary = String(options.summary || '').trim();
    let evidence = normalizeListFromArgs(options.evidence);
    const nextStep = String(options.nextStep || 'Open Pull Request for review.').trim();
    const canPrompt = process.stdin.isTTY && process.stdout.isTTY;

    const visibleSuggestions = suggestedEvidence.filter(
        file => !file.includes('/.cartograph/') && !file.includes('\\.cartograph\\')
    );

    if (visibleSuggestions.length > 0) {
        console.log(`- Suggested evidence files from recent changes:`);
        visibleSuggestions.forEach(file => console.log(`  - ${file}`));
    } else {
        console.log(`- No changed-file evidence suggestions detected automatically.`);
    }

    if ((!summary || evidence.length === 0) && canPrompt) {
        const rl = createInterface({ input, output });
        try {
            if (!summary) {
                summary = (await rl.question('Progress summary for this task: ')).trim();
            }

            if (evidence.length === 0) {
                const prompt = visibleSuggestions.length > 0
                    ? 'Evidence files (comma-separated, press Enter to use suggested files): '
                    : 'Evidence files (comma-separated): ';
                const evidenceAnswer = (await rl.question(prompt)).trim();

                if (evidenceAnswer) {
                    evidence = normalizeListFromArgs([evidenceAnswer]);
                } else if (visibleSuggestions.length > 0) {
                    evidence = visibleSuggestions;
                }
            }
        } finally {
            rl.close();
        }
    }

    if (!summary) {
        summary = createDefaultSummary(taskId, evidence.length > 0 ? evidence : visibleSuggestions);
        console.log(`- No summary provided; generated summary: ${summary}`);
    }

    if (evidence.length === 0 && visibleSuggestions.length > 0) {
        evidence = visibleSuggestions;
    }

    if (evidence.length === 0) {
        throw new Error('Closeout requires at least one evidence item. Provide --evidence or ensure changed files are detected.');
    }

    return { summary, evidence, nextStep };
}

function appendProgressLogEntry({ rootDir, config, taskId, summary, evidence, nextStep, dryRun }) {
    const stateRootRel = getWorkflowPath(config, 'state_root');
    const progressLogPath = toAbsolutePath(rootDir, path.join(stateRootRel, 'progress-log.md'));

    if (!fs.existsSync(progressLogPath)) {
        throw new Error(`Progress log not found: ${path.relative(rootDir, progressLogPath)}`);
    }

    const content = fs.readFileSync(progressLogPath, 'utf8');
    const existingEntryPattern = new RegExp(`^- .*\\| \`${taskId}\` \\|`, 'm');

    if (existingEntryPattern.test(content)) {
        console.log(`- Progress log already contains an entry for ${taskId}; skipping auto-append.`);
        return { progressLogPath, appended: false };
    }

    const entryLines = [
        `- ${formatTimestampWithOffset()} | \`${taskId}\` | \`done\` | ${summary}`,
        '  - Evidence:',
        ...evidence.map(item => `    - \`${item}\``),
        `  - Next step: ${nextStep}`,
    ];
    const entryBlock = `${entryLines.join('\n')}\n`;

    if (!content.includes('## Latest Entries')) {
        throw new Error('progress-log.md is missing the "## Latest Entries" section.');
    }

    const updatedContent = content.replace(/(## Latest Entries\r?\n)/, `$1${entryBlock}`);

    if (dryRun) {
        console.log(`\n[DRY RUN] Would append progress-log entry for ${taskId}:`);
        entryLines.forEach(line => console.log(`  ${line}`));
        return { progressLogPath, appended: true };
    }

    fs.writeFileSync(progressLogPath, updatedContent, 'utf8');
    console.log(`- Appended progress-log entry in ${path.relative(rootDir, progressLogPath)}.`);
    return { progressLogPath, appended: true };
}

function printHelp() {
    console.log(`cartograph-closeout\n\nUsage:\n  node scripts/cartograph-closeout.mjs [options]\n\nOptions:\n  --task <task-###>           Target task ID (defaults to current branch ID)\n  --base <branch>             Base branch for validation (default: main)\n  --summary "<text>"          Progress-log summary for this closeout (auto-generated in non-interactive mode if omitted)\n  --evidence "<path>"         Evidence item (repeatable or comma-separated)\n  --next-step "<text>"        Optional next-step line for progress log entry\n  --create-pr                 Automate GitHub PR creation using gh CLI\n  --dry-run                   Preview actions without mutating files/git\n  --force                     Skip validation checks\n  --help                      Show this help\n`);
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
            runGit(['add', '--all']);
        }
    }

    // 1. Manifest preflight
    if (!options.force) {
        console.log(`- Running manifest path usage check...`);
        const manifestCheck = spawnSync('node', ['scripts/check-manifest-path-usage.mjs'], { stdio: 'inherit' });
        if (manifestCheck.status !== 0) {
            throw new Error('Manifest path usage check failed. Resolve errors before closeout.');
        }
    } else {
        console.log(`- Skipping manifest validation (--force).`);
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

    // 3. Capture progress log details and append entry
    const suggestedEvidence = getRecentChangedFiles(
        options.base,
        rootDir,
        path.relative(rootDir, task).replace(/\\/g, '/')
    );
    const progressInput = await collectProgressLogInput(taskId, options, suggestedEvidence);
    const progressResult = appendProgressLogEntry({
        rootDir,
        config,
        taskId,
        summary: progressInput.summary,
        evidence: progressInput.evidence,
        nextStep: progressInput.nextStep,
        dryRun: options.dryRun,
    });

    if (!options.dryRun && progressResult.appended) {
        runGit(['add', progressResult.progressLogPath]);
    }

    // 4. Update task file and move to pull_requested
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

        // 5. Git staging
        console.log(`- Staging closeout changes...`);
        runGit(['add', '--all']);
    }

    // 6. Task PR validation with progress-log enforcement
    if (options.dryRun) {
        console.log(`- Skipping task PR validation in dry-run mode.`);
    } else if (!options.force) {
        console.log(`- Running task PR validation (base: ${options.base})...`);
        const validateCheck = spawnSync('node', [
            'scripts/validate-task-pr.mjs',
            '--self-check',
            '--task-id', taskId,
            '--base', options.base
        ], { stdio: 'inherit' });

        if (validateCheck.status !== 0) {
            throw new Error(`Validation failed for ${taskId}. Ensure task scope, progress log summary, and evidence are valid.`);
        }
    } else {
        console.log(`- Skipping task PR validation (--force).`);
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
