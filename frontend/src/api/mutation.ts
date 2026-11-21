import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { errorMessage } from '@/lib/api'

interface ActionOptions<TResult> {
  /** Toast shown on success. */
  success?: string | ((result: TResult) => string)
  /** Show failures as a toast (forms usually render them inline instead). */
  toastErrors?: boolean
}

/**
 * A write to the API. On success every cached query is marked stale, so whatever is on screen
 * (case, lists, dashboard, notification badge) refreshes with the server's view of the change.
 */
export function useAction<TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
  options: ActionOptions<TResult> = {},
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries()
      if (options.success) {
        toast.success(typeof options.success === 'function' ? options.success(result) : options.success)
      }
    },
    onError: (error) => {
      if (options.toastErrors) toast.error(errorMessage(error))
    },
  })
}
