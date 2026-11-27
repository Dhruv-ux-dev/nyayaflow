import { format, isToday, parseISO } from 'date-fns'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { toneClasses } from '@/components/ui/badge'
import { caseStatusTone } from '@/components/domain/badges'
import { cn } from '@/lib/cn'
import { caseStatusLabels } from '@/lib/labels'
import type { CaseStatus, NamedCount } from '@/lib/types'

// Series colours. The instituted/disposed pair is separated by hue and lightness (CVD-safe) and
// the disposed series is also dashed, so colour never carries the meaning alone.
export const SERIES = {
  instituted: '#2350b0',
  disposed: '#1f7a4d',
  single: '#2350b0',
  emphasis: '#0f1b2d',
  grid: '#ebe7de',
  axis: '#5d6577',
}

/** Lifecycle colours as raw values for SVG/recharts (mirrors the CSS tokens). */
export const statusColor: Record<CaseStatus, string> = {
  FILED: '#7b879c',
  UNDER_REVIEW: '#5b45b8',
  ACTIVE: '#2350b0',
  AWAITING_DECISION: '#c27a12',
  DISPOSED: '#1f7a4d',
  CLOSED: '#3c4454',
}

interface BarRow {
  key: string
  label: string
  value: number
  marker?: ReactNode
  href?: string
  /** Secondary text after the value, e.g. a share. */
  note?: string
}

/**
 * One measure across labelled categories, drawn as thin horizontal bars in a single hue with the
 * value at the tip. Categories are named in text, so colour never carries identity.
 */
export function BarList({
  rows,
  caption,
  color = 'bg-brand',
  empty = 'No data yet',
}: {
  rows: BarRow[]
  caption: string
  color?: string
  empty?: string
}) {
  if (rows.length === 0) return <p className="px-5 py-6 text-sm text-muted">{empty}</p>
  const max = Math.max(1, ...rows.map((row) => row.value))
  return (
    <figure className="px-4 py-4 sm:px-5">
      <ul className="space-y-3" aria-label={caption}>
        {rows.map((row) => {
          const content = (
            <>
              <span className="flex min-w-0 items-center justify-between gap-2 text-[13px]">
                <span className="flex min-w-0 items-center gap-2 text-ink-soft">
                  {row.marker}
                  <span className="truncate">{row.label}</span>
                </span>
                <span className="tabular shrink-0 font-semibold text-ink">
                  {row.value}
                  {row.note && <span className="ml-1.5 text-xs font-normal text-muted">{row.note}</span>}
                </span>
              </span>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
                <span
                  className={cn('block h-full rounded-full transition-[width] duration-500', color)}
                  style={{ width: `${(row.value / max) * 100}%` }}
                />
              </span>
            </>
          )
          return (
            <li key={row.key}>
              {row.href ? (
                <Link to={row.href} className="block rounded-sm hover:[&_span.text-ink-soft]:text-ink" title={`${row.label}: ${row.value}`}>
                  {content}
                </Link>
              ) : (
                <div title={`${row.label}: ${row.value}`}>{content}</div>
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

export interface DonutSlice {
  key: string
  label: string
  value: number
  color: string
  href?: string
}

/**
 * Parts of a whole as a ring, with the total in the middle and a labelled legend beside it.
 * Drawn in plain SVG; each slice and legend row carries its value in text.
 */
export function Donut({ slices, centerLabel, caption }: { slices: DonutSlice[]; centerLabel: string; caption: string }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0)
  const radius = 42
  const circumference = 2 * Math.PI * radius
  let offset = 0
  return (
    <figure className="@container px-4 py-5 sm:px-5">
      <div className="flex flex-col items-center gap-5 @[26rem]:flex-row @[26rem]:items-center">
        <div className="relative size-[132px] shrink-0">
          <svg
            viewBox="0 0 100 100"
            className="size-full -rotate-90"
            role="img"
            aria-label={`${caption}: ${slices.map((s) => `${s.label} ${s.value}`).join(', ')}`}
          >
            <circle cx="50" cy="50" r={radius} fill="none" stroke="#f0ede6" strokeWidth="11" />
            {total > 0 &&
              slices
                .filter((s) => s.value > 0)
                .map((slice) => {
                  const length = (slice.value / total) * circumference
                  const gap = slices.filter((s) => s.value > 0).length > 1 ? 1.2 : 0
                  const element = (
                    <circle
                      key={slice.key}
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth="11"
                      strokeDasharray={`${Math.max(length - gap, 0)} ${circumference}`}
                      strokeDashoffset={-offset}
                    />
                  )
                  offset += length
                  return element
                })}
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="tabular text-2xl leading-none font-semibold text-ink">{total.toLocaleString('en-IN')}</p>
              <p className="mt-1 text-[11px] text-muted">{centerLabel}</p>
            </div>
          </div>
        </div>
        <ul className="w-full min-w-0 flex-1 space-y-1.5" aria-label={caption}>
          {slices.map((slice) => {
            const row = (
              <>
                <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: slice.color }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-ink-soft">{slice.label}</span>
                <span className="tabular font-semibold text-ink">{slice.value}</span>
                <span className="tabular w-10 text-right text-xs text-muted">{total ? Math.round((slice.value / total) * 100) : 0}%</span>
              </>
            )
            return (
              <li key={slice.key}>
                {slice.href ? (
                  <Link to={slice.href} className="flex items-center gap-2.5 rounded-md px-1.5 py-1 text-[13px] transition-colors hover:bg-ivory">
                    {row}
                  </Link>
                ) : (
                  <div className="flex items-center gap-2.5 px-1.5 py-1 text-[13px]">{row}</div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </figure>
  )
}

export function statusSlices(data: NamedCount[]): DonutSlice[] {
  return data.map((item) => ({
    key: item.key,
    label: caseStatusLabels[item.key as CaseStatus],
    value: item.count,
    color: statusColor[item.key as CaseStatus],
    href: `/cases?status=${item.key}`,
  }))
}

function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string; stroke?: string }>
  label?: string
  labelFormatter?: (label: string) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lifted">
      <p className="mb-1 font-medium text-ink">{labelFormatter && label ? labelFormatter(label) : label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-2 text-ink-soft">
          <span className="size-2 rounded-sm" style={{ background: entry.stroke ?? entry.color }} aria-hidden="true" />
          <span className="flex-1">{entry.name}</span>
          <span className="tabular font-semibold text-ink">{entry.value}</span>
        </p>
      ))}
    </div>
  )
}

const monthLabel = (month: string) => format(parseISO(`${month}-01`), 'MMM')
const monthLong = (month: string) => format(parseISO(`${month}-01`), 'MMMM yyyy')

/**
 * Registrations (instituted) and disposals each month over a year. The shaded area is the
 * registration trend; the dashed line is disposals. Where the area sits above the line, pendency grew.
 */
export function TrendChart({ data, height = 240 }: { data: Array<{ month: string; instituted: number; disposed: number }>; height?: number }) {
  return (
    <figure className="px-2 pt-2 pb-2">
      <div style={{ height }} role="img" aria-label="Cases registered and disposed per month over the last 12 months">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -14 }}>
            <defs>
              <linearGradient id="institutedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES.instituted} stopOpacity={0.16} />
                <stop offset="100%" stopColor={SERIES.instituted} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={SERIES.grid} />
            <XAxis
              dataKey="month"
              tickFormatter={monthLabel}
              tickLine={false}
              axisLine={{ stroke: SERIES.grid }}
              tick={{ fontSize: 12, fill: SERIES.axis }}
            />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: SERIES.axis }} width={36} />
            <Tooltip cursor={{ stroke: SERIES.grid }} content={<ChartTooltip labelFormatter={monthLong} />} />
            <Area
              name="Registered"
              type="monotone"
              dataKey="instituted"
              stroke={SERIES.instituted}
              strokeWidth={2}
              fill="url(#institutedFill)"
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
            <Line
              name="Disposed"
              type="monotone"
              dataKey="disposed"
              stroke={SERIES.disposed}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Cases registered and disposed per month</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Registered</th>
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

export function TrendLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-ink-soft" aria-hidden="true">
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded-full" style={{ background: SERIES.instituted }} />
        Registered
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-4 border-t-2 border-dashed" style={{ borderColor: SERIES.disposed }} />
        Disposed
      </span>
    </div>
  )
}

/** Scheduled hearings per court day for the next two weeks; today is drawn in the darker step. */
export function HearingLoadChart({
  data,
  height = 170,
  color = SERIES.single,
}: {
  data: Array<{ date: string; count: number }>
  height?: number
  color?: string
}) {
  const dayLabel = (date: string) => format(parseISO(date), 'EEE d')
  return (
    <figure className="px-2 pt-3 pb-2">
      <div style={{ height }} role="img" aria-label="Hearings scheduled per day over the next two weeks">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="22%" margin={{ top: 4, right: 8, bottom: 0, left: -14 }}>
            <CartesianGrid vertical={false} stroke={SERIES.grid} />
            <XAxis
              dataKey="date"
              tickFormatter={dayLabel}
              tickLine={false}
              axisLine={{ stroke: SERIES.grid }}
              tick={{ fontSize: 11, fill: SERIES.axis }}
              interval="preserveStartEnd"
            />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: SERIES.axis }} width={36} />
            <Tooltip
              cursor={{ fill: 'rgba(15,27,45,0.04)' }}
              content={<ChartTooltip labelFormatter={(date) => format(parseISO(date), 'EEEE d MMMM')} />}
            />
            <Bar name="Hearings" dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false}>
              {data.map((day) => (
                <Cell key={day.date} fill={isToday(parseISO(day.date)) ? SERIES.emphasis : color} />
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
