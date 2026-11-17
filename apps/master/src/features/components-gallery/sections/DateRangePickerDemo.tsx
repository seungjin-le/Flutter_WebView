import { useState } from 'react'
import { DateRangePicker } from '../../../components/ui/DateRangePicker'
import type { GallerySection } from '../ComponentsGalleryPage'

export const section: GallerySection = {
  id: 'date-range-picker',
  title: 'Date Range Picker',
  order: 40,
}

export const Demo = () => {
  // Hooks
  const [range, setRange] = useState({ from: '2028-02-28', to: '2028-03-02' })
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
      <div className="flex w-full max-w-xs flex-col gap-2">
        <span className="text-sm font-medium">기본</span>
        <DateRangePicker />
      </div>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <span id="drp-demo-label" className="text-sm font-medium">
          조회 기간
        </span>
        <DateRangePicker
          labelledBy="drp-demo-label"
          from={range.from}
          to={range.to}
          onRangeChange={(from, to) => setRange({ from, to })}
        />
        <p data-testid="drp-value" className="text-xs text-muted-foreground">
          {range.from || '미선택'} ~ {range.to || '미선택'}
        </p>
      </div>
    </div>
  )
}
