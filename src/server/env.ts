import '@tanstack/react-start/server-only'

import { z } from 'zod'

/**
 * Server configuration, read from `.env`.
 *
 * Validated on first use rather than at import, so a missing value fails the
 * request that needs it with a clear message instead of crashing the dev server.
 */
const envSchema = z.object({
  APPWRITE_ENDPOINT: z.url(),
  APPWRITE_PROJECT_ID: z.string().min(1),
  APPWRITE_API_KEY: z.string().min(1),
  APPWRITE_FUNCTION_ID: z.string().min(1),
})

export type ServerEnv = z.infer<typeof envSchema>

let cached: ServerEnv | undefined

export function serverEnv(): ServerEnv {
  if (cached) {
    return cached
  }

  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join('.'))
    throw new Error(`Invalid server environment: ${missing.join(', ')}`)
  }

  cached = parsed.data
  return cached
}
