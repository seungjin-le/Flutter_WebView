import type { KeyboardEvent, PointerEvent } from 'react'

export type SelectOption = { value: string; label: string }

export const popoverPanel =
  'absolute z-50 rounded-md border border-border bg-white text-foreground shadow-[0_4px_6px_-1px_rgba(0,0,0,.1),0_2px_4px_-2px_rgba(0,0,0,.1)] outline-none'

export const popoverMotion = (closing: boolean) =>
  closing ? 'animate-popover-out pointer-events-none' : 'animate-popover-in'

export const optionRow =
  'relative flex w-full cursor-default select-none items-center gap-2 rounded-sm border-0 bg-transparent px-2 py-1.5 text-left text-sm leading-5 text-foreground outline-none'

export const focusRing =
  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-primary/30 aria-expanded:border-primary aria-expanded:ring-3 aria-expanded:ring-primary/30'

export const filterOptions = (options: SelectOption[], query: string) => {
  const q = query.trim().toLowerCase()
  return q ? options.filter((option) => option.label.toLowerCase().includes(q)) : options
}

export const nextIndex = (key: string, current: number, length: number) => {
  if (length === 0) return null
  if (key === 'ArrowDown') return current < 0 ? 0 : Math.min(current + 1, length - 1)
  if (key === 'ArrowUp') return current < 0 ? length - 1 : Math.max(current - 1, 0)
  if (key === 'Home') return 0
  if (key === 'End') return length - 1
  return null
}

export const typeaheadIndex = (labels: string[], current: number, key: string) => {
  if (key.length !== 1 || !/\S/.test(key)) return -1
  const char = key.toLowerCase()
  for (let step = 1; step <= labels.length; step += 1) {
    const index = (current + step) % labels.length
    if (labels[index]?.trim().toLowerCase().startsWith(char)) return index
  }
  return -1
}

/** Roving-focus keyboard handling shared by the Select listbox and the DropdownMenu. */
export const handleFocusListKeys = (
  event: KeyboardEvent<HTMLElement>,
  selector: string,
  onEscape: () => void,
) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    onEscape()
    return
  }
  if (event.key === 'Tab') {
    event.preventDefault()
    return
  }
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(selector))
  const current = items.findIndex((item) => item === document.activeElement)
  const target = nextIndex(event.key, current, items.length)
  if (target !== null) {
    event.preventDefault()
    items[target]?.focus()
    return
  }
  if (event.ctrlKey || event.metaKey || event.altKey) return
  const hit = typeaheadIndex(
    items.map((item) => item.textContent ?? ''),
    current,
    event.key,
  )
  if (hit >= 0) items[hit]?.focus()
}

export const hoverFocus = {
  onPointerMove: (event: PointerEvent<HTMLElement>) => {
    if (document.activeElement !== event.currentTarget) event.currentTarget.focus()
  },
  onPointerLeave: (event: PointerEvent<HTMLElement>) => {
    // Only the item that still owns focus hands it back; a closing list must not steal it from the trigger.
    if (document.activeElement !== event.currentTarget) return
    event.currentTarget.closest<HTMLElement>('[role="listbox"],[role="menu"]')?.focus()
  },
}
