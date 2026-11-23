#!/usr/bin/env node
// PreToolUse hook for Bash.
// 1. Blocks commands that would expose secrets or hit production destructively (exit 2, reason on stderr).
// 2. Wraps plain test commands in only-failures.mjs so Claude sees a short summary instead of thousands of lines.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0); // never break the session on bad input
}
const toolInput = input.tool_input ?? {};
const cmd = String(toolInput.command ?? '').trim();
if (!cmd) process.exit(0);

const block = (why) => {
  process.stderr.write(`Blocked by .claude/hooks/pre-bash.mjs: ${why}\n`);
  process.exit(2);
};

// --- 1. Guards -------------------------------------------------------------
// Real env files and keys. .env.example is fine.
const secretFile = /(^|[\s'"=\/])\.env(\.(local|development|production|test)(\.local)?)?(?=$|[\s'";|&)])|\.p8\b|AuthKey_[A-Z0-9]+|service_role/i;
const reads = /\b(cat|less|more|head|tail|grep|rg|sed|awk|bat|strings|xxd|base64|cp|scp|curl|source|\.)\b|printenv|\benv\b\s*$/;
if (secretFile.test(cmd) && reads.test(cmd)) block('reading or copying secret files (.env, .p8, service role) is not allowed. Ask a human.');
if (/\bprintenv\b|^\s*env\s*$|echo\s+["']?\$\{?[A-Z_]*(KEY|SECRET|TOKEN|PASSWORD)/.test(cmd)) block('printing secrets from the environment is not allowed.');

// Production and irreversible actions are human-only.
if (/\bsupabase\s+db\s+reset\b.*--linked/.test(cmd)) block('`supabase db reset --linked` wipes the remote database. Never run it.');
// The prod project ref is written by a human into .claude/prod-project-ref.txt (a ref is not a secret).
let prodRef = '';
try {
  prodRef = readFileSync(join(process.env.CLAUDE_PROJECT_DIR || input.cwd || '.', '.claude', 'prod-project-ref.txt'), 'utf8').trim();
} catch {}
if ((prodRef && cmd.includes(prodRef)) || /\bfastself-prod\b/.test(cmd) || /--project-ref\s+\S*prod/i.test(cmd))
  block('production Supabase is human-only (see CLAUDE.md, "Ask a human").');
if (/\beas\s+submit\b/.test(cmd)) block('`eas submit` is run by a human with the /release-ios skill.');
if (/\bgit\s+push\b.*(\s--force\b|\s-f\b|\s--force-with-lease\b)/.test(cmd)) block('force push is not allowed.');
if (/\bgit\s+push\b.*\bmain\b/.test(cmd)) block('push to a t/<task> branch and open a PR; main is protected.');
if (/\brm\s+-[a-z]*r[a-z]*f?\b.*(\s|^)(\/|~|\.|\.git|packages|apps|supabase|docs)(\/)?(\s|$)/.test(cmd)) block('recursive delete of a top-level folder. Delete specific files instead.');

// --- 2. Quiet tests ----------------------------------------------------------
// Only wrap a single plain test command: no pipes, chains, redirects or subshells.
const plain = !/[|;&><`]|\$\(/.test(cmd);
const testCmd = /^(pnpm\s+(test(:core|:app)?|vitest|jest)\b|pnpm\s+--filter\s+\S+\s+(test|vitest|jest)\b|npx\s+(vitest|jest)\b|deno\s+test\b|supabase\s+test\s+db\b|maestro\s+test\b)/;
if (plain && testCmd.test(cmd) && !cmd.includes('only-failures.mjs')) {
  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const wrapper = join(root, '.claude', 'hooks', 'only-failures.mjs').replace(/\\/g, '/'); // Windows-safe in Git Bash
  const wrapped = `node "${wrapper}" -- ${cmd}`;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason: 'test command, output summarised by only-failures.mjs',
        updatedInput: { ...toolInput, command: wrapped },
      },
    }),
  );
}
process.exit(0);
