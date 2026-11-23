import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['./test/global-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      // Text + JSON only: the HTML reporter writes .js files that the repo-wide ESLint run picks up.
      reporter: ['text', 'json-summary'],
      thresholds: {
        lines: 80,
        'src/rules/**': { lines: 90 },
        'src/plan/**': { lines: 90 },
        'src/meals/**': { lines: 90 },
      },
    },
  },
});
