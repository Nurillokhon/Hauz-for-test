import '@tanstack/react-start/server-only'

import { Account, Client, Functions } from 'node-appwrite'

import { serverEnv } from './env'

/**
 * Two ways the web server talks to Appwrite.
 *
 * - The admin client carries the API key. It is only for the steps where there
 *   is no user yet: sending a sign-in code and turning that code into a session.
 * - The session client acts as one signed-in user. Everything done on behalf of
 *   a person, including executing the Function, goes through it, so Appwrite
 *   sees the real user and injects `x-appwrite-user-id` into the Function.
 *
 * A client must never have both a key and a session: the key would win and
 * every call would run with admin authority instead of as the user.
 */

function baseClient() {
  const env = serverEnv()

  return new Client()
    .setEndpoint(env.APPWRITE_ENDPOINT)
    .setProject(env.APPWRITE_PROJECT_ID)
}

export function createAdminClient() {
  const client = baseClient().setKey(serverEnv().APPWRITE_API_KEY)

  return {
    account: new Account(client),
  }
}

export function createSessionClient(sessionSecret: string) {
  const client = baseClient().setSession(sessionSecret)

  return {
    account: new Account(client),
    functions: new Functions(client),
  }
}
