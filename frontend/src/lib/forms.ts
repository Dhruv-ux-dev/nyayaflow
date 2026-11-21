import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

import { ApiError, errorMessage } from './api'

/**
 * Maps server-side field errors onto the form (e.g. "parties[0].name" -> "parties.0.name") and
 * returns the overall message to show above the form.
 */
export function applyServerErrors<T extends FieldValues>(error: unknown, setError?: UseFormSetError<T>) {
  if (error instanceof ApiError && setError) {
    for (const violation of error.fieldErrors) {
      const path = violation.field.replace(/\[(\d+)\]/g, '.$1') as Path<T>
      const message = violation.message.charAt(0).toUpperCase() + violation.message.slice(1)
      setError(path, { type: 'server', message })
    }
  }
  return errorMessage(error)
}

/** react-hook-form rule for required text that is not just whitespace. */
export const requiredText = (message: string) => ({
  validate: (value: unknown) => (typeof value === 'string' && value.trim().length > 0) || message,
})
