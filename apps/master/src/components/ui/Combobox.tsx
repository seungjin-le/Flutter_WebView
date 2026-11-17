import { useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { useControllable } from '../../hooks/use-controllable'
import { useDismiss } from '../../hooks/use-dismiss'
import { useExitAnimation } from '../../hooks/use-exit-animation'
import { CheckIcon, ChevronUpDownIcon } from './icons'
import {
  filterOptions,
  focusRing,
  nextIndex,
  optionRow,
  popoverMotion,
  popoverPanel,
  type SelectOption,
} from './popover-utils'

export type ComboboxProps = {
  options: SelectOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  emptyText?: string
  labelText?: string
  labelledBy?: string
  width?: string
}

export const Combobox = ({
  options,
  value,
  defaultValue = '',
  onValueChange,
  placeholder = '입력하거나 선택하세요',
  emptyText = '결과가 없습니다.',
  labelText,
  labelledBy,
  width = '100%',
}: ComboboxProps) => {
  // Hooks
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const scrollNext = useRef(false)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState<string | null>(null)
  const [highlight, setHighlight] = useState(0)
  const { mounted, closing } = useExitAnimation(open)
  const [current, setCurrent] = useControllable(value, defaultValue, onValueChange)
  const uid = useId()
  useDismiss(rootRef, open, () => setOpen(false))

  // Computed
  const selected = options.find((option) => option.value === current)
  const list = filterOptions(options, text ?? '')
  const label = labelledBy ? undefined : (labelText ?? '항목 선택')

  // Watchers
  useEffect(() => {
    if (!scrollNext.current) return
    scrollNext.current = false
    listRef.current
      ?.querySelector('[data-highlighted="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [highlight, open])

  // Functions
  function optionId(index: number) {
    return `${uid}-${index}`
  }
  function openList() {
    setHighlight(
      Math.max(
        0,
        list.findIndex((option) => option.value === current),
      ),
    )
    scrollNext.current = true
    setOpen(true)
  }
  function move(index: number) {
    scrollNext.current = true
    setHighlight(index)
  }
  function commitText() {
    if (text === null) return
    const typed = text.trim()
    if (!typed) setCurrent('')
    else {
      const hit = options.find((option) => option.label.toLowerCase() === typed.toLowerCase())
      if (hit) setCurrent(hit.value)
    }
    setText(null)
  }
  function pick(option: SelectOption) {
    setCurrent(option.value)
    setText(null)
    setOpen(false)
    inputRef.current?.focus()
  }

  // Handlers
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) openList()
      else move(nextIndex(event.key, highlight, list.length) ?? 0)
    } else if (event.key === 'Enter') {
      const target = list[highlight]
      if (open && target) {
        event.preventDefault()
        pick(target)
      } else if (text !== null) {
        event.preventDefault()
        commitText()
      }
    } else if (event.key === 'Escape') {
      if (open) {
        event.preventDefault()
        setOpen(false)
      } else if (text !== null) {
        event.preventDefault()
        setText(null)
      }
    }
  }
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value)
    setHighlight(0)
    setOpen(true)
  }
  const handleInputClick = () => {
    if (!open) openList()
  }
  const handleBlur = () => {
    commitText()
    setOpen(false)
  }
  const handleToggleClick = () => {
    if (open) setOpen(false)
    else openList()
    inputRef.current?.focus()
  }

  return (
    <div ref={rootRef} className="relative font-sans text-foreground" style={{ width }}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-label={label}
        aria-labelledby={labelledBy}
        aria-expanded={open}
        aria-controls={mounted ? `${uid}-list` : undefined}
        aria-activedescendant={open && list[highlight] ? optionId(highlight) : undefined}
        placeholder={placeholder}
        value={text ?? selected?.label ?? ''}
        onChange={handleChange}
        onClick={handleInputClick}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={`h-9 w-full min-w-0 rounded-md border border-border bg-white py-1 pr-9 pl-3 text-sm text-foreground shadow-control outline-none transition-[color,box-shadow,border-color] duration-150 placeholder:text-muted-foreground ${focusRing}`}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={open ? '목록 닫기' : '목록 열기'}
        onMouseDown={(event) => event.preventDefault()}
        onClick={handleToggleClick}
        className="absolute top-1 right-1 flex size-7 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-foreground outline-none transition-colors duration-150 hover:bg-muted"
      >
        <ChevronUpDownIcon className="size-4 opacity-50 pointer-events-none" />
      </button>
      {mounted && (
        <div
          className={`${popoverPanel} ${popoverMotion(closing)} top-[calc(100%+4px)] left-0 w-full min-w-[200px] origin-top-left overflow-hidden`}
        >
          <div
            ref={listRef}
            id={`${uid}-list`}
            role="listbox"
            aria-label={label}
            aria-labelledby={labelledBy}
            className="max-h-[300px] overflow-x-hidden overflow-y-auto p-1"
          >
            {list.length === 0 && <p className="m-0 py-5 text-center text-sm">{emptyText}</p>}
            {list.map((option, index) => (
              <button
                key={option.value}
                id={optionId(index)}
                type="button"
                role="option"
                aria-selected={option.value === current}
                data-highlighted={index === highlight}
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(option)}
                onPointerMove={() => setHighlight(index)}
                className={`${optionRow} ${index === highlight ? 'bg-muted text-accent-foreground' : ''}`}
              >
                {option.label}
                <span className={`ml-auto flex ${option.value === current ? '' : 'opacity-0'}`}>
                  <CheckIcon />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
