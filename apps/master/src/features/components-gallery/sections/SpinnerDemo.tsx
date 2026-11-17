import type { ReactNode } from 'react'
import { Spinner } from '../../../components/ui/Spinner'
import type { GallerySection } from '../ComponentsGalleryPage'

export const section: GallerySection = { id: 'spinner', title: 'Spinner', order: 53 }

const Block = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-2">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    {children}
  </div>
)

const pill =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent text-sm leading-5 font-medium'
const buttonBase = `${pill} h-8 cursor-default px-2.5 opacity-50`
const badgeBase =
  'inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md border border-transparent px-2 py-0.5 text-xs leading-4 font-medium'

const buttons = [
  { label: '불러오는 중…', cls: 'bg-primary text-white' },
  { label: '잠시 기다려 주세요', cls: 'border-border bg-white text-foreground' },
  { label: '처리 중', cls: 'bg-muted text-accent-foreground' },
]
const badges = [
  { label: '동기화 중', cls: 'bg-primary text-white' },
  { label: '업데이트 중', cls: 'bg-muted text-accent-foreground' },
  { label: '처리 중', cls: 'border-border text-foreground' },
]

export const Demo = () => (
  <div className="flex flex-col gap-6">
    <Block label="Basic">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted px-4 py-3">
        <Spinner />
        <span className="flex-1 text-sm font-medium">결제를 처리하는 중…</span>
        <span className="text-sm tabular-nums">[금액]</span>
      </div>
    </Block>
    <Block label="Size">
      <div className="flex items-center gap-6">
        {[12, 16, 24, 32].map((size) => (
          <Spinner key={size} size={size} />
        ))}
      </div>
    </Block>
    <Block label="Button">
      <div className="flex flex-wrap items-center gap-2">
        {buttons.map(({ label, cls }) => (
          <button key={label} type="button" disabled className={`${buttonBase} ${cls}`}>
            <Spinner label={null} />
            {label}
          </button>
        ))}
      </div>
    </Block>
    <Block label="Badge">
      <div className="flex flex-wrap items-center gap-2">
        {badges.map(({ label, cls }) => (
          <span key={label} className={`${badgeBase} ${cls}`}>
            <Spinner size={12} label={null} />
            {label}
          </span>
        ))}
      </div>
    </Block>
  </div>
)
