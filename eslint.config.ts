import path from 'node:path'

import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import { createConfig as createBoundariesConfig } from 'eslint-plugin-boundaries/config'
import { importX } from 'eslint-plugin-import-x'
import tseslint from 'typescript-eslint'

const PROCESS_ENV_MESSAGE = 'Read environment variables only in the config module (CLAUDE.md section 5.2).'

export default defineConfig(
  globalIgnores(['**/dist/', '**/coverage/']),
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [js.configs.recommended, tseslint.configs.strictTypeChecked],
    plugins: { 'import-x': importX },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver()],
      // Monorepo packages and own modules form the internal import group (CLAUDE.md section 11.8).
      'import-x/internal-regex': '^(@portfolio/|#src/)',
    },
    rules: {
      'no-console': 'error',
      'no-restricted-properties': ['error', { object: 'process', property: 'env', message: PROCESS_ENV_MESSAGE }],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'node:process', importNames: ['env'], message: PROCESS_ENV_MESSAGE },
            { name: 'process', importNames: ['env'], message: PROCESS_ENV_MESSAGE },
          ],
        },
      ],
      // A block that sets this rule again replaces it entirely and must repeat this pattern (CLAUDE.md section 11.7).
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^\\.\\./',
              message:
                'Import own modules through #src/*; relative paths only for sibling and child files (CLAUDE.md section 11.8).',
            },
          ],
        },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'import-x/no-cycle': ['error', { ignoreExternal: true }],
      'import-x/no-default-export': 'error',
      'import-x/no-extraneous-dependencies': [
        'error',
        { devDependencies: ['**/tests/**', '**/e2e/**', '**/*.config.ts'] },
      ],
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [{ pattern: 'react', group: 'external', position: 'before' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
  {
    files: ['**/*.config.ts'],
    rules: { 'import-x/no-default-export': 'off' },
  },
  // api module boundaries (CLAUDE.md section 5.1): a module and the entry files import another module only through its
  // `index.ts`; any module may import `shared`.
  createBoundariesConfig({
    files: ['apps/api/src/**/*.ts'],
    settings: {
      'boundaries/root-path': path.join(import.meta.dirname, 'apps/api'),
      // Order matters: the first matching element wins, so `shared` precedes the `src/*` pattern.
      'boundaries/elements': [
        { type: 'shared', pattern: 'src/shared' },
        { type: 'module', pattern: 'src/*', capture: ['name'] },
      ],
      'boundaries/files': [{ category: 'entry', pattern: ['src/main.ts', 'src/app.module.ts'] }],
      // Workspace packages resolve through symlinks to `packages/*`, outside the root path.
      'boundaries/flag-as-external': { outsideRootPath: true },
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: [{ element: { type: 'module' } }, { file: { categories: 'entry' } }],
              allow: [
                { to: { element: { type: 'shared' } } },
                { to: { element: { type: 'module', fileInternalPath: 'index.ts' } } },
              ],
            },
            { from: [{ file: { categories: 'entry' } }], allow: [{ to: { file: { categories: 'entry' } } }] },
          ],
        },
      ],
      'boundaries/no-unknown-dependencies': 'error',
    },
  }),
  {
    files: ['apps/api/src/**/*.ts'],
    // The boundaries plugin resolves imports through the legacy resolver setting; the default one ignores `#src/*`.
    settings: { 'import/resolver': { typescript: true } },
  },
  {
    files: ['apps/api/src/**/*.module.ts'],
    // A Nest module is an empty class: `@Module` stores the configuration, and Nest uses the class as the DI key.
    rules: { '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }] },
  },
)
