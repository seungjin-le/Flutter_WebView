import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '../../../components/ui/Button'
import { Checkbox } from '../../../components/ui/Checkbox'
import { Combobox } from '../../../components/ui/Combobox'
import { DateRangePicker } from '../../../components/ui/DateRangePicker'
import { FacetedFilter } from '../../../components/ui/FacetedFilter'
import { ChevronUpDownIcon, SearchIcon, XIcon } from '../../../components/ui/icons'
import { RadioGroup } from '../../../components/ui/RadioGroup'
import { Select } from '../../../components/ui/Select'
import { Switch } from '../../../components/ui/Switch'
import { toast } from '../../../components/ui/toast-store'
import {
  AUTHORS,
  buildBadges,
  CATEGORIES,
  FIELDS,
  initialPostSearch,
  validateKeyword,
  SHOW_POSITIONS,
  SIZES,
  SORTS,
  STATUSES,
} from '../post-search'
import type { PostSearchQuery } from '../post-types'

export type SearchFormProps = {
  /** Query currently applied (e.g. from the URL); the form follows it when it changes. */
  applied?: PostSearchQuery
  /** When omitted the form confirms the search with a toast instead. */
  onSearch?: (query: PostSearchQuery) => void
  advancedOpen?: boolean
}

const labelClass = 'flex items-center gap-2 text-sm leading-none font-medium select-none'
const gridClass = 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-6'

export const SearchForm = ({ applied, onSearch, advancedOpen = true }: SearchFormProps) => {
  // Hooks
  const uid = useId()
  const keywordRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState(applied ?? initialPostSearch)
  const [submitted, setSubmitted] = useState(false)
  const [advanced, setAdvanced] = useState<boolean | null>(null)
  const [syncedKey, setSyncedKey] = useState(JSON.stringify(applied))

  // Computed
  const appliedKey = JSON.stringify(applied)
  const advancedShown = advanced ?? advancedOpen
  const error = submitted ? validateKeyword(query.kw) : ''
  const badges = buildBadges(query)

  // Watchers
  if (applied && appliedKey !== syncedKey) {
    setSyncedKey(appliedKey)
    setQuery(applied)
    setSubmitted(false)
  }

  // Functions
  function id(name: string) {
    return `${uid}-${name}`
  }

  function setField<K extends keyof PostSearchQuery>(key: K) {
    return (value: PostSearchQuery[K]) => setQuery((q) => ({ ...q, [key]: value }))
  }

  function renderField(name: string, label: string, control: ReactNode) {
    return (
      <div className="flex flex-col gap-2">
        <span id={id(name)} className={labelClass}>
          {label}
        </span>
        {control}
      </div>
    )
  }

  // Handlers
  const handleShowOnChange = (value: string) => (checked: boolean) =>
    setQuery((q) => ({
      ...q,
      showOn: checked
        ? [...q.showOn.filter((v) => v !== value), value]
        : q.showOn.filter((v) => v !== value),
    }))

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (validateKeyword(query.kw)) return keywordRef.current?.focus()
    if (onSearch) return onSearch(query)
    toast({
      title: '검색 조건을 적용했습니다',
      description: badges.length
        ? `필터 ${badges.length}개로 게시글을 검색합니다.`
        : '전체 게시글을 검색합니다.',
    })
  }

  const handleReset = () => {
    setQuery(initialPostSearch)
    setSubmitted(false)
    onSearch?.(initialPostSearch)
  }

  const handleAdvancedToggle = () => setAdvanced(!advancedShown)

  const handleRangeChange = (from: string, to: string) => setQuery((q) => ({ ...q, from, to }))

  return (
    <section
      aria-labelledby={id('title')}
      className="flex w-full flex-col gap-6 rounded-xl border border-border bg-surface py-6 font-sans text-foreground shadow-sm"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1.5 px-6">
        <h2 id={id('title')} className="col-start-1 m-0 text-base leading-none font-semibold">
          검색 필터
        </h2>
        <p className="col-start-1 m-0 text-sm leading-5 text-muted-foreground">
          조건을 조합해 게시글을 찾습니다.
        </p>
        <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={advancedShown}
            aria-controls={id('adv')}
            onClick={handleAdvancedToggle}
          >
            상세 검색
            <ChevronUpDownIcon />
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="m-0 flex flex-col gap-6">
        <div className="flex flex-col gap-6 px-6">
          <div className="flex flex-col gap-2">
            <label
              htmlFor={id('kw')}
              className={`${labelClass} ${error ? 'text-destructive' : 'text-foreground'}`}
            >
              검색어
            </label>
            <div className="flex w-full items-stretch">
              <Select
                attach="left"
                minWidth="128px"
                width="auto"
                labelText="검색 대상"
                options={FIELDS}
                value={query.field}
                onValueChange={setField('field')}
              />
              <div className="relative min-w-0 flex-1">
                <SearchIcon className="pointer-events-none absolute top-2.5 left-3 z-11 size-4 text-muted-foreground" />
                <input
                  ref={keywordRef}
                  id={id('kw')}
                  type="text"
                  autoComplete="off"
                  placeholder="검색어를 입력하세요"
                  aria-invalid={!!error}
                  aria-describedby={`${id('kw-desc')} ${id('kw-msg')}`}
                  value={query.kw}
                  onChange={(event) => setField('kw')(event.target.value)}
                  className="h-9 w-full min-w-0 rounded-md rounded-l-none border border-l-0 border-border bg-transparent py-1 pr-3 pl-9 text-sm text-foreground shadow-control transition-[color,box-shadow,border-color] duration-150 outline-none placeholder:text-muted-foreground focus-visible:relative focus-visible:z-10 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-primary/30 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/20"
                />
              </div>
            </div>
            <p id={id('kw-desc')} className="m-0 text-sm leading-5 text-muted-foreground">
              제목, 내용 또는 태그에서 2자 이상으로 검색합니다.
            </p>
            {error && (
              <p id={id('kw-msg')} className="m-0 text-sm leading-5 text-destructive">
                {error}
              </p>
            )}
          </div>

          <div className={gridClass}>
            {renderField(
              'cat',
              '카테고리',
              <Select
                labelledBy={id('cat')}
                options={CATEGORIES}
                value={query.category}
                onValueChange={setField('category')}
              />,
            )}
            {renderField(
              'author',
              '작성자',
              <Combobox
                labelledBy={id('author')}
                placeholder="작성자 입력 또는 선택"
                emptyText="검색 결과가 없습니다."
                options={AUTHORS}
                value={query.author}
                onValueChange={setField('author')}
              />,
            )}
            {renderField(
              'date',
              '등록일',
              <DateRangePicker
                labelledBy={id('date')}
                from={query.from}
                to={query.to}
                onRangeChange={handleRangeChange}
              />,
            )}
            {renderField(
              'status',
              '게시 상태',
              <div>
                <FacetedFilter
                  labelledBy={id('status')}
                  title="상태"
                  options={STATUSES}
                  values={query.status}
                  onValuesChange={setField('status')}
                />
              </div>,
            )}
          </div>

          {advancedShown && (
            <div id={id('adv')} className="flex flex-col gap-6">
              <div className="h-px bg-border" />
              <div className={gridClass}>
                <div
                  role="group"
                  aria-labelledby={id('show')}
                  className="col-span-full flex flex-col gap-3"
                >
                  <span id={id('show')} className={labelClass}>
                    노출 위치
                  </span>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    {SHOW_POSITIONS.map((x) => (
                      <Checkbox
                        key={x.value}
                        id={id(`show-${x.value}`)}
                        label={x.label}
                        checked={query.showOn.includes(x.value)}
                        onCheckedChange={handleShowOnChange(x.value)}
                      />
                    ))}
                  </div>
                </div>
                <div className="col-span-full flex flex-col gap-3">
                  <span id={id('sort')} className={labelClass}>
                    정렬
                  </span>
                  <RadioGroup
                    orientation="horizontal"
                    aria-labelledby={id('sort')}
                    options={SORTS}
                    value={query.sort}
                    onValueChange={setField('sort')}
                  />
                </div>
                {renderField(
                  'size',
                  '목록 개수',
                  <Select
                    labelledBy={id('size')}
                    options={SIZES}
                    value={query.size}
                    onValueChange={setField('size')}
                  />,
                )}
                <div className="flex flex-col gap-3">
                  <span className={labelClass}>옵션</span>
                  <Switch
                    id={id('pin')}
                    label="상단 고정 글만 보기"
                    checked={query.pinned}
                    onCheckedChange={setField('pinned')}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 pt-6">
          <div className="flex min-w-0 flex-[1_1_320px] flex-wrap items-center gap-1.5">
            {badges.length === 0 ? (
              <span className="text-sm text-muted-foreground">적용된 필터가 없습니다.</span>
            ) : (
              <ul aria-label="적용된 필터" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                {badges.map((badge) => (
                  <li
                    key={badge.label}
                    className="inline-flex items-center justify-center gap-1 rounded-md border border-transparent bg-muted px-2 py-0.5 text-xs leading-4 font-medium whitespace-nowrap text-accent-foreground"
                  >
                    {badge.label}
                    <button
                      type="button"
                      aria-label={`${badge.label} 필터 제거`}
                      onClick={() => setQuery((q) => ({ ...q, ...badge.clear }))}
                      className="-mr-1 flex size-3.5 cursor-pointer items-center justify-center rounded-[3px] border-0 bg-transparent p-0 text-inherit opacity-60 outline-none hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary/45"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              초기화
            </Button>
            <Button type="submit">검색</Button>
          </div>
        </div>
      </form>
    </section>
  )
}
