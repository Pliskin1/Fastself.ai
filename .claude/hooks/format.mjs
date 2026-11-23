#!/usr/bin/env node
// PostToolUse hook for Edit|Write: formats the touched file with the repo's Prettier. Silent and never blocking.
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, relative, extname } from 'node:path';

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}
const file = input.tool_input?.file_path;
if (!file || !existsSync(file)) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const rel = relative(root, file);
if (rel.startsWith('..') || /^(docs\/reference|node_modules|ios|android|\.expo)\//.test(rel)) process.exit(0);

const exts = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.md', '.yaml', '.yml', '.css']);
if (!exts.has(extname(file))) process.exit(0);

const win = process.platform === 'win32';
const prettier = join(root, 'node_modules', '.bin', win ? 'prettier.cmd' : 'prettier');
if (!existsSync(prettier)) process.exit(0); // before pnpm install
const opts = { cwd: root, timeout: 20000 };
if (win) spawnSync(`"${prettier}" --write --log-level silent "${file}"`, { ...opts, shell: true });
else spawnSync(prettier, ['--write', '--log-level', 'silent', file], opts);
process.exit(0);
