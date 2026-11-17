import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useExitAnimation } from '../../hooks/use-exit-animation'
import { Button } from './Button'

type AlertDialogSize = 'default' | 'sm'
type AlertDialogMedia = 'share' | 'bluetooth' | 'trash'
type TriggerVariant = 'default' | 'outline' | 'destructive'

export type AlertDialogProps = {
  title?: string
  description?: string
  cancelLabel?: string
  actionLabel?: string
  size?: AlertDialogSize
  media?: AlertDialogMedia
  destructive?: boolean
  triggerLabel?: string
  triggerVariant?: TriggerVariant
  hideTrigger?: boolean
  /** Controlled when provided. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onAction?: () => void
}

const mediaIcons: Record<AlertDialogMedia, ReactNode> = {
  share: (
    <>
      <path d="M12 2a10 10 0 0 1 7.38 16.75" />
      <path d="M12 8v8" />
      <path d="M16 12H8" />
      <path d="M2.5 8.875a10 10 0 0 0-.5 3" />
      <path d="M2.83 16a10 10 0 0 0 2.43 3.4" />
      <path d="M4.636 5.235a10 10 0 0 1 .891-.857" />
      <path d="M8.644 21.42a10 10 0 0 0 7.631-.38" />
    </>
  ),
  bluetooth: <path d="m7 7 10 10-5 5V2l5 5L7 17" />,
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </>
  ),
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

let scrollLocks = 0
let overflowBeforeLock = ''

// Counter-based so that overlapping dialogs restore the page scroll only when the last one closes.
const lockScroll = () => {
  if (scrollLocks++ === 0) {
    overflowBeforeLock = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  return () => {
    if (--scrollLocks === 0) document.body.style.overflow = overflowBeforeLock
  }
}

const ancestorsOf = (element: HTMLElement) => {
  const chain: HTMLElement[] = []
  for (let node = element.parentElement; node && node !== document.body; node = node.parentElement)
    chain.push(node)
  return chain
}

// The opener may be gone (e.g. its table row was deleted): fall back to its nearest connected ancestor.
const returnFocus = (opener: HTMLElement, ancestors: HTMLElement[]) => {
  const target = [opener, ...ancestors].find((node) => node.isConnected)
  if (target && target !== opener && !target.hasAttribute('tabindex')) {
    target.setAttribute('tabindex', '-1')
  }
  target?.focus()
}

export const AlertDialog = ({
  title = '정말 진행할까요?',
  description = '이 작업은 되돌릴 수 없습니다. 계정이 영구적으로 삭제되고 서버에서 데이터가 제거됩니다.',
  cancelLabel = '취소',
  actionLabel = '계속',
  size = 'default',
  media,
  destructive = false,
  triggerLabel = '다이얼로그 열기',
  triggerVariant = 'outline',
  hideTrigger = false,
  open,
  onOpenChange,
  onAction,
}: AlertDialogProps) => {
  // Hooks
  const contentRef = useRef<HTMLDivElement>(null)
  const [innerOpen, setInnerOpen] = useState(false)
  const uid = useId()
  const isOpen = open ?? innerOpen
  const { mounted, closing } = useExitAnimation(isOpen, 100)

  // Computed
  const titleId = `${uid}-title`
  const descriptionId = `${uid}-description`
  const isSmall = size === 'sm'
  const withMedia = media !== undefined
  const out = closing ? 'animate-dialog-out' : 'animate-dialog-in'

  // Watchers
  useEffect(() => {
    if (!isOpen) return
    const opener = document.activeElement
    const ancestors = opener instanceof HTMLElement ? ancestorsOf(opener) : []
    const unlockScroll = lockScroll()
    contentRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    return () => {
      unlockScroll()
      if (opener instanceof HTMLElement) returnFocus(opener, ancestors)
    }
  }, [isOpen])

  // Functions
  function setOpen(next: boolean) {
    if (open === undefined) setInnerOpen(next)
    onOpenChange?.(next)
  }

  // Handlers
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      return
    }
    if (event.key !== 'Tab') return
    const box = event.currentTarget
    const focusable = Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE))
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!first || !last) {
      event.preventDefault()
      return
    }
    const active = document.activeElement
    if (event.shiftKey && (active === first || active === box)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <>
      {!hideTrigger && (
        <Button
          variant={triggerVariant}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={() => setOpen(true)}
        >
          {triggerLabel}
        </Button>
      )}
      {mounted &&
        createPortal(
          <>
            <div
              aria-hidden="true"
              className={`fixed inset-0 z-50 isolate bg-black/10 backdrop-blur-[4px] ${
                closing ? 'animate-fade-out' : 'animate-fade-in'
              }`}
              onMouseDown={(event) => event.preventDefault()}
            />
            <div
              ref={contentRef}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={descriptionId}
              data-size={size}
              tabIndex={-1}
              className={`fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-32px)] max-w-[320px] gap-4 rounded-xl bg-surface p-4 text-foreground shadow-[0_0_0_1px_rgba(10,10,10,.1)] outline-none ${out} ${
                closing ? 'pointer-events-none' : ''
              } ${isSmall ? '' : 'sm:max-w-[384px]'}`}
              onKeyDown={handleKeyDown}
            >
              <div
                className={`grid place-items-center gap-1.5 text-center ${
                  withMedia ? 'grid-rows-[auto_auto_1fr] gap-x-4' : 'grid-rows-[auto_1fr]'
                } ${
                  isSmall
                    ? ''
                    : `sm:place-items-start sm:text-left ${
                        withMedia ? 'sm:grid-cols-[auto_1fr] sm:grid-rows-[auto_1fr]' : ''
                      }`
                }`}
              >
                {media && (
                  <div
                    data-slot="media"
                    aria-hidden="true"
                    className={`mb-2 inline-flex size-10 items-center justify-center rounded-md [&_svg]:size-6 ${
                      destructive
                        ? 'bg-destructive/10 text-destructive-foreground'
                        : 'bg-muted text-foreground'
                    } ${isSmall ? '' : 'sm:row-span-2'}`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {mediaIcons[media]}
                    </svg>
                  </div>
                )}
                <h2
                  id={titleId}
                  className={`m-0 text-base leading-6 font-medium ${
                    withMedia && !isSmall ? 'sm:col-start-2' : ''
                  }`}
                >
                  {title}
                </h2>
                <p
                  id={descriptionId}
                  className={`m-0 text-sm leading-5 text-balance text-muted-foreground sm:text-pretty ${
                    withMedia && !isSmall ? 'sm:col-start-2' : ''
                  }`}
                >
                  {description}
                </p>
              </div>
              <div
                data-slot="footer"
                className={`-mx-4 -mb-4 gap-2 rounded-b-xl border-t border-border bg-muted/50 p-4 ${
                  isSmall ? 'grid grid-cols-2' : 'flex flex-col-reverse sm:flex-row sm:justify-end'
                }`}
              >
                <Button variant="outline" data-autofocus="true" onClick={() => setOpen(false)}>
                  {cancelLabel}
                </Button>
                <Button
                  variant={destructive ? 'destructive' : 'default'}
                  onClick={() => {
                    setOpen(false)
                    onAction?.()
                  }}
                >
                  {actionLabel}
                </Button>
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  )
}
