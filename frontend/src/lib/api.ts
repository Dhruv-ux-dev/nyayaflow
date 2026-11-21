import type { LoginResponse } from './types'

export interface FieldViolation {
  field: string
  message: string
}

/** Error raised for any failed API call, carrying the server's stable error code. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: FieldViolation[]
  readonly details: unknown

  constructor(status: number, code: string, message: string, fieldErrors: FieldViolation[] = [], details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
    this.details = details
  }
}

export function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  return 'Something went wrong. Please try again.'
}

// ---------------------------------------------------------------- session storage

const SESSION_KEY = 'nyayaflow.session'

export interface StoredSession {
  token: string
  expiresAt: string
}

export const sessionStore = {
  get(): StoredSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (!raw) return null
      const session = JSON.parse(raw) as StoredSession
      return new Date(session.expiresAt).getTime() > Date.now() ? session : null
    } catch {
      return null
    }
  },
  set(response: LoginResponse) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token: response.token, expiresAt: response.expiresAt }))
  },
  clear() {
    localStorage.removeItem(SESSION_KEY)
  },
}

let unauthorizedHandler: ((code: string) => void) | null = null

/** Registered by the auth provider: called when the server rejects the current session. */
export function setUnauthorizedHandler(handler: ((code: string) => void) | null) {
  unauthorizedHandler = handler
}

// ---------------------------------------------------------------- requests

type QueryValue = string | number | boolean | null | undefined | Array<string | number>
export type Query = Record<string, QueryValue>

function buildUrl(path: string, query?: Query) {
  const params = new URLSearchParams()
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue
      if (Array.isArray(value)) {
        if (value.length) params.set(key, value.join(','))
      } else {
        params.set(key, String(value))
      }
    }
  }
  const search = params.toString()
  return `/api${path}${search ? `?${search}` : ''}`
}

async function send(method: string, path: string, init: { query?: Query; body?: unknown; form?: FormData } = {}) {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const session = sessionStore.get()
  if (session) headers.Authorization = `Bearer ${session.token}`
  let body: BodyInit | undefined
  if (init.form) {
    body = init.form
  } else if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(init.body)
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, init.query), { method, headers, body })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the NyayaFlow server. Check your connection and try again.')
  }

  if (!response.ok) {
    let payload: { code?: string; message?: string; fieldErrors?: FieldViolation[]; details?: unknown } = {}
    try {
      payload = await response.json()
    } catch {
      // non-JSON error body (for example from a proxy)
    }
    const code = payload.code ?? `HTTP_${response.status}`
    if (response.status === 401 && path !== '/auth/login') {
      unauthorizedHandler?.(code)
    }
    throw new ApiError(
      response.status,
      code,
      payload.message ?? fallbackMessage(response.status),
      payload.fieldErrors ?? [],
      payload.details,
    )
  }
  return response
}

function fallbackMessage(status: number) {
  if (status === 403) return 'You do not have permission to perform this action.'
  if (status === 404) return 'The requested record was not found.'
  if (status === 413) return 'The file is too large to upload.'
  if (status === 502 || status === 503 || status === 504) return 'The NyayaFlow server is not responding. Please try again shortly.'
  if (status >= 500) return 'The server ran into a problem. Please try again shortly.'
  return 'The request could not be completed.'
}

async function json<T>(method: string, path: string, init?: { query?: Query; body?: unknown; form?: FormData }) {
  const response = await send(method, path, init)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export const api = {
  get: <T>(path: string, query?: Query) => json<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown) => json<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown) => json<T>('PUT', path, { body }),
  delete: <T = void>(path: string) => json<T>('DELETE', path),
  upload: <T>(path: string, form: FormData) => json<T>('POST', path, { form }),

  /** Fetches a protected file with the session token and returns it as a blob. */
  async blob(path: string, query?: Query) {
    const response = await send('GET', path, { query })
    const disposition = response.headers.get('Content-Disposition') ?? ''
    const match = disposition.match(/filename\*=UTF-8''([^;]+)/) ?? disposition.match(/filename="?([^";]+)"?/)
    return { blob: await response.blob(), filename: match ? decodeURIComponent(match[1]) : 'download' }
  },
}

/** Downloads a protected file (or opens PDFs/images in a new tab). */
export async function downloadFile(path: string, query?: Query, open = false) {
  const { blob, filename } = await api.blob(path, query)
  const url = URL.createObjectURL(blob)
  if (open) {
    window.open(url, '_blank', 'noopener')
  } else {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
