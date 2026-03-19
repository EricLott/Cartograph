import fs from 'node:fs';
import path from 'node:path';

export const TASK_KEY_ORDER = [
  'id',
  'title',
  'type',
  'status',
  'priority',
  'owner',
  'claim_owner',
  'claim_status',
  'claim_expires_at',
  'sla_due_at',
  'depends_on',
  'acceptance_criteria',
  'last_updated',
];

export const STATUS_TRANSITIONS = {
  backlog: new Set(['backlog', 'todo', 'in_progress', 'blocked', 'cancelled']),
  todo: new Set(['todo', 'in_progress', 'blocked', 'cancelled']),
  in_progress: new Set(['in_progress', 'blocked', 'todo', 'pull_requested', 'cancelled']),
  pull_requested: new Set(['pull_requested', 'in_progress', 'blocked', 'completed', 'cancelled']),
  blocked: new Set(['blocked', 'in_progress', 'todo', 'pull_requested', 'cancelled']),
  completed: new Set(['completed']),
  done: new Set(['done', 'completed']),
  cancelled: new Set(['cancelled']),
};

export const CLAIM_TRANSITIONS = {
  unclaimed: new Set(['unclaimed', 'claimed']),
  claimed: new Set(['claimed', 'released', 'expired']),
  expired: new Set(['expired', 'unclaimed', 'claimed']),
  released: new Set(['released', 'claimed']),
};

export function collectTaskFilesRecursively(directoryPath) {
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectTaskFilesRecursively(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md' && entry.name.startsWith('task-')) {
      files.push(fullPath);
    }
  }

  return files;
}

export function getTaskStatusBucket(frontmatter) {
  const status = String(frontmatter.status || '').toLowerCase();
  const claimStatus = String(frontmatter.claim_status || '').toLowerCase();

  if (status === 'completed') return 'completed';
  if (status === 'done') return 'complete';
  if (status === 'cancelled') return 'cancelled';
  if (claimStatus === 'expired') return 'claim_expired';
  if (status === 'pull_requested') return 'pull_requested';
  if (status === 'blocked') return 'blocked';
  if (status === 'in_progress') return 'in_progress';
  if (claimStatus === 'claimed') return 'claimed';
  return 'todo';
}

export function getTaskTargetPath(tasksDir, filePath, frontmatter) {
  const targetDir = path.join(tasksDir, getTaskStatusBucket(frontmatter));
  return path.join(targetDir, path.basename(filePath));
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getTaskPathKind(filePath, tasksRoot) {
  const normalized = String(filePath).replace(/\\/g, '/');
  const root = String(tasksRoot || '').replace(/\\/g, '/').replace(/\/$/, '');
  const escapedRoot = escapeRegex(root);
  const nested = new RegExp(`^${escapedRoot}/[^/]+/task-\\d+-.+\\.md$`).test(normalized);
  const flat = new RegExp(`^${escapedRoot}/task-\\d+-.+\\.md$`).test(normalized);
  return { nested, flat };
}

export function parseIsoDate(value) {
  if (!value) return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}
