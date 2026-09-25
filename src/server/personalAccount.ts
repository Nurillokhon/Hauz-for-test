import '@tanstack/react-start/server-only'

import { ExecutionMethod } from 'node-appwrite'

import type { PersonalAccount } from '#/account/schema'

import { createSessionClient } from './appwrite'
import { serverEnv } from './env'
import { isUnauthorized, toUserError } from './errors'
import { clearSessionSecret, readSessionSecret } from './session'

/**
 * Calls the personal-account Function as the signed-in user.
 *
 * It goes through the session client, so Appwrite itself tells the Function who
 * is calling (`x-appwrite-user-id`). Nothing here sends a user id.
 */

type FunctionResponse = {
  status: number
  body: unknown
}

type FunctionErrorBody = {
  error?: string
  message?: string
  issues?: { field: string; message: string }[]
}

const SIGNED_OUT = 'Your session has ended. Sign in again.'

export async function executePersonalAccount(
  method: 'GET' | 'POST' | 'PATCH',
  body?: unknown,
): Promise<FunctionResponse> {
  const secret = readSessionSecret()
  if (!secret) {
    throw new Error(SIGNED_OUT)
  }

  try {
    const execution = await createSessionClient(
      secret,
    ).functions.createExecution({
      functionId: serverEnv().APPWRITE_FUNCTION_ID,
      xpath: '/personal-account',
      method: ExecutionMethod[method],
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
      async: false,
    })

    return {
      status: execution.responseStatusCode,
      body: parseJson(execution.responseBody),
    }
  } catch (error) {
    // Appwrite refuses to run the Function for an expired or revoked session.
    if (isUnauthorized(error)) {
      clearSessionSecret()
      throw new Error(SIGNED_OUT)
    }

    throw toUserError(error, 'Could not reach your account. Try again.')
  }
}

/** The account from a successful answer, or a user-facing error for any other. */
export function readAccount(response: FunctionResponse): PersonalAccount {
  if (response.status === 200 || response.status === 201) {
    return response.body as PersonalAccount
  }

  throw toFunctionError(response)
}

function toFunctionError({ status, body }: FunctionResponse): Error {
  const detail = (body ?? {}) as FunctionErrorBody

  if (status === 401) {
    clearSessionSecret()
    return new Error(SIGNED_OUT)
  }

  if (status === 400 && detail.issues?.length) {
    const lines = detail.issues.map((issue) =>
      issue.field ? `${issue.field}: ${issue.message}` : issue.message,
    )
    return new Error(lines.join('\n'))
  }

  // 404 and 409 carry messages written for the caller. Anything else,
  // including a crashed or timed-out execution, gets a generic one.
  if ((status === 404 || status === 409) && detail.message) {
    return new Error(detail.message)
  }

  console.error('personal-account Function answered', status, body)
  return new Error('Something went wrong with your account. Try again.')
}

function parseJson(text: string): unknown {
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
