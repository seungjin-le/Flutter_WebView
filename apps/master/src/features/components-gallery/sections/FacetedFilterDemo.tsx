import { useState } from 'react'
import { FacetedFilter } from '../../../components/ui/FacetedFilter'
import { STATUSES } from '../../posts/post-search'
import type { GallerySection } from '../ComponentsGalleryPage'

export const section: GallerySection = { id: 'faceted-filter', title: 'Faceted Filter', order: 32 }

export const Demo = () => {
  // Hooks
  const [status, setStatus] = useState<string[]>([])
  return (
    <div className="flex flex-col items-start gap-2">
      <FacetedFilter title="상태" options={STATUSES} values={status} onValuesChange={setStatus} />
      <p className="text-sm text-muted-foreground">
        선택된 상태: {status.length > 0 ? status.join(', ') : '없음'}
      </p>
    </div>
  )
}
