import { useSyncExternalStore } from 'react'

/**
 * Cases this person opened recently, remembered in this browser only. The API has no record of
 * case views, so this list is device-local and labelled as such wherever it is shown.
 */
export interface RecentCase {
  id: number
  caseNumber: string
  title: string
  openedAt: string
}

const KEY = 'nyayaflow.recentCases'
const LIMIT = 8
const listeners = new Set<() => void>()
let cache: { key: string; value: RecentCase[] } | null = null

function storageKey(userId: number) {
  return `${KEY}.${userId}`
}

function read(userId: number): RecentCase[] {
  const key = storageKey(userId)
  if (cache?.key === key) return cache.value
  let value: RecentCase[] = []
  try {
    const raw = localStorage.getItem(key)
    value = raw ? (JSON.parse(raw) as RecentCase[]) : []
  } catch {
    value = []
  }
  cache = { key, value }
  return value
}

export function rememberCase(userId: number, entry: Omit<RecentCase, 'openedAt'>) {
  const next = [{ ...entry, openedAt: new Date().toISOString() }, ...read(userId).filter((c) => c.id !== entry.id)].slice(0, LIMIT)
  cache = { key: storageKey(userId), value: next }
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(next))
  } catch {
    // storage unavailable (private mode); the list simply is not remembered
  }
  listeners.forEach((listener) => listener())
}

export function useRecentCases(userId: number) {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => read(userId),
  )
}
