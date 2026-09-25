import { createServerFn } from '@tanstack/react-start'
import { ID } from 'node-appwrite'
import { z } from 'zod'

import { createAdminClient, createSessionClient } from '#/server/appwrite'
import { isUnauthorized, toUserError } from '#/server/errors'
import {
  clearSessionSecret,
  readSessionSecret,
  writeSessionSecret,
} from '#/server/session'

/**
 * Sign-in, current user and sign-out.
 *
 * These run on the server. The browser calls them over RPC and only ever gets
 * back what a handler returns, never the session secret or the API key.
 */

export type CurrentUser = {
  id: string
  email: string
}

/**
 * Step one of sign-in. New and returning people take the same path: for a new
 * email Appwrite creates the user, for a known one it ignores our generated id
 * and answers with the existing user's id.
 */
export const sendCode = createServerFn({ method: 'POST' })
  .validator(z.object({ email: z.email().max(254) }))
  .handler(async ({ data }) => {
    const { account } = createAdminClient()

    try {
      const token = await account.createEmailToken({
        userId: ID.unique(),
        email: data.email,
      })

      return { userId: token.userId }
    } catch (error) {
      throw toUserError(error, 'Could not send a code. Try again.')
    }
  })

/**
 * Step two: trade the emailed code for a session. The session is created with
 * the admin client because only an API-key response includes the secret, and
 * that secret goes straight into the httpOnly cookie.
 */
export const verifyCode = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      userId: z.string().min(1).max(36),
      code: z
        .string()
        .trim()
        .regex(/^\d{6}$/, 'The code is 6 digits.'),
    }),
  )
  .handler(async ({ data }) => {
    const { account } = createAdminClient()

    try {
      const session = await account.createSession({
        userId: data.userId,
        secret: data.code,
      })

      writeSessionSecret(session.secret, new Date(session.expire))
    } catch (error) {
      throw toUserError(error, 'Could not sign you in. Try again.')
    }
  })

/**
 * Who is signed in, or null.
 *
 * Only a 401 from Appwrite means the session is gone, so only then is the
 * cookie deleted. Any other failure (network, Appwrite down) is rethrown: it
 * says nothing about the session, and signing people out for it would be wrong.
 */
export const getCurrentUser = createServerFn({ method: 'GET' }).handler(
  async (): Promise<CurrentUser | null> => {
    const secret = readSessionSecret()
    if (!secret) {
      return null
    }

    try {
      const user = await createSessionClient(secret).account.get()

      return { id: user.$id, email: user.email }
    } catch (error) {
      if (isUnauthorized(error)) {
        clearSessionSecret()
        return null
      }

      throw toUserError(error, 'Could not load your account. Try again.')
    }
  },
)

/**
 * Ends the session in Appwrite, not only in this browser, then drops the
 * cookie. A session Appwrite already considers gone is not an error here.
 */
export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const secret = readSessionSecret()

  if (secret) {
    try {
      await createSessionClient(secret).account.deleteSession({
        sessionId: 'current',
      })
    } catch (error) {
      if (!isUnauthorized(error)) {
        console.error(error)
      }
    }
  }

  clearSessionSecret()
})
