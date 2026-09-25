import { createServerFn } from '@tanstack/react-start'

import { executePersonalAccount, readAccount } from '#/server/personalAccount'

import {
  createAccountInput,
  updateAccountInput,
  type PersonalAccount,
} from './schema'

/**
 * The signed-in user's Personal Account. All three go through the Function;
 * the web app never touches the personal_accounts table.
 */

/** Null means this person has not onboarded yet, which is normal. */
export const getPersonalAccount = createServerFn({ method: 'GET' }).handler(
  async (): Promise<PersonalAccount | null> => {
    const response = await executePersonalAccount('GET')
    if (response.status === 404) {
      return null
    }

    return readAccount(response)
  },
)

/**
 * Safe to repeat: if the account already exists with the same role, the
 * Function answers 200 with it instead of creating a second one.
 */
export const createPersonalAccount = createServerFn({ method: 'POST' })
  .validator(createAccountInput)
  .handler(async ({ data }): Promise<PersonalAccount> => {
    const response = await executePersonalAccount('POST', data)

    return readAccount(response)
  })

/** Server functions speak GET or POST; the Function itself still gets a PATCH. */
export const updatePersonalAccount = createServerFn({ method: 'POST' })
  .validator(updateAccountInput)
  .handler(async ({ data }): Promise<PersonalAccount> => {
    const response = await executePersonalAccount('PATCH', data)

    return readAccount(response)
  })
