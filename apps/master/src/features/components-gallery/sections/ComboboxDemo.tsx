import { useState } from 'react'
import { Combobox } from '../../../components/ui/Combobox'
import type { GallerySection } from '../ComponentsGalleryPage'

export const section: GallerySection = { id: 'combobox', title: 'Combobox', order: 31 }

const items = ['A', 'B', 'C', 'D', 'E'].map((key) => ({
  value: key.toLowerCase(),
  label: `[항목 ${key}]`,
}))
const authors = [
  { value: 'hanul', label: '김하늘' },
  { value: 'doyun', label: '이도윤' },
  { value: 'alice', label: 'Alice' },
]

export const Demo = () => {
  // Hooks
  const [author, setAuthor] = useState('')
  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="w-70">
        <Combobox options={items} />
      </div>
      <div className="flex w-70 flex-col gap-2">
        <span id="combobox-author-label" className="text-sm font-medium">
          작성자
        </span>
        <Combobox
          labelledBy="combobox-author-label"
          placeholder="작성자 입력 또는 선택"
          options={authors}
          value={author}
          onValueChange={setAuthor}
        />
        <p className="text-sm text-muted-foreground">작성자: {author || '없음'}</p>
      </div>
    </div>
  )
}
