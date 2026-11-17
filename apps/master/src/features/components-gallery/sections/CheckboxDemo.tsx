import { useState } from 'react'
import { Checkbox } from '../../../components/ui/Checkbox'
import type { GallerySection } from '../ComponentsGalleryPage'

export const section: GallerySection = { id: 'checkbox', title: 'Checkbox', order: 20 }

export const Demo = () => {
  // Hooks
  const [agreed, setAgreed] = useState(false)

  return (
    <div className="grid gap-4">
      <Checkbox label="체크박스" />
      <Checkbox label="선택됨" defaultChecked />
      <Checkbox label="약관에 동의합니다" checked={agreed} onCheckedChange={setAgreed} />
      <p className="text-xs text-muted-foreground">상태: {agreed ? '선택' : '해제'}</p>
    </div>
  )
}
