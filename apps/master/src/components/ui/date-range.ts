import {
  addDays,
  addMonths,
  addYears,
  endOfWeek,
  format,
  getDay,
  getDaysInMonth,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
  subYears,
} from 'date-fns'

export type RangeCal = 0 | 1
export type YearMonth = { year: number; month: number }
export type DayCell = { iso: string; day: number; outside: boolean }

const ISO = 'yyyy-MM-dd'
const DAY_STEPS = new Map([
  ['ArrowLeft', -1],
  ['ArrowRight', 1],
  ['ArrowUp', -7],
  ['ArrowDown', 7],
])
const PAGE_KEYS = ['Home', 'End', 'PageUp', 'PageDown']
const MAX_SKIP = 400

export const toIso = (date: Date) => format(date, ISO)
export const parseIso = (iso: string) => parse(iso, ISO, new Date())
export const isNavKey = (key: string) => DAY_STEPS.has(key) || PAGE_KEYS.includes(key)

export const buildMonthGrid = (year: number, month: number): DayCell[] => {
  const first = new Date(year, month, 1)
  const lead = getDay(first)
  const total = Math.ceil((lead + getDaysInMonth(first)) / 7) * 7
  return Array.from({ length: total }, (_, i) => {
    const date = addDays(first, i - lead)
    return { iso: toIso(date), day: date.getDate(), outside: date.getMonth() !== month }
  })
}

/** The start calendar cannot pass the end date, the end calendar cannot precede the start date. */
export const isDisabled = (cal: RangeCal, iso: string, from: string, to: string) =>
  cal === 0 ? !!to && iso > to : !!from && iso < from

/** Picking the already selected day clears that side. */
export const pickDay = (cal: RangeCal, iso: string, from: string, to: string) =>
  cal === 0 ? { from: iso === from ? '' : iso, to } : { from, to: iso === to ? '' : iso }

export const shiftMonth = ({ year, month }: YearMonth, n: number): YearMonth => {
  const date = addMonths(new Date(year, month, 1), n)
  return { year: date.getFullYear(), month: date.getMonth() }
}

const toYearMonth = (date: Date): YearMonth => ({
  year: date.getFullYear(),
  month: date.getMonth(),
})

export const openView = (from: string, to: string, today: Date): [YearMonth, YearMonth] => {
  const a = from ? parseIso(from) : today
  const b = to ? parseIso(to) : startOfMonth(addMonths(a, 1))
  return [toYearMonth(a), toYearMonth(b)]
}

export const formatRangeLabel = (from: string, to: string) => {
  const dot = (iso: string) => iso.replaceAll('-', '.')
  if (from && to) return `${dot(from)} - ${dot(to)}`
  if (from) return `${dot(from)} -`
  return to ? `- ${dot(to)}` : ''
}

/** Returns the target day for a navigation key, or null when it is disabled or unreachable. */
export const moveFocus = (
  cal: RangeCal,
  iso: string,
  key: string,
  shift: boolean,
  from: string,
  to: string,
): string | null => {
  const date = parseIso(iso)
  const step = DAY_STEPS.get(key)
  let next = date
  if (step) {
    for (let n = 0; n < MAX_SKIP; n++) {
      next = addDays(next, step)
      if (!isDisabled(cal, toIso(next), from, to)) break
    }
  } else if (key === 'Home') next = startOfWeek(date)
  else if (key === 'End') next = endOfWeek(date)
  else if (key === 'PageUp') next = shift ? subYears(date, 1) : subMonths(date, 1)
  else if (key === 'PageDown') next = shift ? addYears(date, 1) : addMonths(date, 1)
  const result = toIso(next)
  return isDisabled(cal, result, from, to) ? null : result
}

/** The single tabbable day of a month: focus, own value, today, or the first enabled day. */
export const focusTarget = (
  cal: RangeCal,
  { year, month }: YearMonth,
  focus: string,
  own: string,
  today: string,
  from: string,
  to: string,
) => {
  const prefix = format(new Date(year, month, 1), 'yyyy-MM')
  const usable = (iso: string) => iso.startsWith(prefix) && !isDisabled(cal, iso, from, to)
  return (
    [focus, own, today].find(usable) ??
    buildMonthGrid(year, month).find((c) => !c.outside && usable(c.iso))?.iso
  )
}
