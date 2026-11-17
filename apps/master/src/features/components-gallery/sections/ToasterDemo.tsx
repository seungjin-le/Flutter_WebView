import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { toast } from '../../../components/ui/toast-store'
import type { GallerySection } from '../ComponentsGalleryPage'

export const section: GallerySection = { id: 'toaster', title: 'Toaster', order: 50 }

const samples = (n: number) => [
  { title: '검색 조건을 적용했습니다', description: '전체 게시글을 검색합니다.' },
  { title: '게시글을 저장했습니다', description: '[게시글 제목]' },
  { title: 'ID를 복사했습니다', description: `POST-${1000 + n}` },
]

export const Demo = () => {
  // Hooks
  const [count, setCount] = useState(0)

  // Handlers
  const handleShow = () => {
    const sample = samples(count + 1)[count % 3]
    if (sample) toast(sample)
    setCount(count + 1)
  }

  return (
    <Button variant="outline" className="hover:text-foreground!" onClick={handleShow}>
      토스트 보기
    </Button>
  )
}
