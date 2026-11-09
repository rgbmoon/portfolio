import * as z from 'zod'

const envSchema = z.object({
  VITE_API_URL: z.url({ protocol: /^https?$/ }),
})

/** Build-time variables of the web app; the module throws on load when a variable is missing or invalid. */
export const env = envSchema.parse(import.meta.env)
