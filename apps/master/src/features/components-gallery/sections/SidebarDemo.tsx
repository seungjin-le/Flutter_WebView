import { useState } from 'react'
import { Sidebar } from '../../../components/layout/Sidebar'
import type { GallerySection } from '../ComponentsGalleryPage'

export const section: GallerySection = { id: 'sidebar', title: 'Sidebar', order: 5 }

export const Demo = () => {
  // Hooks
  const [collapsed, setCollapsed] = useState(false)

  // Handlers
  const handleToggle = () => setCollapsed(!collapsed)

  return (
    <div className="flex flex-wrap items-stretch overflow-hidden rounded-lg border border-shell-border bg-white">
      <Sidebar collapsed={collapsed} onToggle={handleToggle} />
      <div data-testid="demo-content" className="flex min-w-0 flex-[999_1_560px] flex-col">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-shell-border px-4">
          <button
            type="button"
            data-testid="demo-toggle"
            aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
            onClick={handleToggle}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-0 text-shell-strong outline-none hover:bg-shell-hover focus-visible:ring-3 focus-visible:ring-shell-ring/60"
          >
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
          </button>
        </div>
        <p className="m-0 p-6 text-sm text-shell-muted">게시글을 검색하고 관리합니다.</p>
      </div>
    </div>
  )
}
