import '@tanstack/react-start/server-only'

import { AppwriteException } from 'node-appwrite'

/**
 * Appwrite error messages are written for developers and can mention internals.
 * Server functions send their errors to the browser, so only these short,
 * user-facing messages cross that line. The full error stays in the server log.
 */

export function isUnauthorized(error: unknown) {
  return error instanceof AppwriteException && error.code === 401
}

export function toUserError(error: unknown, fallback: string): Error {
  if (error instanceof AppwriteException) {
    if (error.code === 429) {
      return new Error('Too many attempts. Wait a minute and try again.')
    }
    if (error.type === 'user_invalid_token' || error.code === 401) {
      return new Error('That code is wrong or has expired. Request a new one.')
    }
  }

  console.error(error)
  return new Error(fallback)
}
