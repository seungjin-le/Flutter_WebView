import { create } from 'zustand'

export type ToastDirection = '' | 'down' | 'right'
export type ToastInput = { title: string; description?: string }
export type ToastItem = {
  id: string
  title: string
  description: string
  out: boolean
  dir: ToastDirection
}

export const TOAST_TIMEOUT = 5000
export const TOAST_MAX = 5
const EXIT_MS = 500
const MIN_RESUME_MS = 1000

type Countdown = { handle: ReturnType<typeof setTimeout> | null; left: number; start: number }

export const useToastStore = create<{ toasts: ToastItem[] }>(() => ({ toasts: [] }))

const countdowns = new Map<string, Countdown>()
const exits = new Map<string, ReturnType<typeof setTimeout>>()
let paused = false
let counter = 0

const setToasts = (update: (toasts: ToastItem[]) => ToastItem[]) =>
  useToastStore.setState((state) => ({ toasts: update(state.toasts) }))

const clearCountdown = (id: string) => {
  const countdown = countdowns.get(id)
  if (countdown?.handle) clearTimeout(countdown.handle)
  countdowns.delete(id)
}

const clearExit = (id: string) => {
  clearTimeout(exits.get(id))
  exits.delete(id)
}

const arm = (id: string, ms: number) => {
  clearCountdown(id)
  const handle = paused ? null : setTimeout(() => dismissToast(id), ms)
  countdowns.set(id, { handle, left: ms, start: Date.now() })
}

export const dismissToast = (id: string, dir: ToastDirection = '') => {
  clearCountdown(id)
  if (!useToastStore.getState().toasts.some((item) => item.id === id && !item.out)) return
  setToasts((list) => list.map((item) => (item.id === id ? { ...item, out: true, dir } : item)))
  if (!useToastStore.getState().toasts.some((item) => !item.out)) paused = false
  exits.set(
    id,
    setTimeout(() => {
      exits.delete(id)
      setToasts((list) => list.filter((item) => item.id !== id))
    }, EXIT_MS),
  )
}

export const toast = (input: ToastInput | string) => {
  const { title, description = '' } = typeof input === 'string' ? { title: input } : input
  const id = `toast-${++counter}`
  const live = useToastStore.getState().toasts.filter((item) => !item.out)
  const dropped = new Set(live.slice(0, Math.max(0, live.length + 1 - TOAST_MAX)).map((t) => t.id))
  dropped.forEach((droppedId) => {
    clearCountdown(droppedId)
    clearExit(droppedId)
  })
  setToasts((list) => [
    ...list.filter((item) => !dropped.has(item.id)),
    { id, title, description, out: false, dir: '' },
  ])
  arm(id, TOAST_TIMEOUT)
  return id
}

export const pauseToasts = () => {
  if (paused) return
  paused = true
  countdowns.forEach((countdown) => {
    if (!countdown.handle) return
    clearTimeout(countdown.handle)
    countdown.handle = null
    countdown.left = Math.max(MIN_RESUME_MS, countdown.left - (Date.now() - countdown.start))
  })
}

export const resumeToasts = () => {
  if (!paused) return
  paused = false
  countdowns.forEach((countdown, id) => {
    countdown.start = Date.now()
    countdown.handle = setTimeout(() => dismissToast(id), countdown.left)
  })
}

export const resetToasts = () => {
  countdowns.forEach((_, id) => clearCountdown(id))
  exits.forEach((_, id) => clearExit(id))
  paused = false
  useToastStore.setState({ toasts: [] })
}
