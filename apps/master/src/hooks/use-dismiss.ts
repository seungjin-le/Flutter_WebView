import { useEffect, useRef, type RefObject } from 'react'

/** Calls onDismiss on pointerdown outside `ref` (capture phase) or Escape while `open`. */
export const useDismiss = (
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onDismiss: () => void,
) => {
  const latest = useRef(onDismiss)
  useEffect(() => {
    latest.current = onDismiss
  })
  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) latest.current()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') latest.current()
    }
    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [ref, open])
}
