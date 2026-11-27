import { useQueries, useQuery } from '@tanstack/react-query'

import { api, type Query } from '@/lib/api'
import type { Page } from '@/lib/types'

/**
 * Counts for dashboard figures that the dashboard endpoint does not compute. Each one asks the
 * ordinary list endpoint for a single row and reads `totalElements`, so the number is exactly what
 * the user would see by opening that list with the same filters.
 */
export function useCount(path: string, query: Query, enabled = true) {
  return useQuery({
    queryKey: ['count', path, query],
    queryFn: () => api.get<Page<unknown>>(path, { ...query, page: 0, size: 1 }),
    select: (page) => page.totalElements,
    staleTime: 60_000,
    enabled,
  })
}

/** The same count for several filter sets at once, e.g. one per court or per role. */
export function useCounts<K extends string | number>(path: string, entries: Array<{ key: K; query: Query }>, enabled = true) {
  const results = useQueries({
    queries: entries.map((entry) => ({
      queryKey: ['count', path, entry.query],
      queryFn: () => api.get<Page<unknown>>(path, { ...entry.query, page: 0, size: 1 }),
      staleTime: 60_000,
      enabled,
    })),
  })
  const counts = new Map<K, number | undefined>()
  entries.forEach((entry, index) => counts.set(entry.key, results[index]?.data?.totalElements))
  return { counts, loading: results.some((r) => r.isLoading) }
}
