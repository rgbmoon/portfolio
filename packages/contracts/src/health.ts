import * as z from 'zod'

/** Response body of `GET /api/v1/health`. */
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  uptimeSeconds: z.number().nonnegative(),
})

export type HealthResponse = z.infer<typeof healthResponseSchema>
