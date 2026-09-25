import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useRouter } from '@tanstack/react-router'

import { personalAccountQuery } from '#/account/queries'
import { logout } from '#/auth/functions'
import { currentUserQuery } from '#/auth/queries'

/**
 * Both queries are already in the cache when this renders: the root route's
 * beforeLoad fills them on the server, so the first HTML already shows the
 * right state. Reading them as queries (not route context) keeps the name
 * current after the profile is edited.
 */
export function Header() {
  const { data: user } = useQuery(currentUserQuery)
  const { data: account } = useQuery({
    ...personalAccountQuery,
    enabled: Boolean(user),
  })

  return (
    <header>
      <nav>
        <Link to="/">HAUZ</Link>
        {user ? (
          <span>
            {/* Signed in but not onboarded yet: there is no name to show. */}
            <span>{account?.firstName ?? user.email}</span>{' '}
            <LogoutButton />
          </span>
        ) : (
          <SignInLink />
        )}
      </nav>
    </header>
  )
}

function SignInLink() {
  const location = useLocation()

  // Come back to this page after signing in, unless this page is sign-in.
  const redirect = location.pathname === '/sign-in' ? undefined : location.href

  return (
    <Link to="/sign-in" search={{ redirect }}>
      Sign in
    </Link>
  )
}

function LogoutButton() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const signOut = useMutation({
    mutationFn: () => logout(),
    onSuccess: async () => {
      // Drop everything cached for this person, so none of it shows after.
      queryClient.clear()
      await router.navigate({ to: '/' })
      await router.invalidate()
    },
  })

  return (
    <>
      <button
        type="button"
        disabled={signOut.isPending}
        onClick={() => signOut.mutate()}
      >
        {signOut.isPending ? 'Logging out…' : 'Log out'}
      </button>
      {signOut.error && <span role="alert"> {signOut.error.message}</span>}
    </>
  )
}
