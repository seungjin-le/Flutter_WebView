import { useId, useState, type ReactNode } from 'react'
import { AlertDialog } from '../../../components/ui/AlertDialog'
import { Button } from '../../../components/ui/Button'
import { DropdownMenu, type MenuEntry } from '../../../components/ui/DropdownMenu'
import { Empty } from '../../../components/ui/Empty'
import { ChevronLeftIcon, ChevronRightIcon } from '../../../components/ui/icons'
import { Select } from '../../../components/ui/Select'
import { Skeleton } from '../../../components/ui/Skeleton'
import { toast } from '../../../components/ui/toast-store'
import { AUTHORS, CATEGORIES, labelOf, STATUSES } from '../post-search'
import type { Post, PostSearchQuery, PostStatus } from '../post-types'
import { createSamplePosts } from '../posts-data'
import { filterPosts, pageNumbers, paginate, sortFromQuery, sortPosts } from '../posts-table'

export type DataTableProps = {
  query?: PostSearchQuery | null
  loading?: boolean
  /** Zero-based page index. */
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

const sizeOptions = ['10', '20', '50', '100'].map((value) => ({ value, label: value }))
const skeletonWidths = ['220px', '180px', '240px', '160px', '200px']
const COLUMN_COUNT = 7

const badgeStyles: Record<PostStatus, string> = {
  published: 'border-primary-soft-border-strong bg-primary-soft text-primary-hover',
  scheduled: 'bg-muted text-accent-foreground',
  archived: 'bg-muted text-accent-foreground',
  draft: 'border-border text-foreground',
  private: 'border-border text-foreground',
}

const th = 'h-10 whitespace-nowrap px-2 text-left align-middle font-medium text-foreground'
const td = 'whitespace-nowrap p-2 align-middle'
const pageButton =
  'inline-flex size-9 cursor-pointer items-center justify-center rounded-md border p-0 text-sm font-medium tabular-nums outline-none transition-all duration-150 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-primary/30'
const pageButtonIdle =
  'border-transparent bg-transparent text-foreground hover:bg-muted hover:text-accent-foreground'
const pageButtonActive =
  'border-primary-soft-border-strong bg-primary-soft text-primary-hover hover:bg-primary-soft-border'

const DoubleChevron = ({ d }: { d: [string, string] }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="pointer-events-none size-4 shrink-0"
  >
    <path d={d[0]} />
    <path d={d[1]} />
  </svg>
)

const TableCheckbox = ({
  checked,
  label,
  onToggle,
  children,
}: {
  checked: boolean | 'mixed'
  label: string
  onToggle: () => void
  children: ReactNode
}) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    aria-label={label}
    onClick={onToggle}
    className={[
      'flex size-4 translate-y-0.5 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border p-0 text-white shadow-control outline-none transition-[box-shadow,background-color,border-color] duration-150 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-primary/30',
      checked ? 'border-primary bg-primary' : 'border-border bg-transparent',
    ].join(' ')}
  >
    {checked ? (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    ) : null}
  </button>
)

const CheckPath = () => <path d="M20 6 9 17l-5-5" />
const MinusPath = () => <path d="M5 12h14" />

const rowMenu = (status: PostStatus): MenuEntry[] => [
  { type: 'label', label: '작업' },
  { value: 'edit', label: '수정' },
  { value: 'copy', label: 'ID 복사' },
  { value: 'publish', label: status === 'published' ? '게시 중지' : '게시하기' },
  { type: 'separator' },
  { value: 'delete', label: '삭제', variant: 'destructive' },
]

export const DataTable = ({
  query = null,
  loading = false,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: DataTableProps) => {
  // Hooks
  const sizeLabelId = useId()
  const [rows, setRows] = useState<Post[]>(() => createSamplePosts())
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [delIds, setDelIds] = useState<string[]>([])
  const [delOpen, setDelOpen] = useState(false)
  const [prevQuery, setPrevQuery] = useState(query)

  // Computed
  const filtered = sortPosts(filterPosts(rows, query), sortFromQuery(query?.sort))
  const total = filtered.length
  const { pages, page: current } = paginate(total, pageSize, page)
  const slice = filtered.slice(current * pageSize, current * pageSize + pageSize)
  const selectedCount = filtered.filter((r) => selected[r.id]).length
  const pageSelected = slice.filter((r) => selected[r.id]).length
  const allOn = slice.length > 0 && pageSelected === slice.length
  const headerChecked = allOn ? true : pageSelected > 0 ? 'mixed' : false

  // Watchers
  if (query !== prevQuery) {
    setPrevQuery(query)
    if (query) setSelected({})
  }

  // Functions
  function askDelete(ids: string[]) {
    setDelIds(ids)
    setDelOpen(true)
  }

  function copyId(post: Post) {
    const copied =
      navigator.clipboard?.writeText(post.id) ?? Promise.reject(new Error('no clipboard'))
    copied.then(
      () => toast({ title: 'ID를 복사했습니다', description: post.id }),
      () =>
        toast({ title: 'ID를 복사하지 못했습니다', description: '클립보드에 접근할 수 없습니다.' }),
    )
  }

  // Handlers
  const handleDelete = () => {
    setRows((prev) => prev.filter((r) => !delIds.includes(r.id)))
    setSelected((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([id]) => !delIds.includes(id))),
    )
    toast({
      title: '게시글을 삭제했습니다',
      description: `${delIds.length}개 게시글이 삭제되었습니다.`,
    })
    setDelIds([])
  }

  const handleMenuSelect = (post: Post, value: string) => {
    if (value === 'delete') askDelete([post.id])
    else if (value === 'copy') copyId(post)
    else if (value === 'publish') {
      const next: PostStatus = post.status === 'published' ? 'private' : 'published'
      setRows((prev) => prev.map((r) => (r.id === post.id ? { ...r, status: next } : r)))
      toast({
        title: next === 'published' ? '게시했습니다' : '게시를 중지했습니다',
        description: post.title,
      })
    } else if (value === 'edit') {
      toast({ title: `${post.title} 수정`, description: '수정 화면은 아직 연결되지 않았습니다.' })
    }
  }

  const handleToggleAll = () =>
    setSelected((prev) => ({
      ...prev,
      ...Object.fromEntries(slice.map((r) => [r.id, !allOn])),
    }))

  const handlePageSizeChange = (value: string) => onPageSizeChange(Number(value))

  return (
    <div className="flex w-full flex-col gap-4 font-sans text-foreground">
      <div className="-mb-1 flex flex-wrap items-center justify-between gap-4">
        <span aria-live="polite" className="text-sm text-muted-foreground">
          총 {total}행 중 {selectedCount}행 선택됨
        </span>
        <div className="flex items-center gap-2">
          <span id={sizeLabelId} className="text-sm font-medium">
            페이지당 행
          </span>
          <Select
            width="80px"
            labelledBy={sizeLabelId}
            options={sizeOptions}
            value={String(pageSize)}
            onValueChange={handlePageSizeChange}
          />
        </div>
      </div>

      <div className="relative w-full overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className={`${th} w-10 pr-0`}>
                <TableCheckbox
                  checked={headerChecked}
                  label="현재 페이지 전체 선택"
                  onToggle={handleToggleAll}
                >
                  {headerChecked === 'mixed' ? <MinusPath /> : <CheckPath />}
                </TableCheckbox>
              </th>
              <th scope="col" className={`${th} px-4`}>
                제목
              </th>
              <th scope="col" className={th}>
                작성자
              </th>
              <th scope="col" className={th}>
                카테고리
              </th>
              <th scope="col" className={th}>
                상태
              </th>
              <th scope="col" className={th}>
                등록일
              </th>
              <th scope="col" className={`${th} w-12`}>
                <span className="sr-only">작업</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: pageSize }, (_, i) => (
                <tr
                  key={i}
                  aria-hidden="true"
                  className="h-[49px] border-b border-border last:border-0"
                >
                  <td className={`${td} w-10 pr-0`}>
                    <Skeleton width="16px" height="16px" radius="4px" />
                  </td>
                  <td className={`${td} px-4`}>
                    <Skeleton width={skeletonWidths[i % 5]} />
                  </td>
                  {[0, 1, 2, 3].map((c) => (
                    <td key={c} className={td}>
                      <Skeleton width="72px" />
                    </td>
                  ))}
                  <td className={td}>
                    <Skeleton width="32px" />
                  </td>
                </tr>
              ))}
            {!loading && total === 0 && (
              <tr>
                <td colSpan={COLUMN_COUNT} className="p-0">
                  <Empty
                    icon="search"
                    title="검색 결과가 없습니다"
                    description="검색 조건이나 필터를 바꿔 다시 시도해 보세요."
                    className="h-60"
                  />
                </td>
              </tr>
            )}
            {!loading &&
              slice.map((post) => {
                const on = !!selected[post.id]
                return (
                  <tr
                    key={post.id}
                    aria-selected={on}
                    className={`border-b border-border transition-colors duration-150 last:border-0 ${
                      on ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                  >
                    <td className={`${td} w-10 pr-0`}>
                      <TableCheckbox
                        checked={on}
                        label={`${post.title} 선택`}
                        onToggle={() => setSelected((prev) => ({ ...prev, [post.id]: !on }))}
                      >
                        <CheckPath />
                      </TableCheckbox>
                    </td>
                    <td className={`${td} px-4 font-medium`}>
                      <span className="inline-flex items-center gap-1.5">
                        {post.pinned && (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            role="img"
                            aria-label="상단 고정"
                            className="text-muted-foreground"
                          >
                            <path d="M12 17v5" />
                            <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
                          </svg>
                        )}
                        {post.title}
                      </span>
                    </td>
                    <td className={td}>{labelOf(AUTHORS, post.author) ?? post.author}</td>
                    <td className={`${td} text-muted-foreground`}>
                      {labelOf(CATEGORIES, post.category) ?? post.category}
                    </td>
                    <td className={td}>
                      <span
                        className={`inline-flex items-center whitespace-nowrap rounded-md border border-transparent px-2 py-0.5 text-xs leading-4 font-medium ${badgeStyles[post.status]}`}
                      >
                        {labelOf(STATUSES, post.status) ?? post.status}
                      </span>
                    </td>
                    <td className={`${td} text-muted-foreground tabular-nums`}>
                      {post.date.replace(/-/g, '.')}
                    </td>
                    <td className={`${td} text-right`}>
                      <DropdownMenu
                        ariaLabel={`${post.title} 작업 메뉴`}
                        align="end"
                        items={rowMenu(post.status)}
                        onItemSelect={(value) => handleMenuSelect(post, value)}
                      />
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      <nav aria-label="페이지 이동" className="flex w-full justify-center">
        <ul className="m-0 flex list-none flex-wrap items-center justify-center gap-1 p-0">
          <li>
            <Button
              variant="ghost"
              size="icon"
              aria-label="첫 페이지"
              disabled={current <= 0}
              onClick={() => onPageChange(0)}
            >
              <DoubleChevron d={['m11 17-5-5 5-5', 'm18 17-5-5 5-5']} />
            </Button>
          </li>
          <li>
            <Button
              variant="ghost"
              size="icon"
              aria-label="이전 페이지"
              disabled={current <= 0}
              onClick={() => onPageChange(current - 1)}
            >
              <ChevronLeftIcon />
            </Button>
          </li>
          {pageNumbers(current, pages).map((i) => (
            <li key={i}>
              <button
                type="button"
                aria-label={`${i + 1}페이지${i === current ? ', 현재 페이지' : ''}`}
                aria-current={i === current ? 'page' : undefined}
                onClick={() => onPageChange(i)}
                className={`${pageButton} ${i === current ? pageButtonActive : pageButtonIdle}`}
              >
                {i + 1}
              </button>
            </li>
          ))}
          <li>
            <Button
              variant="ghost"
              size="icon"
              aria-label="다음 페이지"
              disabled={current >= pages - 1}
              onClick={() => onPageChange(current + 1)}
            >
              <ChevronRightIcon />
            </Button>
          </li>
          <li>
            <Button
              variant="ghost"
              size="icon"
              aria-label="마지막 페이지"
              disabled={current >= pages - 1}
              onClick={() => onPageChange(pages - 1)}
            >
              <DoubleChevron d={['m6 17 5-5-5-5', 'm13 17 5-5-5-5']} />
            </Button>
          </li>
        </ul>
      </nav>

      <AlertDialog
        hideTrigger
        size="sm"
        media="trash"
        destructive
        open={delOpen}
        onOpenChange={setDelOpen}
        title="게시글을 삭제할까요?"
        description={
          delIds.length > 1
            ? `선택한 ${delIds.length}개의 게시글이 영구적으로 삭제되며 되돌릴 수 없습니다.`
            : '이 게시글이 영구적으로 삭제되며 되돌릴 수 없습니다.'
        }
        cancelLabel="취소"
        actionLabel="삭제"
        onAction={handleDelete}
      />
    </div>
  )
}
