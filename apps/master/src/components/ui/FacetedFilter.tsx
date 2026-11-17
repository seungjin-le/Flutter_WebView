import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
} from 'react'
import { useControllable } from '../../hooks/use-controllable'
import { useDismiss } from '../../hooks/use-dismiss'
import { useExitAnimation } from '../../hooks/use-exit-animation'
import { CheckIcon, SearchIcon } from './icons'
import {
  filterOptions,
  focusRing,
  nextIndex,
  optionRow,
  popoverMotion,
  popoverPanel,
  type SelectOption,
} from './popover-utils'

export type FacetedFilterProps = {
  options: SelectOption[]
  title?: string
  values?: string[]
  defaultValues?: string[]
  onValuesChange?: (values: string[]) => void
  labelText?: string
  labelledBy?: string
}

const noValues: string[] = []

const PlusCircleIcon = () => (
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
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12h8" />
    <path d="M12 8v8" />
  </svg>
)

export const FacetedFilter = ({
  options,
  title = '상태',
  values,
  defaultValues = noValues,
  onValuesChange,
  labelText,
  labelledBy,
}: FacetedFilterProps) => {
  // Hooks
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const { mounted, closing } = useExitAnimation(open)
  const [selected, setSelected] = useControllable(values, defaultValues, onValuesChange)
  const uid = useId()
  useDismiss(rootRef, open, () => setOpen(false))

  // Computed
  const list = filterOptions(options, query)
  const any = selected.length > 0
  const length = list.length + (any ? 1 : 0)
  const clearIndex = list.length
  const labels = selected.flatMap((value) => options.find((o) => o.value === value)?.label ?? [])
  const badges = labels.length > 2 ? [`${labels.length}개 선택`] : labels
  const activeIndex = highlight < list.length ? highlight : any ? clearIndex : -1

  // Watchers
  useEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open])

  // Functions
  function optionId(index: number) {
    return `${uid}-${index}`
  }
  function toggleValue(value: string) {
    setSelected(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
    )
  }
  function clear() {
    setSelected([])
    setHighlight(0)
  }
  function activate(index: number) {
    const target = list[index]
    if (target) toggleValue(target.value)
    else if (any) clear()
  }

  // Handlers
  const handleClear = () => clear()
  const handleToggleOpen = () => {
    if (!open) {
      setQuery('')
      setHighlight(0)
    }
    setOpen(!open)
  }
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    // A null relatedTarget is a click on non-focusable panel content or a window blur, not Tab.
    if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget))
      setOpen(false)
  }
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Home/End stay with the text input's caret; only the arrows move the highlight.
    const target =
      event.key === 'ArrowDown' || event.key === 'ArrowUp'
        ? nextIndex(event.key, highlight, length)
        : null
    if (target !== null) {
      event.preventDefault()
      setHighlight(target)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      activate(highlight)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    }
  }
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value)
    setHighlight(0)
  }

  return (
    <div
      ref={rootRef}
      onBlur={handleBlur}
      className="relative flex h-9 items-center font-sans text-foreground"
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={labelledBy ? undefined : (labelText ?? title)}
        aria-labelledby={labelledBy}
        aria-expanded={open}
        onClick={handleToggleOpen}
        className={`inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-dashed border-border bg-white px-2.5 text-sm leading-5 font-medium text-foreground shadow-control outline-none transition-all duration-150 hover:bg-muted hover:text-accent-foreground aria-expanded:bg-white ${focusRing}`}
      >
        <PlusCircleIcon />
        {title}
        {any && (
          <>
            <span aria-hidden="true" className="mx-2 h-4 w-px bg-border" />
            <span className="flex gap-1">
              {badges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center rounded-sm border border-transparent bg-muted px-1 py-0.5 text-xs leading-4 font-normal whitespace-nowrap text-accent-foreground"
                >
                  {badge}
                </span>
              ))}
            </span>
          </>
        )}
      </button>
      {mounted && (
        <div
          className={`${popoverPanel} ${popoverMotion(closing)} top-[calc(100%+4px)] left-0 w-[200px] origin-top-left overflow-hidden`}
        >
          <div className="flex h-9 items-center gap-2 border-b border-border px-3">
            <SearchIcon className="size-4 shrink-0 opacity-50" />
            <input
              ref={searchRef}
              type="text"
              role="combobox"
              autoComplete="off"
              aria-label={`${title} 검색`}
              aria-expanded
              aria-controls={`${uid}-list`}
              aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
              placeholder={title}
              value={query}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              className="h-10 w-full border-0 bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div
            id={`${uid}-list`}
            role="listbox"
            aria-multiselectable="true"
            aria-label={title}
            className="max-h-[300px] overflow-x-hidden overflow-y-auto"
          >
            {list.length === 0 && <p className="m-0 py-6 text-center text-sm">결과가 없습니다.</p>}
            {list.length > 0 && (
              <div className="p-1">
                {list.map((option, index) => {
                  const on = selected.includes(option.value)
                  return (
                    <button
                      key={option.value}
                      id={optionId(index)}
                      type="button"
                      role="option"
                      aria-selected={on}
                      tabIndex={-1}
                      onClick={() => toggleValue(option.value)}
                      onPointerMove={() => setHighlight(index)}
                      className={`${optionRow} ${index === highlight ? 'bg-muted text-accent-foreground' : ''}`}
                    >
                      <span
                        className={`flex size-4 shrink-0 items-center justify-center rounded-sm border border-primary ${on ? 'bg-primary text-white' : 'opacity-50'}`}
                      >
                        <CheckIcon className={`size-3.5 ${on ? '' : 'invisible'}`} />
                      </span>
                      <span>{option.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
            {any && (
              <>
                <div className="h-px bg-border" />
                <div className="p-1">
                  <button
                    id={optionId(clearIndex)}
                    type="button"
                    role="option"
                    aria-selected={false}
                    tabIndex={-1}
                    onClick={handleClear}
                    onPointerMove={() => setHighlight(clearIndex)}
                    className={`${optionRow} justify-center ${highlight === clearIndex ? 'bg-muted text-accent-foreground' : ''}`}
                  >
                    필터 지우기
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
