import { useId, useRef, useState, type KeyboardEvent } from 'react'

export type RadioOption = { value: string; label: string }

export type RadioGroupProps = {
  options: RadioOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  orientation?: 'vertical' | 'horizontal'
  'aria-label'?: string
  'aria-labelledby'?: string
}

export const RadioGroup = ({
  options,
  value,
  defaultValue,
  onValueChange,
  orientation = 'vertical',
  'aria-label': ariaLabel,
  'aria-labelledby': labelledBy,
}: RadioGroupProps) => {
  // Hooks
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [inner, setInner] = useState(defaultValue ?? options[0]?.value)
  const uid = useId()

  // Computed
  const current = value ?? inner
  const checkedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === current),
  )
  const horizontal = orientation === 'horizontal'

  // Functions
  function select(index: number) {
    const next = options[index]
    if (!next) return
    if (value === undefined) setInner(next.value)
    onValueChange?.(next.value)
  }

  // Handlers
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step =
      e.key === 'ArrowDown' || e.key === 'ArrowRight'
        ? 1
        : e.key === 'ArrowUp' || e.key === 'ArrowLeft'
          ? -1
          : 0
    if (!step || options.length === 0) return
    e.preventDefault()
    const next = (checkedIndex + step + options.length) % options.length
    select(next)
    itemRefs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel ?? (labelledBy ? undefined : '옵션')}
      aria-labelledby={labelledBy}
      aria-orientation={orientation}
      onKeyDown={handleKeyDown}
      className={[
        'font-sans text-foreground',
        horizontal ? 'flex flex-wrap items-center gap-x-6 gap-y-3' : 'grid gap-3',
      ].join(' ')}
    >
      {options.map((o, i) => {
        const on = i === checkedIndex
        const id = `${uid}-${i}`
        return (
          <div key={o.value} className="group flex items-center gap-3">
            <button
              type="button"
              id={id}
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              ref={(el) => {
                itemRefs.current[i] = el
              }}
              onClick={() => select(i)}
              className={[
                'flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full border bg-transparent p-0 shadow-control outline-none [transition:border-color_.15s_ease,box-shadow_.15s_ease,transform_.1s_ease] active:scale-[.88]',
                'group-hover:shadow-none group-hover:ring-3 group-hover:ring-primary/15 focus-visible:border-ring focus-visible:shadow-none focus-visible:ring-3 focus-visible:ring-primary/30',
                on ? 'border-primary' : 'border-border group-hover:border-primary-light',
              ].join(' ')}
            >
              <span
                className={[
                  'block size-2 rounded-full bg-primary [transition:transform_.22s_cubic-bezier(.34,1.56,.64,1),opacity_.15s_ease]',
                  on ? 'scale-100 opacity-100' : 'scale-0 opacity-0',
                ].join(' ')}
              />
            </button>
            <label
              htmlFor={id}
              className="cursor-pointer select-none text-sm leading-none font-medium"
            >
              {o.label}
            </label>
          </div>
        )
      })}
    </div>
  )
}
