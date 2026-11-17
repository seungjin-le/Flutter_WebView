import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Sidebar } from '../../components/layout/Sidebar'
import { ChevronRightIcon, PlusIcon } from '../../components/ui/icons'
import { DataTable } from './components/DataTable'
import { SearchForm } from './components/SearchForm'
import { defaultPostSearchParams } from './post-search'
import type { PostSearchQuery } from './post-types'

const LOADING_MS = 600

// Main artboard buttons: zinc borders and a zinc focus ring, no transition.
const headerButton =
  'inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-shell-ring/60'
const headerButtonOutline = `${headerButton} border-shell-border bg-white text-shell-strong shadow-[0_1px_2px_rgba(0,0,0,.04)] hover:bg-shell-hover`
const headerButtonPrimary = `${headerButton} border-primary bg-primary text-white hover:border-primary-hover hover:bg-primary-hover`

const PanelIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="size-4"
  >
    <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M9 3v18" />
  </svg>
)

const DownloadIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="size-4"
  >
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 21h14" />
  </svg>
)

export const PostsPage = () => {
  // Hooks
  const timer = useRef<number | undefined>(undefined)
  const [collapsed, setCollapsed] = useState(false)
  const [loading, setLoading] = useState(false)
  const search = useSearch({ from: '/' })
  const navigate = useNavigate({ from: '/' })

  // Computed
  const { page, ...applied } = { ...defaultPostSearchParams, ...search }
  const toggleLabel = collapsed ? '사이드바 펼치기' : '사이드바 접기'

  // Watchers
  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Functions
  function go(query: PostSearchQuery, nextPage: number) {
    void navigate({ search: { ...query, page: nextPage } })
  }

  // Handlers
  const handleToggle = () => setCollapsed((value) => !value)

  const handleSearch = (next: PostSearchQuery) => {
    window.clearTimeout(timer.current)
    setLoading(true)
    timer.current = window.setTimeout(() => setLoading(false), LOADING_MS)
    go(next, 1)
  }

  const handlePageChange = (index: number) => go(applied, index + 1)

  const handlePageSizeChange = (size: number) => go({ ...applied, size: String(size) }, 1)

  return (
    <div className="flex min-h-screen flex-wrap items-stretch bg-surface font-sans text-shell-foreground">
      <Sidebar collapsed={collapsed} onToggle={handleToggle} />
      <main className="flex min-w-0 flex-[999_1_560px] flex-col">
        <header className="box-border flex h-14 shrink-0 items-center gap-2 border-b border-shell-border px-4">
          <button
            type="button"
            aria-label={toggleLabel}
            onClick={handleToggle}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-0 text-shell-strong outline-none hover:bg-shell-hover focus-visible:ring-3 focus-visible:ring-shell-ring/60"
          >
            <PanelIcon />
          </button>
          <div aria-hidden="true" className="mx-1 h-4 w-px bg-shell-border" />
          <nav aria-label="현재 위치">
            <ol className="m-0 flex list-none items-center gap-1.5 p-0 text-sm text-shell-muted">
              <li>
                <Link to="/" className="no-underline hover:text-shell-strong">
                  콘텐츠
                </Link>
              </li>
              <li aria-hidden="true" className="flex">
                <ChevronRightIcon className="size-3.5" />
              </li>
              <li aria-current="page" className="text-shell-foreground">
                게시글
              </li>
            </ol>
          </nav>
        </header>

        <div className="flex flex-col gap-6 p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <h1 className="m-0 text-2xl leading-[1.3] font-semibold tracking-[-0.01em]">
                게시글
              </h1>
              <p className="m-0 text-sm text-shell-muted">게시글을 검색하고 관리합니다.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={headerButtonOutline}>
                <DownloadIcon />
                내보내기
              </button>
              <button type="button" className={headerButtonPrimary}>
                <PlusIcon />새 글 작성
              </button>
            </div>
          </div>

          <SearchForm applied={applied} onSearch={handleSearch} />

          <section aria-labelledby="result-title" className="flex flex-col gap-3">
            <h2 id="result-title" className="m-0 text-[16px] leading-[normal] font-semibold">
              검색 결과
            </h2>
            <DataTable
              query={applied}
              loading={loading}
              page={page - 1}
              pageSize={Number(applied.size)}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </section>
        </div>
      </main>
    </div>
  )
}
