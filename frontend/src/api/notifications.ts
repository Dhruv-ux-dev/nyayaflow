import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import type { NotificationItem, Page } from '@/lib/types'

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get<{ count: number }>('/notifications/unread-count'),
    refetchInterval: 30_000,
    select: (data) => data.count,
  })
}

export function useNotifications(query: { unreadOnly?: boolean; page?: number; size?: number }) {
  return useQuery({
    queryKey: ['notifications', 'list', query],
    queryFn: () => api.get<Page<NotificationItem>>('/notifications', { ...query }),
    placeholderData: keepPreviousData,
  })
}

/** Read-state changes only affect notification queries, so they skip the global refresh. */
export function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useMarkAllRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
