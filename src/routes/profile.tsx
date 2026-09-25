import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'

import { updatePersonalAccount } from '#/account/functions'
import { personalAccountQuery } from '#/account/queries'
import {
  ROLE_LABELS,
  type PersonalAccount,
  type UpdateAccountInput,
} from '#/account/schema'

export const Route = createFileRoute('/profile')({
  beforeLoad: async ({ context, location }) => {
    // Sign in, then come back here.
    if (!context.user) {
      throw redirect({ to: '/sign-in', search: { redirect: location.href } })
    }

    const account = await context.queryClient.ensureQueryData(
      personalAccountQuery,
    )
    if (!account) {
      throw redirect({ to: '/onboarding', search: { redirect: location.href } })
    }
  },
  component: Profile,
})

function Profile() {
  const { data: account } = useQuery(personalAccountQuery)

  // beforeLoad has already made sure there is one.
  if (!account) {
    return null
  }

  return (
    <main>
      <h1>Your profile</h1>
      <p>
        Role: <strong>{ROLE_LABELS[account.role]}</strong> (set when you joined,
        it cannot be changed)
      </p>
      <ProfileForm account={account} />
    </main>
  )
}

type FormValues = {
  firstName: string
  lastName: string
  contactEmail: string
  bio: string
}

function toFormValues(account: PersonalAccount): FormValues {
  return {
    firstName: account.firstName,
    lastName: account.lastName,
    contactEmail: account.contactEmail ?? '',
    bio: account.bio ?? '',
  }
}

/**
 * Only what changed is sent. An emptied optional field is sent as null, which
 * is how the Function clears it; an empty string would be rejected. There is
 * no user id: the Function knows who is calling from Appwrite, not the body.
 */
function changedFields(
  account: PersonalAccount,
  values: FormValues,
): UpdateAccountInput {
  const next = {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    contactEmail: values.contactEmail.trim() || null,
    bio: values.bio.trim() || null,
  }

  const changes: UpdateAccountInput = {}
  for (const field of Object.keys(next) as (keyof typeof next)[]) {
    if (next[field] !== account[field]) {
      Object.assign(changes, { [field]: next[field] })
    }
  }

  return changes
}

function ProfileForm({ account }: { account: PersonalAccount }) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState(() => toFormValues(account))

  const changes = changedFields(account, values)
  const hasChanges = Object.keys(changes).length > 0

  const save = useMutation({
    mutationFn: (changes: UpdateAccountInput) =>
      updatePersonalAccount({ data: changes }),
    onSuccess: (updated) => {
      // The header reads the same query, so the new name shows there too.
      queryClient.setQueryData(personalAccountQuery.queryKey, updated)
      setValues(toFormValues(updated))
    },
  })

  function field(name: keyof FormValues) {
    return {
      name,
      value: values[name],
      onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => {
        save.reset()
        setValues((current) => ({ ...current, [name]: event.target.value }))
      },
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (hasChanges) {
          save.mutate(changes)
        }
      }}
    >
      <label>
        First name
        <input
          {...field('firstName')}
          autoComplete="given-name"
          required
          maxLength={100}
        />
      </label>

      <label>
        Last name
        <input
          {...field('lastName')}
          autoComplete="family-name"
          required
          maxLength={100}
        />
      </label>

      <label>
        Contact email (optional)
        <input
          {...field('contactEmail')}
          type="email"
          autoComplete="email"
          maxLength={254}
        />
      </label>

      <label>
        Bio (optional)
        <textarea {...field('bio')} rows={5} maxLength={2000} />
      </label>

      {save.error && (
        <p role="alert" style={{ whiteSpace: 'pre-line' }}>
          {save.error.message}
        </p>
      )}
      {save.isSuccess && <p role="status">Saved.</p>}

      <button type="submit" disabled={!hasChanges || save.isPending}>
        {save.isPending ? 'Saving…' : 'Save'}
      </button>
    </form>
  )
}
