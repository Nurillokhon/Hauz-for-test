import { z } from 'zod'

/**
 * The Personal Account as the Function describes it, and the input rules for
 * creating and editing one. Shared by the server functions and the forms, and
 * kept in step with functions/personal-account/src/validation.js.
 */

export const ROLES = ['property_owner', 'realtor'] as const

export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  property_owner: 'Property Owner',
  realtor: 'Realtor',
}

export type PersonalAccount = {
  personalAccountId: string
  firstName: string
  lastName: string
  role: Role
  contactEmail: string | null
  bio: string | null
  createdAt: string
  updatedAt: string
}

export const createAccountInput = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  role: z.enum(ROLES),
})

export type CreateAccountInput = z.infer<typeof createAccountInput>

/**
 * An omitted field is left as it is; null clears it. There is no role here:
 * it is fixed when the account is created. There is no user id either: the
 * Function takes the caller's identity from Appwrite, never from the body.
 */
export const updateAccountInput = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    contactEmail: z.email().max(254).nullable().optional(),
    bio: z.string().trim().min(1).max(2000).nullable().optional(),
  })
  .refine((fields) => Object.keys(fields).length > 0, {
    message: 'Provide at least one field to update.',
  })

export type UpdateAccountInput = z.infer<typeof updateAccountInput>
