import * as z from 'zod'

/** Environment variables of the api process. */
export const envSchema = z.object({
  HOST: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65535),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']),
  // The browser compares `Access-Control-Allow-Origin` with the page origin as strings: a path or a trailing slash
  // blocks every response.
  WEB_ORIGIN: z.url({ protocol: /^https?$/ }).refine((value) => new URL(value).origin === value, {
    message: 'Expected an origin without a path or a trailing slash',
  }),
})

export type Env = z.infer<typeof envSchema>

/** Validates the environment for `ConfigModule`; throws with the list of invalid variables, so startup fails. */
export function parseEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config)
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`)
  }
  return result.data
}
