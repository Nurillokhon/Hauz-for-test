import { queryOptions } from '@tanstack/react-query'

import { getCurrentUser } from './functions'

export const currentUserQuery = queryOptions({
  queryKey: ['current-user'],
  queryFn: () => getCurrentUser(),
})
