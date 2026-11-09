import * as z from 'zod'

/** Environment variables of the api process. */
export const envSchema = z.object({
  HOST: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65535),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']),
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
