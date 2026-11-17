import { useState } from 'react'
import { SearchForm } from '../../posts/components/SearchForm'
import type { PostSearchQuery } from '../../posts/post-types'
import type { GallerySection } from '../ComponentsGalleryPage'

export const section: GallerySection = { id: 'search-form', title: 'Search Form', order: 70 }

export const Demo = () => {
  const [query, setQuery] = useState<PostSearchQuery | null>(null)
  return (
    <div className="flex flex-col gap-6">
      <div data-testid="sf-toast">
        <SearchForm />
      </div>
      <div data-testid="sf-callback" className="flex flex-col gap-3">
        <SearchForm advancedOpen={false} onSearch={setQuery} />
        <pre data-testid="sf-query" className="m-0 overflow-x-auto text-xs text-muted-foreground">
          {query ? JSON.stringify(query) : '아직 검색하지 않았습니다.'}
        </pre>
      </div>
    </div>
  )
}
