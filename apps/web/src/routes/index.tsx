import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { env } from '#src/config.ts'
import { healthResponseSchema } from '@portfolio/contracts/health'
import type { HealthResponse } from '@portfolio/contracts/health'

/** Requests the api health endpoint and validates the body against the contract. */
const fetchHealth = async (signal: AbortSignal): Promise<HealthResponse> => {
  const response = await fetch(new URL('/api/v1/health', env.VITE_API_URL), { signal, credentials: 'include' })
  if (!response.ok) throw new Error(`Health request failed with status ${String(response.status)}`)
  return healthResponseSchema.parse(await response.json())
}

const HomePage = () => {
  // The query runs in the browser after hydration; the server renders the pending state.
  const health = useQuery({ queryKey: ['health'], queryFn: ({ signal }) => fetchHealth(signal) })

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">Portfolio</h1>
      <p className="mt-4">
        {health.isPending && 'Checking the api…'}
        {health.isError && `api is unavailable: ${health.error.message}`}
        {health.isSuccess && `api status: ${health.data.status}, uptime ${health.data.uptimeSeconds.toFixed(0)} s`}
      </p>
    </main>
  )
}

export const Route = createFileRoute('/')({ component: HomePage })
