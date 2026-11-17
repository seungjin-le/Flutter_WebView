import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import {
  dismissToast,
  pauseToasts,
  resumeToasts,
  useToastStore,
  type ToastItem,
} from './toast-store'

const GAP = 12
const PEEK = 12
const VISIBLE_LIMIT = 3
const DEFAULT_HEIGHT = 64
const SWIPE_THRESHOLD = 40
const SWIPE_LOCK = 4

type Swipe = { id: string; x: number; y: number; active: boolean }
type Drag = { id: string; x0: number; y0: number; x: number; y: number; axis: 'x' | 'y' | null }

const damp = (value: number) => (value >= 0 ? value : -Math.sqrt(-value) * 2)

type ToastRowProps = {
  item: ToastItem
  index: number | null
  offset: number
  height: number
  frontHeight: number
  expanded: boolean
  swipe: Swipe | null
  onHeight: (id: string, height: number) => void
  onPointerDown: (id: string, event: PointerEvent<HTMLDivElement>) => void
  onPointerMove: (id: string, event: PointerEvent<HTMLDivElement>) => void
  onPointerUp: (id: string) => void
}

const ToastRow = ({
  item,
  index,
  offset,
  height,
  frontHeight,
  expanded,
  swipe,
  onHeight,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: ToastRowProps) => {
  // Hooks
  const rootRef = useRef<HTMLDivElement>(null)
  const [starting, setStarting] = useState(true)
  const [lastPosition, setLastPosition] = useState({ index: 0, offset: 0 })

  // Computed
  if (index !== null && (lastPosition.index !== index || lastPosition.offset !== offset)) {
    setLastPosition({ index, offset })
  }
  const i = index ?? lastPosition.index
  const rowOffset = index === null ? lastPosition.offset : offset

  const sw = swipe?.id === item.id ? swipe : { x: 0, y: 0, active: false }
  const scale = Math.max(0, 1 - i * 0.1)
  const offsetY = -rowOffset - i * GAP + sw.y
  let transform = expanded
    ? `translateX(${sw.x}px) translateY(${offsetY}px)`
    : `translateX(${sw.x}px) translateY(${sw.y - i * PEEK - (1 - scale) * frontHeight}px) scale(${scale})`
  let opacity = i >= VISIBLE_LIMIT ? 0 : 1
  if (starting) transform = 'translateY(150%)'
  if (item.out) {
    opacity = 0
    if (item.dir === 'down') transform = `translateY(${sw.y}px) translateY(150%)`
    else if (item.dir === 'right') {
      transform = `translateX(${sw.x}px) translateX(150%) translateY(${offsetY}px)`
    } else transform = 'translateY(150%)'
  }
  const behind = i > 0
  const hidden = (!expanded && behind) || i >= VISIBLE_LIMIT

  // Watchers
  useEffect(() => {
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setStarting(false))
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [])

  useLayoutEffect(() => {
    const content = rootRef.current?.firstElementChild
    if (!content) return
    const measure = () => {
      onHeight(item.id, content.scrollHeight + 2)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(content)
    return () => observer.disconnect()
  }, [item.id, onHeight])

  // Handlers
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    // a focused node removed from the DOM fires no blur, which would leave the stack paused
    event.currentTarget.blur()
    dismissToast(item.id)
  }

  return (
    <div
      ref={rootRef}
      role="status"
      tabIndex={0}
      aria-hidden={hidden || undefined}
      className={`absolute right-0 bottom-0 left-auto m-0 w-full origin-bottom cursor-default touch-none rounded-lg border border-border bg-white text-foreground shadow-[0_4px_12px_rgba(0,0,0,.1)] outline-none select-none after:absolute after:top-full after:left-0 after:h-[13px] after:w-full after:content-[''] focus-visible:shadow-none focus-visible:ring-3 focus-visible:ring-primary/30 ${
        sw.active
          ? '[transition:opacity_.5s,height_.15s]'
          : '[transition:transform_.5s_cubic-bezier(.22,1,.36,1),opacity_.5s,height_.15s]'
      }`}
      style={{
        transform,
        height: `${expanded ? height : frontHeight}px`,
        zIndex: 1000 - i,
        opacity,
        pointerEvents: i >= VISIBLE_LIMIT || item.out ? 'none' : 'auto',
      }}
      onPointerDown={(event) => onPointerDown(item.id, event)}
      onPointerMove={(event) => onPointerMove(item.id, event)}
      onPointerUp={() => onPointerUp(item.id)}
      onPointerCancel={() => onPointerUp(item.id)}
      onKeyDown={handleKeyDown}
    >
      <div
        className={`flex flex-col gap-1 overflow-hidden px-4 py-3 transition-opacity duration-[250ms] ease-[cubic-bezier(.22,1,.36,1)] ${
          expanded || !behind ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <p className="m-0 text-sm leading-5 font-medium">{item.title}</p>
        {item.description && (
          <p className="m-0 text-sm leading-5 text-muted-foreground">{item.description}</p>
        )}
      </div>
    </div>
  )
}

export const Toaster = () => {
  // Hooks
  const drag = useRef<Drag | null>(null)
  const [expandedState, setExpanded] = useState(false)
  const [heights, setHeights] = useState<Record<string, number>>({})
  const [swipe, setSwipe] = useState<Swipe | null>(null)
  const toasts = useToastStore((state) => state.toasts)
  const handleHeight = useCallback(
    (id: string, height: number) =>
      setHeights((current) => (current[id] === height ? current : { ...current, [id]: height })),
    [],
  )

  // Computed
  const live = toasts.filter((item) => !item.out)
  const expanded = expandedState && live.length > 0
  if (toasts.length === 0 && (expandedState || Object.keys(heights).length > 0)) {
    setExpanded(false)
    setHeights({})
  }
  const newestFirst = live.slice().reverse()
  const indexOf = new Map(newestFirst.map((item, i) => [item.id, i]))
  const offsetOf = new Map<string, number>()
  let accumulated = 0
  newestFirst.forEach((item) => {
    offsetOf.set(item.id, accumulated)
    accumulated += heights[item.id] ?? DEFAULT_HEIGHT
  })
  const front = live[live.length - 1]
  const frontHeight = (front ? heights[front.id] : undefined) ?? DEFAULT_HEIGHT

  // Functions
  function expand() {
    if (expandedState) return
    pauseToasts()
    setExpanded(true)
  }
  function collapse() {
    if (drag.current) return
    setExpanded(false)
    resumeToasts()
  }

  // Handlers
  const handleExpand = () => expand()
  const handleCollapse = () => collapse()
  const handlePointerDown = (id: string, event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    drag.current = { id, x0: event.clientX, y0: event.clientY, x: 0, y: 0, axis: null }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const handlePointerMove = (id: string, event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current || current.id !== id) return
    const dx = event.clientX - current.x0
    const dy = event.clientY - current.y0
    if (!current.axis && (Math.abs(dx) > SWIPE_LOCK || Math.abs(dy) > SWIPE_LOCK)) {
      current.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    }
    if (!current.axis) return
    current.x = current.axis === 'x' ? damp(dx) : 0
    current.y = current.axis === 'y' ? damp(dy) : 0
    setSwipe({ id, x: current.x, y: current.y, active: true })
  }
  const handlePointerUp = (id: string) => {
    const current = drag.current
    drag.current = null
    if (!current || current.id !== id || !current.axis) return
    if (current.y > SWIPE_THRESHOLD) dismissToast(id, 'down')
    else if (current.x > SWIPE_THRESHOLD) dismissToast(id, 'right')
    else {
      setSwipe(null)
      return
    }
    setSwipe({ id, x: current.x, y: current.y, active: false })
  }

  if (toasts.length === 0) return null

  return (
    <section
      aria-label="알림"
      aria-live="polite"
      className="fixed right-4 bottom-4 z-[70] m-0 w-[calc(100vw-32px)] min-[500px]:right-8 min-[500px]:bottom-8 min-[500px]:w-[360px]"
      onMouseEnter={handleExpand}
      onMouseLeave={handleCollapse}
      onFocus={handleExpand}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) collapse()
      }}
    >
      {toasts.map((item) => (
        <ToastRow
          key={item.id}
          item={item}
          index={indexOf.get(item.id) ?? null}
          offset={offsetOf.get(item.id) ?? 0}
          height={heights[item.id] ?? DEFAULT_HEIGHT}
          frontHeight={frontHeight}
          expanded={expanded}
          swipe={swipe}
          onHeight={handleHeight}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      ))}
    </section>
  )
}
