import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useDismiss } from '../../hooks/use-dismiss'
import { useExitAnimation } from '../../hooks/use-exit-animation'
import { ChevronLeftIcon, ChevronRightIcon } from './icons'
import {
  buildMonthGrid,
  focusTarget,
  formatRangeLabel,
  isDisabled,
  isNavKey,
  moveFocus,
  openView,
  parseIso,
  pickDay,
  shiftMonth,
  toIso,
  type DayCell,
  type RangeCal,
  type YearMonth,
} from './date-range'

export type DateRangePickerProps = {
  /** ISO date (yyyy-MM-dd) or ''. Controlled only together with onRangeChange. */
  from?: string
  to?: string
  onRangeChange?: (from: string, to: string) => void
  placeholder?: string
  /** aria-label of the trigger. Ignored when labelledBy is set. */
  labelText?: string
  labelledBy?: string
  width?: string
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const FOCUS_RING = 'focus-visible:ring-[3px] focus-visible:ring-primary/30'

const CalendarIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="pointer-events-none size-4 shrink-0"
  >
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
  </svg>
)

type DayState = { isStart: boolean; isEnd: boolean; inRange: boolean; hasRange: boolean }

const cellClass = ({ isStart, isEnd, inRange, hasRange }: DayState) => {
  if (hasRange && isStart) return 'rounded-l-md bg-primary-soft'
  if (hasRange && isEnd) return 'rounded-r-md bg-primary-soft'
  return inRange ? 'bg-primary-soft' : ''
}

const dayClass = (
  cell: DayCell,
  isToday: boolean,
  disabled: boolean,
  { isStart, isEnd, inRange }: DayState,
) => {
  const base = `flex size-full cursor-pointer items-center justify-center rounded-md border-0 p-0 font-sans text-sm leading-none font-normal outline-none transition-all duration-150 focus-visible:relative focus-visible:z-10 disabled:cursor-default ${FOCUS_RING}`
  if (isStart || isEnd) return `${base} bg-primary text-white hover:bg-primary-hover`
  if (inRange) return `${base} rounded-none bg-primary-soft text-primary-hover`
  if (disabled) return `${base} bg-transparent text-muted-foreground opacity-50`
  const color = cell.outside ? 'text-muted-foreground' : 'text-foreground'
  if (isToday) return `${base} bg-muted text-accent-foreground`
  return `${base} bg-transparent ${color} hover:bg-muted ${cell.outside ? '' : 'hover:text-accent-foreground'}`
}

const navClass = `inline-flex size-8 cursor-pointer items-center justify-center rounded-md border border-transparent bg-transparent p-0 text-foreground outline-none transition-all duration-150 hover:bg-muted hover:text-accent-foreground focus-visible:border-ring ${FOCUS_RING}`

type MonthProps = {
  cal: RangeCal
  view: YearMonth
  focus: string
  from: string
  to: string
  today: string
  onPick: (iso: string) => void
  onShift: (n: number) => void
  onMove: (event: KeyboardEvent<HTMLDivElement>) => void
}

const Month = ({ cal, view, focus, from, to, today, onPick, onShift, onMove }: MonthProps) => {
  // Hooks
  const captionId = useId()

  // Computed
  const name = cal === 0 ? '시작일' : '종료일'
  const hasRange = !!from && !!to && from !== to
  const target = focusTarget(cal, view, focus, cal === 0 ? from : to, today, from, to)
  return (
    <div className="flex flex-col gap-1">
      <span
        id={captionId}
        className="text-center text-xs leading-4 font-medium text-muted-foreground select-none"
      >
        {name}
      </span>
      <div role="grid" aria-labelledby={captionId} data-cal={cal} className="flex flex-col">
        <div className="flex h-8 items-center justify-between gap-1">
          <button
            type="button"
            className={navClass}
            aria-label={`${name} 이전 달`}
            onClick={() => onShift(-1)}
          >
            <ChevronLeftIcon />
          </button>
          <span aria-live="polite" className="text-sm font-medium select-none">
            {view.year}년 {view.month + 1}월
          </span>
          <button
            type="button"
            className={navClass}
            aria-label={`${name} 다음 달`}
            onClick={() => onShift(1)}
          >
            <ChevronRightIcon />
          </button>
        </div>
        <div
          aria-hidden="true"
          className="grid grid-cols-[repeat(7,32px)] text-center text-[12.8px] leading-8 text-muted-foreground select-none"
        >
          {WEEKDAYS.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>
        <div onKeyDown={onMove} className="mt-2 grid grid-cols-[repeat(7,32px)] gap-y-2">
          {buildMonthGrid(view.year, view.month).map((cell) => {
            const state: DayState = {
              hasRange,
              isStart: cell.iso === from,
              isEnd: !!to && cell.iso === to,
              inRange: hasRange && cell.iso > from && cell.iso < to,
            }
            const disabled = isDisabled(cal, cell.iso, from, to)
            const isToday = cell.iso === today
            const isTarget = !cell.outside && cell.iso === target
            const [, month, date] = cell.iso.split('-')
            return (
              <div key={cell.iso} role="gridcell" className={`size-8 ${cellClass(state)}`}>
                <button
                  type="button"
                  className={dayClass(cell, isToday, disabled, state)}
                  data-day={cell.outside ? undefined : cell.iso}
                  data-day-out={cell.outside ? cell.iso : undefined}
                  data-autofocus={isTarget && cal === 0 ? 'true' : undefined}
                  tabIndex={isTarget ? 0 : -1}
                  disabled={disabled}
                  aria-label={`${cell.iso.slice(0, 4)}년 ${Number(month)}월 ${Number(date)}일${isToday ? ', 오늘' : ''}`}
                  aria-pressed={cal === 0 ? state.isStart : state.isEnd}
                  onClick={() => onPick(cell.iso)}
                >
                  {cell.day}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export const DateRangePicker = ({
  from: fromProp = '',
  to: toProp = '',
  onRangeChange,
  placeholder = '날짜 선택',
  labelText,
  labelledBy,
  width = '100%',
}: DateRangePickerProps) => {
  // Hooks
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const pending = useRef('')
  const [inner, setInner] = useState({ from: '', to: '' })
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<YearMonth[]>(() => openView('', '', new Date()))
  const [focus, setFocus] = useState<string[]>(['', ''])
  const { mounted, closing } = useExitAnimation(open)
  useDismiss(rootRef, open, close)

  // Computed
  const { from, to } = onRangeChange ? { from: fromProp, to: toProp } : inner
  const label = formatRangeLabel(from, to)
  const today = toIso(new Date())

  // Watchers
  useEffect(() => {
    if (open) rootRef.current?.querySelector<HTMLElement>('[data-autofocus="true"]')?.focus()
  }, [open])

  useEffect(() => {
    if (!pending.current) return
    rootRef.current?.querySelector<HTMLElement>(pending.current)?.focus()
    pending.current = ''
  }, [view, focus])

  // Functions
  function close() {
    setOpen(false)
  }

  // Handlers
  const handleToggle = () => {
    if (!open) {
      setView(openView(from, to, new Date()))
      setFocus(['', ''])
    }
    setOpen(!open)
  }

  const handlePick = (cal: RangeCal, iso: string) => {
    setFocus((f) => f.map((v, i) => (i === cal ? iso : v)))
    const next = pickDay(cal, iso, from, to)
    if (onRangeChange) onRangeChange(next.from, next.to)
    else setInner(next)
  }

  const handleMove = (cal: RangeCal, event: KeyboardEvent<HTMLDivElement>) => {
    if (!isNavKey(event.key) || !(event.target instanceof HTMLElement)) return
    const current = event.target.dataset.day ?? event.target.dataset.dayOut
    if (!current) return
    event.preventDefault()
    event.stopPropagation()
    const iso = moveFocus(cal, current, event.key, event.shiftKey, from, to)
    if (!iso) return
    const date = parseIso(iso)
    pending.current = `[data-cal="${cal}"] [data-day="${iso}"]`
    setView((v) =>
      v.map((m, i) => (i === cal ? { year: date.getFullYear(), month: date.getMonth() } : m)),
    )
    setFocus((f) => f.map((v, i) => (i === cal ? iso : v)))
  }

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    close()
    triggerRef.current?.focus()
  }

  return (
    <div ref={rootRef} className="relative font-sans text-foreground" style={{ width }}>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          aria-label={labelText ?? (labelledBy ? undefined : '기간')}
          aria-labelledby={labelledBy}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={handleToggle}
          className={`inline-flex h-9 w-full cursor-pointer items-center justify-start gap-2 rounded-md border border-border bg-surface px-2.5 font-sans text-sm leading-5 font-normal whitespace-nowrap text-foreground shadow-control outline-none transition-all duration-150 hover:bg-muted hover:text-accent-foreground focus-visible:border-ring aria-expanded:border-primary aria-expanded:bg-surface ${FOCUS_RING} aria-expanded:ring-[3px] aria-expanded:ring-primary/30`}
        >
          <CalendarIcon />
          <span className={`overflow-hidden text-ellipsis ${label ? '' : 'text-muted-foreground'}`}>
            {label || placeholder}
          </span>
        </button>
        {mounted && (
          <div
            role="dialog"
            aria-label="날짜 범위 선택"
            onKeyDown={handleDialogKeyDown}
            className={`absolute top-[calc(100%+4px)] left-0 z-50 w-max max-w-[calc(100vw-32px)] origin-top-left overflow-hidden rounded-md border border-border bg-surface text-foreground shadow-md outline-none ${closing ? 'pointer-events-none animate-popover-out' : 'animate-popover-in'}`}
          >
            <div className="flex flex-wrap gap-4 p-3">
              {([0, 1] as const).map((cal) => (
                <Month
                  key={cal}
                  cal={cal}
                  view={view[cal]}
                  focus={focus[cal]}
                  from={from}
                  to={to}
                  today={today}
                  onPick={(iso) => handlePick(cal, iso)}
                  onShift={(n) =>
                    setView((v) => v.map((m, i) => (i === cal ? shiftMonth(m, n) : m)))
                  }
                  onMove={(event) => handleMove(cal, event)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
