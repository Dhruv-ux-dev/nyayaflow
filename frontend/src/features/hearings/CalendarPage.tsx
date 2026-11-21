import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight, List } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useCourts, useDirectory } from '@/api/admin'
import { useHearingCalendar } from '@/api/hearings'
import { useCurrentUser } from '@/auth/AuthContext'
import { can } from '@/auth/roles'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState } from '@/components/ui/feedback'
import { Select } from '@/components/ui/form'
import { PageHeader, Panel } from '@/components/ui/panel'
import { CauseList } from '@/features/dashboard/CauseList'
import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/format'
import { useDocumentTitle } from '@/lib/hooks'
import type { Hearing } from '@/lib/types'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const chipTone = (hearing: Hearing) =>
  hearing.outcomePending
    ? 'bg-danger-soft text-danger'
    : hearing.status === 'SCHEDULED'
      ? 'bg-brand-soft text-brand-strong'
      : hearing.status === 'CANCELLED'
        ? 'bg-sunken text-faint line-through'
        : 'bg-sunken text-ink-soft'

export default function CalendarPage() {
  useDocumentTitle('Calendar')
  const user = useCurrentUser()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState(() => new Date())
  const [judgeId, setJudgeId] = useState('')
  const [courtroomId, setCourtroomId] = useState('')
  const { data: judges } = useDirectory('JUDGE', can.viewDirectory(user.role) && user.role !== 'JUDGE')
  const { data: courts } = useCourts()

  const { gridStart, gridEnd, days } = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    const list: Date[] = []
    for (let day = start; day <= end; day = addDays(day, 1)) list.push(day)
    return { gridStart: start, gridEnd: end, days: list }
  }, [month])

  const { data, error, refetch, isFetching } = useHearingCalendar(format(gridStart, 'yyyy-MM-dd'), format(gridEnd, 'yyyy-MM-dd'), {
    judgeId: judgeId ? Number(judgeId) : undefined,
    courtroomId: courtroomId ? Number(courtroomId) : undefined,
  })
  const byDay = useMemo(() => {
    const map = new Map<string, Hearing[]>()
    for (const hearing of data ?? []) {
      const key = hearing.scheduledAt.slice(0, 10)
      map.set(key, [...(map.get(key) ?? []), hearing])
    }
    return map
  }, [data])
  const selectedHearings = byDay.get(format(selected, 'yyyy-MM-dd')) ?? []

  const go = (next: Date) => {
    setMonth(startOfMonth(next))
    setSelected(next)
  }

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Listings by day. Select a day to see its cause list."
        actions={
          <Button asChild>
            <Link to="/hearings">
              <List />
              List view
            </Link>
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <section className="min-w-0 rounded-lg border border-line bg-surface" aria-label="Month">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <h2 className="mr-auto font-serif text-[1.35rem] font-medium text-ink">{format(month, 'MMMM yyyy')}</h2>
            {judges && (
              <Select value={judgeId} onChange={(e) => setJudgeId(e.target.value)} aria-label="Filter by judge" className="w-44">
                <option value="">All judges</option>
                {judges.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.fullName}
                  </option>
                ))}
              </Select>
            )}
            <Select value={courtroomId} onChange={(e) => setCourtroomId(e.target.value)} aria-label="Filter by courtroom" className="w-44">
              <option value="">All courtrooms</option>
              {courts?.map((court) => (
                <optgroup key={court.id} label={court.name}>
                  {court.courtrooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
            <div className="flex items-center gap-1">
              <Button size="icon-sm" variant="ghost" aria-label="Previous month" onClick={() => go(subMonths(month, 1))}>
                <ChevronLeft />
              </Button>
              <Button size="sm" onClick={() => go(new Date())}>
                Today
              </Button>
              <Button size="icon-sm" variant="ghost" aria-label="Next month" onClick={() => go(addMonths(month, 1))}>
                <ChevronRight />
              </Button>
            </div>
          </div>
          {error ? (
            <ErrorState error={error} onRetry={() => refetch()} />
          ) : (
            <div className={cn('overflow-x-auto transition-opacity', isFetching && 'opacity-70')}>
              <div className="grid min-w-[680px] grid-cols-7">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="border-b border-line px-2 py-2 text-xs font-medium text-muted">
                    {day}
                  </div>
                ))}
                {days.map((day) => {
                  const key = format(day, 'yyyy-MM-dd')
                  const items = byDay.get(key) ?? []
                  const inMonth = isSameMonth(day, month)
                  const isSelected = isSameDay(day, selected)
                  const sunday = day.getDay() === 0
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelected(day)}
                      aria-pressed={isSelected}
                      aria-label={`${format(day, 'EEEE d MMMM')}, ${items.length} hearing${items.length === 1 ? '' : 's'}`}
                      className={cn(
                        'flex min-h-[108px] flex-col items-stretch gap-1 border-r border-b border-line p-1.5 text-left transition-colors [&:nth-child(7n)]:border-r-0',
                        !inMonth && 'bg-paper/60',
                        sunday && 'bg-paper',
                        isSelected ? 'bg-brand-soft/50 ring-2 ring-brand ring-inset' : 'hover:bg-paper',
                      )}
                    >
                      <span
                        className={cn(
                          'tabular grid size-6 place-items-center rounded-full text-xs font-medium',
                          isToday(day) ? 'bg-seal text-white' : inMonth ? 'text-ink' : 'text-faint',
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                      {items.slice(0, 3).map((hearing) => (
                        <span key={hearing.id} className={cn('truncate rounded px-1.5 py-0.5 text-[11px] leading-tight', chipTone(hearing))}>
                          <span className="tabular font-semibold">{formatTime(hearing.scheduledAt)}</span> {hearing.courtCase.caseNumber}
                        </span>
                      ))}
                      {items.length > 3 && <span className="px-1.5 text-[11px] font-medium text-muted">{items.length - 3} more</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        <Panel
          title={format(selected, 'EEEE d MMMM')}
          description={selectedHearings.length ? `${selectedHearings.length} listing${selectedHearings.length === 1 ? '' : 's'}` : undefined}
          className="self-start"
        >
          {selectedHearings.length === 0 ? (
            <EmptyState title={selected.getDay() === 0 ? 'Courts do not sit on Sundays' : 'Nothing listed on this day'} className="py-10" />
          ) : (
            <CauseList hearings={selectedHearings} showJudge={user.role !== 'JUDGE'} />
          )}
        </Panel>
      </div>
      <p className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-brand-soft ring-1 ring-brand/30" aria-hidden="true" /> Scheduled
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-danger-soft ring-1 ring-danger/30" aria-hidden="true" /> Outcome pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-sunken ring-1 ring-line-strong" aria-hidden="true" /> Held or cancelled
        </span>
      </p>
    </>
  )
}

