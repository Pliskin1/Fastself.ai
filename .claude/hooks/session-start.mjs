#!/usr/bin/env node
// SessionStart hook: puts the current state of the project into Claude's context (plain stdout is added to context).
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const out = [];
try {
  const git = (c) => execSync(c, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  const branch = git('git branch --show-current');
  const dirty = git('git status --porcelain').split('\n').filter(Boolean);
  const files = dirty.slice(0, 8).map((l) => l.slice(3)).join(', ') + (dirty.length > 8 ? ', ...' : '');
  out.push(`Git branch: ${branch || '(detached)'}; uncommitted files: ${dirty.length}${dirty.length ? ` (${files})` : ''}.`);
} catch {
  out.push('Git: not a repository yet.');
}
const progress = join(root, 'docs', 'PROGRESS.md');
if (existsSync(progress)) {
  const head = readFileSync(progress, 'utf8').split('\n').slice(0, 30).join('\n');
  out.push('Top of docs/PROGRESS.md:', head);
}
out.push('Project rules are in CLAUDE.md. Read other docs only when the task needs them.');
console.log(out.join('\n'));
