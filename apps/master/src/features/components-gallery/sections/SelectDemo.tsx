import { useState } from 'react'
import { Select } from '../../../components/ui/Select'
import type { GallerySection } from '../ComponentsGalleryPage'

export const section: GallerySection = { id: 'select', title: 'Select', order: 30 }

const options = [
  { value: 'all', label: '전체' },
  { value: 'opt1', label: '[옵션 1]' },
  { value: 'opt2', label: '[옵션 2]' },
  { value: 'opt3', label: '[옵션 3]' },
]
const sizeOptions = ['10', '20', '50'].map((value) => ({ value, label: value }))

export const Demo = () => {
  // Hooks
  const [size, setSize] = useState('10')
  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="w-70">
        <Select labelText="기본 선택" options={options} />
      </div>
      <div className="flex flex-col gap-2">
        <span id="select-size-label" className="text-sm font-medium">
          페이지당 행
        </span>
        <Select
          width="80px"
          labelledBy="select-size-label"
          options={sizeOptions}
          value={size}
          onValueChange={setSize}
        />
        <p className="text-sm text-muted-foreground">페이지 크기: {size}</p>
      </div>
      <div className="flex">
        <Select
          attach="left"
          minWidth="128px"
          width="auto"
          labelText="검색 대상"
          options={options}
        />
        <input
          aria-label="검색어"
          placeholder="검색어"
          className="h-9 rounded-r-md border border-l-0 border-border px-3 text-sm outline-none"
        />
      </div>
    </div>
  )
}
