import { format, isToday, parseISO } from 'date-fns'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { toneClasses } from '@/components/ui/badge'
import { caseStatusTone } from '@/components/domain/badges'
import { cn } from '@/lib/cn'
import { caseStatusLabels } from '@/lib/labels'
import type { CaseStatus, NamedCount } from '@/lib/types'

// Chart colours (validated: the two-series pair passes CVD separation, deutan ΔE 21).
const INSTITUTED = '#2451b8'
const DISPOSED = '#21744a'
const SINGLE = '#2451b8'
const EMPHASIS = '#14213d'
const GRID = '#e2e5eb'
const AXIS_TEXT = '#5f6a82'

interface BarRow {
  key: string
  label: string
  value: number
  marker?: ReactNode
  href?: string
}

/**
 * One measure across labelled categories, drawn as thin horizontal bars in a single hue with the
 * value at the tip. Categories are named in text, so colour never carries identity.
 */
export function BarList({ rows, caption }: { rows: BarRow[]; caption: string }) {
  const max = Math.max(1, ...rows.map((row) => row.value))
  return (
    <figure className="px-4 py-4">
      <ul className="space-y-2.5" aria-label={caption}>
        {rows.map((row) => {
          const content = (
            <>
              <span className="flex min-w-0 items-center gap-2 text-[13px] text-ink-soft">
                {row.marker}
                <span className="truncate">{row.label}</span>
              </span>
              <span className="flex h-2.5 items-center" aria-hidden="true">
                <span className="block h-2.5 rounded-r-[4px] bg-brand transition-[width]" style={{ width: `${(row.value / max) * 100}%` }} />
              </span>
              <span className="tabular text-right text-[13px] font-semibold text-ink">{row.value}</span>
            </>
          )
          const grid = 'grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)_2.25rem] items-center gap-3'
          return (
            <li key={row.key}>
              {row.href ? (
                <Link to={row.href} className={cn(grid, 'rounded-sm hover:[&>span:first-child]:text-ink')} title={`${row.label}: ${row.value}`}>
                  {content}
                </Link>
              ) : (
                <div className={grid} title={`${row.label}: ${row.value}`}>
                  {content}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </figure>
  )
}

export function StatusBars({ data }: { data: NamedCount[] }) {
  return (
    <BarList
      caption="Cases by status"
      rows={data.map((item) => ({
        key: item.key,
        label: caseStatusLabels[item.key as CaseStatus],
        value: item.count,
        href: `/cases?status=${item.key}`,
        marker: <span className={cn('size-2 shrink-0 rounded-full', toneClasses[caseStatusTone[item.key as CaseStatus]].dot)} aria-hidden="true" />,
      }))}
    />
  )
}

function ChartTooltip({ active, payload, label, labelFormatter }: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string }>
  label?: string
  labelFormatter?: (label: string) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-raised">
      <p className="mb-1 font-medium text-ink">{labelFormatter && label ? labelFormatter(label) : label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-2 text-ink-soft">
          <span className="size-2 rounded-sm" style={{ background: entry.color }} aria-hidden="true" />
          <span className="flex-1">{entry.name}</span>
          <span className="tabular font-semibold text-ink">{entry.value}</span>
        </p>
      ))}
    </div>
  )
}

const monthLabel = (month: string) => format(parseISO(`${month}-01`), 'MMM')
const monthLong = (month: string) => format(parseISO(`${month}-01`), 'MMMM yyyy')

/** Cases instituted and disposed each month: the gap between the two is how pendency grows. */
export function InstitutionChart({ data }: { data: Array<{ month: string; instituted: number; disposed: number }> }) {
  return (
    <figure className="px-2 pt-3 pb-2">
      <div className="flex gap-4 px-3 pb-2 text-xs text-ink-soft" aria-hidden="true">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: INSTITUTED }} />
          Instituted
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: DISPOSED }} />
          Disposed
        </span>
      </div>
      <div className="h-[230px]" role="img" aria-label="Cases instituted and disposed per month over the last 12 months">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2} barCategoryGap="24%" margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="month" tickFormatter={monthLabel} tickLine={false} axisLine={{ stroke: GRID }} tick={{ fontSize: 12, fill: AXIS_TEXT }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: AXIS_TEXT }} width={36} />
            <Tooltip cursor={{ fill: 'rgba(20,33,61,0.04)' }} content={<ChartTooltip labelFormatter={monthLong} />} />
            <Bar name="Instituted" dataKey="instituted" fill={INSTITUTED} radius={[4, 4, 0, 0]} maxBarSize={16} isAnimationActive={false} />
            <Bar name="Disposed" dataKey="disposed" fill={DISPOSED} radius={[4, 4, 0, 0]} maxBarSize={16} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Cases instituted and disposed per month</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Instituted</th>
            <th>Disposed</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.month}>
              <td>{monthLong(row.month)}</td>
              <td>{row.instituted}</td>
              <td>{row.disposed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

/** Scheduled hearings per court day for the next two weeks; today is drawn in the darker step. */
export function HearingLoadChart({ data }: { data: Array<{ date: string; count: number }> }) {
  const dayLabel = (date: string) => format(parseISO(date), 'EEE d')
  return (
    <figure className="px-2 pt-3 pb-2">
      <div className="h-[170px]" role="img" aria-label="Hearings scheduled per day over the next two weeks">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="22%" margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="date" tickFormatter={dayLabel} tickLine={false} axisLine={{ stroke: GRID }} tick={{ fontSize: 11, fill: AXIS_TEXT }} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: AXIS_TEXT }} width={36} />
            <Tooltip
              cursor={{ fill: 'rgba(20,33,61,0.04)' }}
              content={<ChartTooltip labelFormatter={(date) => format(parseISO(date), 'EEEE d MMMM')} />}
            />
            <Bar name="Hearings" dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={false}>
              {data.map((day) => (
                <Cell key={day.date} fill={isToday(parseISO(day.date)) ? EMPHASIS : SINGLE} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Hearings scheduled per day</caption>
        <tbody>
          {data.map((day) => (
            <tr key={day.date}>
              <td>{format(parseISO(day.date), 'EEEE d MMMM')}</td>
              <td>{day.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
