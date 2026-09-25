import type { QueryClient } from '@tanstack/react-query'
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'

import { personalAccountQuery } from '#/account/queries'
import { currentUserQuery } from '#/auth/queries'
import { Header } from '#/components/Header'

import appCss from '../styles.css?url'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  // Runs on the server for the first request, so every page, and the header,
  // renders already knowing who is signed in and what their name is.
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQuery)

    if (user) {
      // The name is for the header only. If it cannot load, the header falls
      // back to the email address rather than failing the whole page.
      await context.queryClient
        .ensureQueryData(personalAccountQuery)
        .catch(() => null)
    }

    return { user }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'HAUZ' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Header />
        {children}
        <Scripts />
      </body>
    </html>
  )
}
