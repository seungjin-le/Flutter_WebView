import { useEffect, useState } from 'react'

/** Keeps `mounted` true for `ms` after `open` turns false so an exit animation can play. */
export const useExitAnimation = (open: boolean, ms = 150) => {
  const [lingering, setLingering] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    setLingering(!open)
  }
  useEffect(() => {
    if (!lingering) return
    const timer = setTimeout(() => setLingering(false), ms)
    return () => clearTimeout(timer)
  }, [lingering, ms])
  return { mounted: open || lingering, closing: !open && lingering }
}
