import { spawnSync } from 'node:child_process';

export function runGit(args, { allowFailure = false, cwd = process.cwd() } = {}) {
    const result = spawnSync('git', args, { encoding: 'utf8', cwd });
    if (result.status !== 0 && !allowFailure) {
        throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
    }
    return result;
}

export function runGh(args, { allowFailure = false, cwd = process.cwd() } = {}) {
    const result = spawnSync('gh', args, { encoding: 'utf8', cwd });
    if (result.status !== 0 && !allowFailure) {
        throw new Error(`gh ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
    }
    return result;
}

export function getCurrentBranch() {
    return runGit(['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim();
}

export function getPrStatus(branch) {
    try {
        const result = runGh(['pr', 'view', branch, '--json', 'state,mergedAt,url,statusCheckRollup'], { allowFailure: true });
        if (result.status !== 0) return null;
        return JSON.parse(result.stdout);
    } catch (e) {
        return null;
    }
}

export function syncMain() {
    console.log('- Syncing main branch...');
    runGit(['checkout', 'main']);
    runGit(['pull', 'origin', 'main']);
}

export function deleteBranch(branch) {
    console.log(`- Deleting branch ${branch}...`);
    runGit(['branch', '-D', branch], { allowFailure: true });
}
