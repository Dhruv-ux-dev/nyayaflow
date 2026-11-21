import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
} from 'date-fns'

/** Accepts ISO dates, local date-times and instants. Local values are shown as entered (court time). */
function toDate(value: string | Date) {
  return typeof value === 'string' ? parseISO(value) : value
}

export function formatDate(value: string | Date | null | undefined) {
  return value ? format(toDate(value), 'd MMM yyyy') : '—'
}

export function formatShortDate(value: string | Date) {
  return format(toDate(value), 'd MMM')
}

export function formatDateTime(value: string | Date | null | undefined) {
  return value ? format(toDate(value), "EEE d MMM yyyy, HH:mm") : '—'
}

export function formatTime(value: string | Date) {
  return format(toDate(value), 'HH:mm')
}

export function formatWeekday(value: string | Date) {
  return format(toDate(value), 'EEE d MMM')
}

/** "Today", "Tomorrow", "in 4 days", "3 days ago". */
export function relativeDay(value: string | Date) {
  const date = toDate(value)
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  if (isYesterday(date)) return 'Yesterday'
  const days = differenceInCalendarDays(date, new Date())
  return days > 0 ? `in ${days} days` : `${-days} days ago`
}

export function timeAgo(value: string | Date) {
  const date = toDate(value)
  const seconds = (Date.now() - date.getTime()) / 1000
  if (seconds < 60) return 'just now'
  return `${formatDistanceToNowStrict(date)} ago`
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Splits a case title on " v. " so the "v." can be set in legal-citation italics. */
export function splitCaseTitle(title: string): [string, string] | null {
  const match = title.match(/^(.*?)\s+vs?\.\s+(.*)$/i)
  return match ? [match[1], match[2]] : null
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

/** Value for <input type="datetime-local"> from a local date-time string. */
export function toInputDateTime(value: string) {
  return value.slice(0, 16)
}

export function todayIso() {
  return format(new Date(), 'yyyy-MM-dd')
}
