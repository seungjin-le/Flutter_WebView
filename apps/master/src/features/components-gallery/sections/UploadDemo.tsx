import { useState } from 'react'
import type { ReactNode } from 'react'
import { Upload } from '../../../components/ui/Upload'
import type { GallerySection } from '../ComponentsGalleryPage'

export const section: GallerySection = { id: 'upload', title: 'Upload', order: 60 }

const Slot = ({ caption, children }: { caption: string; children: ReactNode }) => (
  <div role="group" aria-label={caption} className="flex min-w-0 flex-col gap-3">
    <span className="text-xs font-medium text-muted-foreground">{caption}</span>
    {children}
  </div>
)

export const Demo = () => {
  // Hooks
  const [done, setDone] = useState(0)
  return (
    <div className="grid grid-cols-1 items-start gap-x-10 gap-y-12 md:grid-cols-2">
      <Slot caption="이미지 · 여러 장">
        <Upload kind="image" onChange={(files) => setDone(files.length)} />
        <p className="m-0 text-xs text-muted-foreground">완료된 파일 {done}개</p>
      </Slot>
      <Slot caption="이미지 · 1장">
        <Upload kind="image" multiple={false} />
      </Slot>
      <Slot caption="파일 · 여러 개">
        <Upload kind="file" />
      </Slot>
      <Slot caption="파일 · 1개">
        <Upload kind="file" multiple={false} accept=".pdf,.docx,.xlsx,.hwp" />
      </Slot>
    </div>
  )
}
