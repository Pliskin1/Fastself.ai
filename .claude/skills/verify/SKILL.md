---
name: verify
description: Run before every commit and before saying a task is done. Type-checks, lints and runs the test suites affected by the current changes, then reports only failures.
context: fork
agent: test-runner
background: false
---

Verify the current working tree of the fastself.ai repo.

1. List changed files: `git diff --name-only HEAD` and the untracked files from `git status --porcelain`.
2. Run the suites that match the changed paths, as defined in your instructions (core, app, db, functions, lint).
   Always run `pnpm typecheck` and `pnpm lint`. Skip Maestro unless the arguments say "e2e".
3. Also check, without running anything heavy:
   - no `console.log` added in `apps/mobile/src` or `packages/core/src` (grep the diff);
   - no string literal UI text added in `apps/mobile/src/app/**` or `src/components/**` outside `src/copy/sr/`
     (grep the diff for JSX text between `>` and `<` that contains letters);
   - no `.env`, `.p8`, `ios/` or `android/` file staged.
4. Report in the test-runner format. End with one line: `READY TO COMMIT` or `NOT READY: <the first thing to fix>`.

Arguments: $ARGUMENTS
