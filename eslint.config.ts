import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
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
)
