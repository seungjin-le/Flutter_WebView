import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useControllable } from '../../hooks/use-controllable'
import { useDismiss } from '../../hooks/use-dismiss'
import { useExitAnimation } from '../../hooks/use-exit-animation'
import { CheckIcon, ChevronDownIcon } from './icons'
import {
  focusRing,
  handleFocusListKeys,
  hoverFocus,
  popoverMotion,
  popoverPanel,
  type SelectOption,
} from './popover-utils'

export type SelectProps = {
  options: SelectOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  labelText?: string
  labelledBy?: string
  attach?: 'left'
  width?: string
  minWidth?: string
}

export const Select = ({
  options,
  value,
  defaultValue,
  onValueChange,
  labelText,
  labelledBy,
  attach,
  width = '100%',
  minWidth = '0',
}: SelectProps) => {
  // Hooks
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const { mounted, closing } = useExitAnimation(open)
  const [current, setCurrent] = useControllable(
    value,
    defaultValue ?? options[0]?.value ?? '',
    onValueChange,
  )
  useDismiss(rootRef, open, () => setOpen(false))

  // Computed
  const selected = options.find((option) => option.value === current) ?? options[0]
  const label = labelledBy ? undefined : (labelText ?? '선택')

  // Watchers
  useEffect(() => {
    if (!open) return
    const target = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')
    ;(target ?? listRef.current)?.focus()
  }, [open])

  // Functions
  function close() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  // Handlers
  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault()
      setOpen(true)
    }
  }
  const handleSelect = (optionValue: string) => {
    setCurrent(optionValue)
    close()
  }

  return (
    <div ref={rootRef} className="relative font-sans text-foreground" style={{ width }}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-labelledby={labelledBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onKeyDown={handleTriggerKeyDown}
        style={{ minWidth }}
        className={`flex h-9 w-full cursor-pointer items-center justify-between gap-2 whitespace-nowrap rounded-md border border-border bg-transparent px-3 py-2 text-sm leading-5 text-foreground shadow-control outline-none transition-[color,box-shadow,border-color] duration-150 focus-visible:relative focus-visible:z-10 aria-expanded:relative aria-expanded:z-10 ${focusRing} ${attach === 'left' ? 'rounded-r-none' : ''}`}
      >
        <span>{selected?.label ?? ''}</span>
        <ChevronDownIcon className="size-4 shrink-0 opacity-50 pointer-events-none" />
      </button>
      {mounted && (
        <div
          ref={listRef}
          role="listbox"
          aria-label={label}
          aria-labelledby={labelledBy}
          tabIndex={-1}
          onKeyDown={(event) => handleFocusListKeys(event, '[role="option"]', close)}
          className={`${popoverPanel} ${popoverMotion(closing)} top-[calc(100%+4px)] left-0 max-h-[170px] min-w-[max(100%,128px)] origin-top-left overflow-y-auto overscroll-contain p-1`}
        >
          {options.map((option) => {
            const on = option.value === selected?.value
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={on}
                tabIndex={-1}
                onClick={() => handleSelect(option.value)}
                {...hoverFocus}
                className="relative flex w-full cursor-default select-none items-center gap-2 whitespace-nowrap rounded-sm border-0 bg-transparent py-1.5 pr-8 pl-2 text-left text-sm leading-5 text-foreground outline-none focus:bg-muted focus:text-accent-foreground"
              >
                {option.label}
                {on && (
                  <span className="absolute right-2 flex size-3.5 items-center justify-center">
                    <CheckIcon />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
