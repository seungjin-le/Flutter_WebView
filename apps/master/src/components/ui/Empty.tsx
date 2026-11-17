import type { ReactNode } from 'react'
import { Button } from './Button'

type EmptyIcon = 'search' | 'folder' | 'file'

type EmptyProps = {
  icon?: EmptyIcon
  title: string
  description?: string
  actionLabel?: string
  secondaryLabel?: string
  onAction?: () => void
  onSecondary?: () => void
  bordered?: boolean
  className?: string
}

const icons: Record<EmptyIcon, ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  folder: (
    <>
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      <path d="M12 10v6" />
      <path d="M9 13h6" />
    </>
  ),
  file: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </>
  ),
}

export const Empty = ({
  icon = 'search',
  title,
  description,
  actionLabel,
  secondaryLabel,
  onAction,
  onSecondary,
  bordered = false,
  className,
}: EmptyProps) => (
  <div
    data-slot="empty"
    className={[
      'flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg px-6 py-12 text-center',
      bordered ? 'border border-dashed border-border' : 'border-0',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <div className="flex max-w-96 flex-col items-center gap-2">
      <div
        aria-hidden="true"
        className="mb-2 flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-6"
        >
          {icons[icon]}
        </svg>
      </div>
      <p className="m-0 text-lg leading-7 font-medium tracking-[-0.01em]">{title}</p>
      {description && (
        <p className="m-0 text-sm leading-[1.625] text-muted-foreground">{description}</p>
      )}
    </div>
    {(actionLabel || secondaryLabel) && (
      <div className="flex max-w-96 min-w-0 justify-center gap-2">
        {actionLabel && <Button onClick={onAction}>{actionLabel}</Button>}
        {secondaryLabel && (
          <Button variant="outline" className="hover:text-foreground!" onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        )}
      </div>
    )}
  </div>
)
