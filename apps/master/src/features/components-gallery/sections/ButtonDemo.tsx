import { Button } from '../../../components/ui/Button'
import { PlusIcon } from '../../../components/ui/icons'
import type { GallerySection } from '../ComponentsGalleryPage'

export const section: GallerySection = { id: 'button', title: 'Button', order: 10 }

export const Demo = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Button>기본</Button>
    <Button variant="outline">아웃라인</Button>
    <Button variant="ghost">고스트</Button>
    <Button variant="destructive">삭제</Button>
    <Button size="sm">작게</Button>
    <Button size="icon" aria-label="추가">
      <PlusIcon />
    </Button>
    <Button disabled>비활성</Button>
  </div>
)
