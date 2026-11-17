import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { DataTable } from '../../posts/components/DataTable'
import { initialPostSearch } from '../../posts/post-search'
import type { PostSearchQuery } from '../../posts/post-types'
import type { GallerySection } from '../ComponentsGalleryPage'

export const section: GallerySection = { id: 'data-table', title: 'Data Table', order: 80 }

const base: PostSearchQuery = { ...initialPostSearch, field: 'title', sort: 'title', size: '10' }

export const Demo = () => {
  // Hooks
  const [query, setQuery] = useState<PostSearchQuery | null>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  // Handlers
  const handleApply = (next: PostSearchQuery) => () => {
    setQuery(next)
    setPage(0)
    setPageSize(Number(next.size))
  }

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setPage(0)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setLoading((v) => !v)}>
          로딩 전환
        </Button>
        <Button variant="outline" size="sm" onClick={handleApply({ ...base, kw: '제목 0' })}>
          검색 조건 적용
        </Button>
        <Button variant="outline" size="sm" onClick={handleApply({ ...base, kw: 'zzz' })}>
          결과 없는 검색
        </Button>
        <Button variant="outline" size="sm" onClick={() => setQuery(null)}>
          조건 해제
        </Button>
      </div>
      <DataTable
        query={query}
        loading={loading}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  )
}
