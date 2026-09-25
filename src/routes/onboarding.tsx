import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { z } from 'zod'

import { createPersonalAccount } from '#/account/functions'
import { personalAccountQuery } from '#/account/queries'
import {
  ROLES,
  ROLE_LABELS,
  type CreateAccountInput,
  type Role,
} from '#/account/schema'
import { safeRedirect } from '#/auth/redirect'

export const Route = createFileRoute('/onboarding')({
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  beforeLoad: async ({ context, search }) => {
    if (!context.user) {
      throw redirect({ to: '/sign-in', search: { redirect: search.redirect } })
    }

    // Someone who already has an account skips this.
    const account = await context.queryClient.ensureQueryData(
      personalAccountQuery,
    )
    if (account) {
      throw redirect({ href: safeRedirect(search.redirect) })
    }
  },
  component: Onboarding,
})

function Onboarding() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<Role | ''>('')

  // A second click can land before React re-renders the disabled button, so
  // the guard is a ref, not state. The Function is the real guarantee: its
  // unique index answers a repeat with the same account, never a second one.
  const submitting = useRef(false)

  const create = useMutation({
    mutationFn: (input: CreateAccountInput) =>
      createPersonalAccount({ data: input }),
    onSuccess: (account) => {
      queryClient.setQueryData(personalAccountQuery.queryKey, account)
      navigate({ href: safeRedirect(search.redirect), replace: true })
    },
    onSettled: () => {
      submitting.current = false
    },
  })

  const busy = create.isPending || create.isSuccess

  return (
    <main>
      <h1>Welcome to HAUZ</h1>
      <p>Tell us who you are. You can change your name later.</p>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (submitting.current || role === '') {
            return
          }

          submitting.current = true
          create.mutate({ firstName, lastName, role })
        }}
      >
        <label>
          First name
          <input
            name="firstName"
            autoComplete="given-name"
            required
            maxLength={100}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </label>

        <label>
          Last name
          <input
            name="lastName"
            autoComplete="family-name"
            required
            maxLength={100}
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </label>

        <label>
          I am a
          <select
            name="role"
            required
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
          >
            <option value="" disabled>
              Choose one
            </option>
            {ROLES.map((value) => (
              <option key={value} value={value}>
                {ROLE_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <p>Your role cannot be changed after this step.</p>

        {create.error && <p role="alert">{create.error.message}</p>}

        <button type="submit" disabled={busy}>
          {busy ? 'Creating your account…' : 'Continue'}
        </button>
      </form>
    </main>
  )
}
