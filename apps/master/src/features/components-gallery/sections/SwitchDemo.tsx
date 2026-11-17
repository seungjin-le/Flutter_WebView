import { useState } from 'react'
import { Switch } from '../../../components/ui/Switch'
import type { GallerySection } from '../ComponentsGalleryPage'

export const section: GallerySection = { id: 'switch', title: 'Switch', order: 21 }

export const Demo = () => {
  // Hooks
  const [pinned, setPinned] = useState(false)

  return (
    <div className="grid gap-4">
      <Switch label="스위치" />
      <Switch label="활성" defaultChecked />
      <Switch label="상단 고정 글만 보기" checked={pinned} onCheckedChange={setPinned} />
      <p className="text-xs text-muted-foreground">상태: {pinned ? '켜짐' : '꺼짐'}</p>
    </div>
  )
}
