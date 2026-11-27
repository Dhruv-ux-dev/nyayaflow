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
import { homeCrumb } from '@/components/layout/navigation'
import { PageHeader, Panel } from '@/components/ui/panel'
import { CauseList } from '@/features/dashboard/CauseList'
import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/format'
import { useDocumentTitle } from '@/lib/hooks'
import type { Hearing } from '@/lib/types'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const chipTone = (hearing: Hearing) =>
  hearing.outcomePending
    ? 'border-l-danger bg-danger-soft text-danger'
    : hearing.status === 'SCHEDULED'
      ? 'border-l-role bg-role-soft text-ink'
      : hearing.status === 'CANCELLED'
        ? 'border-l-line-strong bg-sunken text-faint line-through'
        : 'border-l-success bg-sunken text-ink-soft'

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
        breadcrumbs={[homeCrumb(user.role), { label: 'Calendar' }]}
        title="Calendar"
        description={`${data ? `${data.length} listing${data.length === 1 ? '' : 's'} this view. ` : ''}Select a day to see its cause list.`}
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
        <section className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface shadow-raised" aria-label="Month">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 sm:px-5">
            <h2 className="mr-auto font-serif text-[1.5rem] font-medium text-ink">
              {format(month, 'MMMM')} <span className="text-muted">{format(month, 'yyyy')}</span>
            </h2>
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
                  <div key={day} className="eyebrow border-b border-line bg-ivory px-2 py-2 text-faint">
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
                        'flex min-h-[112px] flex-col items-stretch gap-1 border-r border-b border-line p-1.5 text-left transition-colors [&:nth-child(7n)]:border-r-0',
                        !inMonth && 'bg-paper/70',
                        sunday && 'bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgb(15_27_45/0.025)_6px,rgb(15_27_45/0.025)_12px)]',
                        isSelected ? 'bg-role-soft/50 ring-2 ring-role ring-inset' : 'hover:bg-ivory',
                      )}
                    >
                      <span
                        className={cn(
                          'tabular grid size-6 place-items-center rounded-full text-xs font-medium',
                          isToday(day) ? 'bg-role text-white' : inMonth ? 'text-ink' : 'text-faint',
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                      {items.slice(0, 3).map((hearing) => (
                        <span key={hearing.id} className={cn('truncate rounded-[4px] border-l-2 px-1.5 py-0.5 text-[11px] leading-tight', chipTone(hearing))}>
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
          className="self-start xl:sticky xl:top-24"
        >
          {selectedHearings.length === 0 ? (
            <EmptyState compact title={selected.getDay() === 0 ? 'Courts do not sit on Sundays' : 'Nothing listed on this day'} />
          ) : (
            <CauseList hearings={selectedHearings} showJudge={user.role !== 'JUDGE'} />
          )}
        </Panel>
      </div>
      <p className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-3 rounded-sm border-l-2 border-l-role bg-role-soft" aria-hidden="true" /> Scheduled
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-3 rounded-sm border-l-2 border-l-danger bg-danger-soft" aria-hidden="true" /> Outcome pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-3 rounded-sm border-l-2 border-l-success bg-sunken" aria-hidden="true" /> Held or cancelled
        </span>
      </p>
    </>
  )
}

