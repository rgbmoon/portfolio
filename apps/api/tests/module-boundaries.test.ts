import path from 'node:path'

import { ESLint } from 'eslint'
import type { Linter } from 'eslint'
import { beforeAll, expect, test } from 'vitest'

const REPO_ROOT = path.join(import.meta.dirname, '../../..')
// An existing file of the `config` module: ESLint applies the api blocks of the root config to it, and the TypeScript
// project service reads `apps/api/tsconfig.json` for it. `lintText` replaces its text; the file stays unchanged.
const HOST_FILE = path.join(REPO_ROOT, 'apps/api/src/config/index.ts')
// The test that runs first loads the config through jiti and starts the TypeScript project service (2–3 s locally).
const LINT_TIMEOUT_MS = 30_000

let eslint: ESLint

beforeAll(() => {
  eslint = new ESLint({ cwd: REPO_ROOT })
})

test(
  'an import of an internal file of another module reports boundaries/dependencies',
  { timeout: LINT_TIMEOUT_MS },
  async () => {
    const messages = await lintAsHostFile(`export { HealthController } from '#src/health/health.controller.ts'\n`)

    expect(messages.map(({ ruleId, severity }) => ({ ruleId, severity }))).toEqual([
      { ruleId: 'boundaries/dependencies', severity: 2 },
    ])
  },
)

test('an import through the index.ts of another module reports nothing', { timeout: LINT_TIMEOUT_MS }, async () => {
  // An empty list also rules out a fatal parsing error, which has no rule ID.
  expect(await lintAsHostFile(`export { HealthModule } from '#src/health/index.ts'\n`)).toEqual([])
})

/** Lints `code` as the text of `HOST_FILE` with the repository ESLint config. */
async function lintAsHostFile(code: string): Promise<Linter.LintMessage[]> {
  const results = await eslint.lintText(code, { filePath: HOST_FILE })
  return results.flatMap((result) => result.messages)
}
