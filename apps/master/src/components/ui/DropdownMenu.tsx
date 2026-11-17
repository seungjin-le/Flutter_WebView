import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useExitAnimation } from '../../hooks/use-exit-animation'
import { CheckIcon, ChevronDownIcon, MoreHorizontalIcon } from './icons'
import { handleFocusListKeys, hoverFocus, popoverMotion, popoverPanel } from './popover-utils'

export type MenuEntry =
  | { type: 'label'; label: string }
  | { type: 'separator' }
  | { type: 'checkbox'; value: string; label: string; checked?: boolean }
  | {
      type?: 'item'
      value: string
      label: string
      shortcut?: string
      variant?: 'destructive'
      disabled?: boolean
    }

export type DropdownMenuProps = {
  items: MenuEntry[]
  /** When set, checkbox state is owned by the parent through each item's `checked`. */
  onItemSelect?: (value: string, checked?: boolean) => void
  triggerVariant?: 'icon' | 'outline'
  triggerLabel?: string
  ariaLabel?: string
  align?: 'start' | 'end'
  minWidth?: string
}

type FocusMode = 'first' | 'last' | 'content'

type PanelPosition = Pick<CSSProperties, 'top' | 'bottom' | 'left'> & { above?: boolean }

const PANEL_GAP = 4

const panelOrigin = {
  start: { below: 'origin-top-left', above: 'origin-bottom-left' },
  end: { below: 'origin-top-right', above: 'origin-bottom-right' },
}

const itemBase =
  'relative flex w-full cursor-default select-none items-center gap-2 whitespace-nowrap rounded-sm border-0 bg-transparent px-2 py-1.5 text-left text-sm leading-5 text-foreground outline-none disabled:pointer-events-none disabled:opacity-50'

const triggerBase =
  'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent bg-transparent text-sm leading-5 font-medium text-foreground outline-none transition-all duration-150 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-primary/30'

const triggerVariants = {
  icon: 'size-8 p-0 hover:bg-muted hover:text-accent-foreground aria-expanded:bg-muted aria-expanded:text-accent-foreground',
  outline:
    'h-9 border-border bg-white px-3 py-2 shadow-control hover:bg-muted hover:text-accent-foreground aria-expanded:border-primary aria-expanded:bg-white aria-expanded:ring-3 aria-expanded:ring-primary/30',
}

export const DropdownMenu = ({
  items,
  onItemSelect,
  triggerVariant = 'icon',
  triggerLabel = '열기',
  ariaLabel,
  align = 'end',
  minWidth = '160px',
}: DropdownMenuProps) => {
  // Hooks
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const focusMode = useRef<FocusMode>('content')
  const [open, setOpen] = useState(false)
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [position, setPosition] = useState<PanelPosition>({})
  const { mounted, closing } = useExitAnimation(open)
  const triggerId = useId()

  // Computed
  const isIcon = triggerVariant === 'icon'
  const label = ariaLabel ?? (isIcon ? '메뉴 열기' : undefined)

  // Watchers
  // The panel lives in document.body, so it also counts as "inside" for outside-press dismissal.
  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return
      if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target))
        setOpen(false)
    }
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!mounted) return
    const updatePosition = () => {
      const trigger = triggerRef.current
      const menu = menuRef.current
      if (!trigger || !menu) return
      const rect = trigger.getBoundingClientRect()
      const { clientWidth, clientHeight } = document.documentElement
      const room = clientHeight - rect.bottom - PANEL_GAP
      const above = menu.offsetHeight > room && rect.top - PANEL_GAP > room
      const edge = align === 'start' ? rect.left : rect.right - menu.offsetWidth
      setPosition({
        left: Math.max(0, Math.min(edge, clientWidth - menu.offsetWidth)),
        ...(above
          ? { bottom: clientHeight - rect.top + PANEL_GAP }
          : { top: rect.bottom + PANEL_GAP }),
        above,
      })
    }
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [mounted, align])

  useEffect(() => {
    if (!open) return
    const enabled = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([disabled])') ?? [],
    )
    const target =
      focusMode.current === 'first'
        ? enabled[0]
        : focusMode.current === 'last'
          ? enabled[enabled.length - 1]
          : menuRef.current
    ;(target ?? menuRef.current)?.focus()
  }, [open])

  // Functions
  function openMenu(mode: FocusMode) {
    focusMode.current = mode
    setOpen(true)
  }
  function close() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  // Handlers
  const handleTriggerClick = () => (open ? setOpen(false) : openMenu('content'))
  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (open) return
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openMenu('first')
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      openMenu('last')
    }
  }
  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) =>
    handleFocusListKeys(event, '[role^="menuitem"]:not([disabled])', close)
  const handleCheckboxSelect = (value: string, checked: boolean) => {
    if (!onItemSelect) setChecks({ ...checks, [value]: checked })
    onItemSelect?.(value, checked)
    close()
  }
  const handleItemSelect = (value: string) => {
    close()
    onItemSelect?.(value)
  }

  return (
    <div ref={rootRef} className="relative inline-block font-sans text-foreground">
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        className={`${triggerBase} ${triggerVariants[triggerVariant]}`}
      >
        {isIcon ? (
          <MoreHorizontalIcon className="pointer-events-none size-4 shrink-0" />
        ) : (
          <>
            {triggerLabel}
            <ChevronDownIcon className="pointer-events-none size-4 shrink-0" />
          </>
        )}
      </button>
      {mounted &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={label}
            aria-labelledby={label ? undefined : triggerId}
            tabIndex={-1}
            onKeyDown={handleMenuKeyDown}
            style={{ ...position, minWidth, position: 'fixed' }}
            className={`${popoverPanel} ${popoverMotion(closing)} p-1 ${panelOrigin[align][position.above ? 'above' : 'below']}`}
          >
            {items.map((entry, index) => {
              if (entry.type === 'label')
                return (
                  <div key={index} className="px-2 py-1.5 text-sm leading-5 font-medium">
                    {entry.label}
                  </div>
                )
              if (entry.type === 'separator')
                return <div key={index} role="separator" className="-mx-1 my-1 h-px bg-border" />
              if (entry.type === 'checkbox') {
                const checked = onItemSelect
                  ? !!entry.checked
                  : (checks[entry.value] ?? !!entry.checked)
                return (
                  <button
                    key={index}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={checked}
                    tabIndex={-1}
                    onClick={() => handleCheckboxSelect(entry.value, !checked)}
                    {...hoverFocus}
                    className={`${itemBase} pl-8 focus:bg-muted focus:text-accent-foreground`}
                  >
                    <span className="absolute left-2 flex size-3.5 items-center justify-center">
                      {checked && <CheckIcon />}
                    </span>
                    {entry.label}
                  </button>
                )
              }
              return (
                <button
                  key={index}
                  type="button"
                  role="menuitem"
                  disabled={entry.disabled}
                  tabIndex={-1}
                  onClick={() => handleItemSelect(entry.value)}
                  {...hoverFocus}
                  className={`${itemBase} ${entry.variant === 'destructive' ? 'text-destructive-foreground focus:bg-destructive/10 focus:text-destructive-foreground' : 'focus:bg-muted focus:text-accent-foreground'}`}
                >
                  {entry.label}
                  {entry.shortcut && (
                    <span className="ml-auto text-xs tracking-[0.1em] text-muted-foreground">
                      {entry.shortcut}
                    </span>
                  )}
                </button>
              )
            })}
          </div>,
          document.body,
        )}
    </div>
  )
}
