#!/usr/bin/env node
// Runs a test command and prints only what Claude needs: the summary on success, the failures on error.
// Usage: node only-failures.mjs -- <command...>   Exit code = the command's exit code.
// Set FULL_OUTPUT=1 to print everything (for debugging the wrapper itself).
import { spawn } from 'node:child_process';

const sep = process.argv.indexOf('--');
const cmd = process.argv.slice(sep + 1).join(' ');
if (!cmd) {
  console.error('only-failures: no command');
  process.exit(1);
}

const child = spawn(cmd, {
  shell: process.platform === 'win32' ? true : '/bin/bash',
  env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' },
});
let out = '';
child.stdout.on('data', (d) => (out += d));
child.stderr.on('data', (d) => (out += d));

const strip = (s) => s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').replace(/\r/g, '');

child.on('close', (code) => {
  const lines = strip(out).split('\n');
  if (process.env.FULL_OUTPUT === '1') {
    console.log(lines.join('\n'));
    process.exit(code ?? 1);
  }
  const MAX = 220;
  let shown;
  if (code === 0) {
    // Summary lines from Vitest, Jest, Deno, pgTAP and Maestro.
    const summary = lines.filter((l) =>
      /(Test Files|Tests:|Test Suites:|Snapshots:|Duration|Time:|passed|ok \||All tests successful|Result: PASS|Flows? Passed|\[Passed\]|Coverage|% Stmts|All files)/i.test(l),
    );
    shown = ['PASS: ' + cmd, ...(summary.length ? summary : lines.slice(-12))];
  } else {
    // Keep failure blocks: each failure marker plus the 25 lines after it.
    const keep = new Set();
    lines.forEach((l, i) => {
      if (/(FAIL|✕|×|● |AssertionError|Expected|Received|Error:|error:|not ok|FAILED|\[Failed\]|panicked|Uncaught|TypeError|ReferenceError|SyntaxError|Cannot find|TS\d{4})/.test(l)) {
        for (let j = Math.max(0, i - 2); j < Math.min(lines.length, i + 25); j++) keep.add(j);
      }
    });
    const blocks = [...keep].sort((a, b) => a - b).map((i) => lines[i]);
    const tail = lines.slice(-15);
    shown = [`FAIL (exit ${code}): ${cmd}`, ...blocks, '--- last lines ---', ...tail];
  }
  if (shown.length > MAX) {
    const dropped = shown.length - MAX;
    shown = [...shown.slice(0, MAX - 15), `... ${dropped} lines omitted; rerun one test file or set FULL_OUTPUT=1 ...`, ...shown.slice(-15)];
  }
  console.log(shown.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n'));
  process.exit(code ?? 1);
});
