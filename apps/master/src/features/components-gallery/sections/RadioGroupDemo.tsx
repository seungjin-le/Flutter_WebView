import { useState } from 'react'
import { RadioGroup, type RadioOption } from '../../../components/ui/RadioGroup'
import type { GallerySection } from '../ComponentsGalleryPage'

export const section: GallerySection = { id: 'radio-group', title: 'Radio Group', order: 22 }

const options: RadioOption[] = [
  { value: 'a', label: '[옵션 A]' },
  { value: 'b', label: '[옵션 B]' },
  { value: 'c', label: '[옵션 C]' },
]

const sortOptions: RadioOption[] = [
  { value: 'latest', label: '최신순' },
  { value: 'oldest', label: '오래된순' },
  { value: 'views', label: '조회순' },
]

export const Demo = () => {
  // Hooks
  const [sort, setSort] = useState('latest')

  // Computed
  const sortLabel = sortOptions.find((o) => o.value === sort)?.label

  return (
    <div className="grid gap-6">
      <RadioGroup options={options} aria-label="옵션" />
      <div className="grid gap-3">
        <span id="rg-sort-label" className="text-sm font-medium">
          정렬
        </span>
        <RadioGroup
          options={sortOptions}
          orientation="horizontal"
          aria-labelledby="rg-sort-label"
          value={sort}
          onValueChange={setSort}
        />
        <p className="text-xs text-muted-foreground">정렬 기준: {sortLabel}</p>
      </div>
    </div>
  )
}
