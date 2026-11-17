import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  TOAST_MAX,
  TOAST_TIMEOUT,
  dismissToast,
  pauseToasts,
  resetToasts,
  resumeToasts,
  toast,
  useToastStore,
} from './toast-store'

const toasts = () => useToastStore.getState().toasts

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  resetToasts()
  vi.useRealTimers()
})

describe('toast', () => {
  it('adds a toast from a string title', () => {
    toast('저장했습니다')
    expect(toasts()).toMatchObject([{ title: '저장했습니다', description: '', out: false }])
  })

  it('keeps multibyte, emoji and markup-like text verbatim', () => {
    toast({ title: '<img src=x onerror=alert(1)> 😀 日本語', description: "'; DROP TABLE" })
    expect(toasts()[0]).toMatchObject({ title: '<img src=x onerror=alert(1)> 😀 日本語' })
  })

  it('gives every toast a unique id', () => {
    const ids = new Set([toast('a'), toast('a'), toast('a')])
    expect(ids.size).toBe(3)
  })

  it('marks the toast out after the timeout and removes it after the exit animation', () => {
    toast('a')
    vi.advanceTimersByTime(TOAST_TIMEOUT - 1)
    expect(toasts()[0].out).toBe(false)
    vi.advanceTimersByTime(1)
    expect(toasts()[0].out).toBe(true)
    vi.advanceTimersByTime(500)
    expect(toasts()).toEqual([])
  })

  it('caps live toasts and drops the oldest', () => {
    for (let i = 0; i < TOAST_MAX + 5; i++) toast(`t${i}`)
    expect(toasts()).toHaveLength(TOAST_MAX)
    expect(toasts()[0].title).toBe('t5')
  })

  it('leaves no pending timers after everything is dismissed', () => {
    for (let i = 0; i < 20; i++) toast(`t${i}`)
    vi.advanceTimersByTime(TOAST_TIMEOUT + 1000)
    expect(toasts()).toEqual([])
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('dismissToast', () => {
  it('records the swipe direction and ignores repeated or unknown dismissals', () => {
    const id = toast('a')
    dismissToast(id, 'right')
    dismissToast(id, 'down')
    dismissToast('missing')
    expect(toasts()[0]).toMatchObject({ out: true, dir: 'right' })
  })

  it('cancels the auto-dismiss timer', () => {
    const id = toast('a')
    dismissToast(id)
    expect(vi.getTimerCount()).toBe(1)
  })
})

describe('pauseToasts / resumeToasts', () => {
  it('stops the countdown while paused and resumes with at least one second left', () => {
    toast('a')
    vi.advanceTimersByTime(4500)
    pauseToasts()
    vi.advanceTimersByTime(60_000)
    expect(toasts()[0].out).toBe(false)
    resumeToasts()
    vi.advanceTimersByTime(999)
    expect(toasts()[0].out).toBe(false)
    vi.advanceTimersByTime(1)
    expect(toasts()[0].out).toBe(true)
  })

  it('does not start a timer for toasts created while paused until resumed', () => {
    pauseToasts()
    toast('a')
    vi.advanceTimersByTime(60_000)
    expect(toasts()[0].out).toBe(false)
    resumeToasts()
    vi.advanceTimersByTime(TOAST_TIMEOUT)
    expect(toasts()[0].out).toBe(true)
  })

  it('is idempotent', () => {
    toast('a')
    pauseToasts()
    pauseToasts()
    resumeToasts()
    resumeToasts()
    vi.advanceTimersByTime(TOAST_TIMEOUT)
    expect(toasts()[0].out).toBe(true)
  })

  it('keeps the remaining toast paused after another one is dismissed until resumed', () => {
    const first = toast('a')
    toast('b')
    pauseToasts()
    dismissToast(first)
    vi.advanceTimersByTime(60_000)
    expect(toasts()).toMatchObject([{ title: 'b', out: false }])
    resumeToasts()
    vi.advanceTimersByTime(TOAST_TIMEOUT)
    expect(toasts()[0].out).toBe(true)
  })
})
