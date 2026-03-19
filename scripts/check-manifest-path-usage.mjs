#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const SCRIPT_ROOT = 'scripts';
const EXCLUDED_FILES = new Set([
  path.normalize('scripts/check-manifest-path-usage.mjs'),
]);

const FORBIDDEN_PATTERNS = [
  {
    name: 'agent-pack literal path',
    regex: /agent-pack[\\/]/g,
    guidance: 'Resolve workflow paths via scripts/lib/workflow-config.mjs and .cartograph/workflow.json.',
  },
];

function collectScriptFiles(dirPath) {
  const files = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectScriptFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.mjs')) {
      files.push(fullPath);
    }
  }
  return files;
}

function normalizeRel(filePath) {
  return filePath.replace(/\\/g, '/');
}

function main() {
  const rootDir = process.cwd();
  const scriptDir = path.join(rootDir, SCRIPT_ROOT);
  if (!fs.existsSync(scriptDir)) {
    throw new Error(`Missing scripts directory: ${SCRIPT_ROOT}`);
  }

  const candidates = collectScriptFiles(scriptDir);
  const violations = [];

  for (const absPath of candidates) {
    const relPath = normalizeRel(path.relative(rootDir, absPath));
    if (EXCLUDED_FILES.has(path.normalize(relPath))) continue;

    const text = fs.readFileSync(absPath, 'utf8');
    const lines = text.split(/\r?\n/);

    for (const rule of FORBIDDEN_PATTERNS) {
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (!rule.regex.test(line)) continue;
        violations.push({
          file: relPath,
          line: i + 1,
          rule: rule.name,
          guidance: rule.guidance,
          snippet: line.trim(),
        });
      }
      rule.regex.lastIndex = 0;
    }
  }

  if (violations.length > 0) {
    console.error('\nManifest path usage check failed:');
    for (const violation of violations) {
      console.error(`- ${violation.file}:${violation.line} (${violation.rule})`);
      console.error(`  ${violation.snippet}`);
      console.error(`  ${violation.guidance}`);
      console.error(`::error file=${violation.file},line=${violation.line}::${violation.rule}. ${violation.guidance}`);
    }
    process.exit(1);
  }

  console.log('Manifest path usage check passed.');
}

try {
  main();
} catch (error) {
  console.error(`\ncheck-manifest-path-usage failed: ${error.message}`);
  process.exit(1);
}

