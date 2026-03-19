import fs from 'node:fs';
import path from 'node:path';

export const WORKFLOW_MANIFEST_PATH = path.join('.cartograph', 'workflow.json');
const SUPPORTED_MAJOR_VERSION = '1';

function normalizeRelPath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\.\/+/, '').replace(/\/$/, '');
}

function assertManifestShape(manifest) {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('Workflow manifest must be a JSON object.');
  }

  if (!manifest.workflow_version || typeof manifest.workflow_version !== 'string') {
    throw new Error('Workflow manifest is missing required field: workflow_version.');
  }

  const major = manifest.workflow_version.split('.')[0];
  if (major !== SUPPORTED_MAJOR_VERSION) {
    throw new Error(`Unsupported workflow_version ${manifest.workflow_version}. Supported major version: ${SUPPORTED_MAJOR_VERSION}.x`);
  }

  if (!manifest.paths || typeof manifest.paths !== 'object') {
    throw new Error('Workflow manifest is missing required object: paths.');
  }

  const requiredPaths = ['agent_pack_root', 'tasks_root', 'state_root'];
  for (const key of requiredPaths) {
    if (!manifest.paths[key] || typeof manifest.paths[key] !== 'string') {
      throw new Error(`Workflow manifest is missing required paths.${key}.`);
    }
  }

  if (!manifest.policies || typeof manifest.policies !== 'object') {
    throw new Error('Workflow manifest is missing required object: policies.');
  }
}

export function loadWorkflowConfig(rootDir = process.cwd()) {
  const manifestPath = path.join(rootDir, WORKFLOW_MANIFEST_PATH);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Workflow manifest not found at ${WORKFLOW_MANIFEST_PATH}.`);
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`Workflow manifest is not valid JSON: ${error.message}`);
  }

  assertManifestShape(parsed);

  const paths = {};
  for (const [key, value] of Object.entries(parsed.paths || {})) {
    paths[key] = normalizeRelPath(value);
  }

  return {
    workflow_version: parsed.workflow_version,
    paths,
    policies: { ...(parsed.policies || {}) },
  };
}

export function getWorkflowPath(config, key) {
  const value = config?.paths?.[key];
  if (!value) {
    throw new Error(`Workflow path "${key}" is not configured.`);
  }
  return value;
}

export function getWorkflowPolicy(config, key, fallback = null) {
  if (config?.policies && key in config.policies) {
    return config.policies[key];
  }
  return fallback;
}

export function joinWorkflowPath(base, ...segments) {
  return [base, ...segments].map((part) => normalizeRelPath(part)).filter(Boolean).join('/');
}

export function toAbsolutePath(rootDir, relPath) {
  return path.join(rootDir, ...normalizeRelPath(relPath).split('/'));
}

export function getTaskSystemRoot(config) {
  const tasksRoot = getWorkflowPath(config, 'tasks_root');
  const parts = tasksRoot.split('/');
  if (parts.length < 2) {
    throw new Error(`tasks_root is invalid: ${tasksRoot}`);
  }
  return parts.slice(0, -1).join('/');
}

export function getWorkflowManifestAbsolutePath(rootDir = process.cwd()) {
  return path.join(rootDir, WORKFLOW_MANIFEST_PATH);
}
