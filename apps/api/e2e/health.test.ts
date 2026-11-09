import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'

import { afterAll, beforeAll, expect, test } from 'vitest'

import { healthResponseSchema } from '@portfolio/contracts/health'

const READY_ATTEMPTS = 100
const READY_INTERVAL_MS = 50

let api: ChildProcess
let baseUrl: string

beforeAll(async () => {
  const port = await getFreePort()
  baseUrl = `http://127.0.0.1:${String(port)}`
  // An explicit environment: the test does not read the developer's `.env`.
  api = spawn(process.execPath, ['--enable-source-maps', 'dist/main.js'], {
    env: { HOST: '127.0.0.1', PORT: String(port), LOG_LEVEL: 'warn' },
    stdio: ['ignore', 'inherit', 'inherit'],
  })
  await waitForApi()
})

afterAll(async () => {
  api.kill('SIGTERM')
  await once(api, 'exit')
})

test('GET /api/v1/health returns a body that matches the contract', async () => {
  const response = await fetch(`${baseUrl}/api/v1/health`)

  expect(response.status).toBe(200)
  expect(healthResponseSchema.safeParse(await response.json()).error).toBeUndefined()
})

/** Returns a TCP port that is free at the moment of the call. */
async function getFreePort(): Promise<number> {
  const server = createServer().listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  server.close()
  if (address === null || typeof address === 'string') throw new Error('Expected a TCP address')
  return address.port
}

/** Polls the health endpoint until the api process accepts connections. */
async function waitForApi(): Promise<void> {
  for (let attempt = 0; attempt < READY_ATTEMPTS; attempt++) {
    if (api.exitCode !== null) throw new Error(`The api process exited with code ${String(api.exitCode)}`)
    try {
      await fetch(`${baseUrl}/api/v1/health`)
      return
    } catch {
      await delay(READY_INTERVAL_MS)
    }
  }
  throw new Error('The api process did not accept connections in time')
}
