import { Skeleton } from '../../../components/ui/Skeleton'
import type { GallerySection } from '../ComponentsGalleryPage'

export const section: GallerySection = { id: 'skeleton', title: 'Skeleton', order: 52 }

export const Demo = () => (
  <div className="flex items-center gap-4">
    <Skeleton width="48px" height="48px" radius="999px" className="shrink-0" />
    <div className="flex min-w-0 flex-col gap-2">
      <Skeleton width="250px" className="max-w-full" />
      <Skeleton width="200px" className="max-w-full" />
    </div>
  </div>
)
