import { queryOptions } from '@tanstack/react-query'

import { getPersonalAccount } from './functions'

export const personalAccountQuery = queryOptions({
  queryKey: ['personal-account'],
  queryFn: () => getPersonalAccount(),
})
