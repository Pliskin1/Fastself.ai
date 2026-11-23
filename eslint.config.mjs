import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.expo/**',
      '**/ios/**',
      '**/android/**',
      'supabase/functions/_shared/core.js',
      'docs/**',
      '**/*.html',
      'e2e/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['apps/mobile/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'warn', 'no-console': 'error' },
  },
  { files: ['apps/mobile/plugins/**'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
  { files: ['packages/core/scripts/**'], rules: { 'no-console': 'off' } },
);
