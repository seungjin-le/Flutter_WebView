import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { FoldState } from './fold-state'

let api: typeof import('./fold-state')
const stops: Array<() => void> = []
const duo: FoldState = { platform: 'ios', deviceType: 'ios-duo', posture: 'unfolded' }
const fold: FoldState = { platform: 'android', deviceType: 'android-fold', posture: 'half-opened' }
const reply = (id: string, state: unknown = duo, overrides = {}) => window.dispatchEvent(new CustomEvent(
  'luckieverse:response', { detail: { version: 1, id, type: 'foldState', state, ...overrides } },
))
const request = (send: ReturnType<typeof vi.fn>, index = 0) => JSON.parse(send.mock.calls[index][0])

beforeEach(async () => {
  vi.stubGlobal('window', new EventTarget())
  vi.useFakeTimers()
  vi.resetModules()
  api = await import('./fold-state')
})
afterEach(() => {
  stops.splice(0).forEach((stop) => stop())
  window.dispatchEvent(new Event('pagehide'))
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

it('rejects browser-only queries and reports unavailable subscriptions', async () => {
  await expect(api.getFoldState()).rejects.toThrow('앱')
  const error = vi.fn()
  stops.push(api.subscribeFoldState(vi.fn(), error))
  expect(error).toHaveBeenCalledWith(expect.any(Error))
  expect(vi.getTimerCount()).toBe(0)
})

it('correlates concurrent queries and normalizes both native device types', async () => {
  const send = vi.fn(); window.LuckieverseBridge = { postMessage: send }
  const one = api.getFoldState(); const two = api.getFoldState()
  expect(request(send)).toEqual({ version: 1, id: expect.any(String), type: 'getFoldState' })
  expect(request(send).id).not.toEqual(request(send, 1).id)
  reply(request(send, 1).id, fold); reply(request(send).id, { ...duo, ignored: true })
  await expect(one).resolves.toEqual(duo)
  await expect(two).resolves.toEqual(fold)
  expect(vi.getTimerCount()).toBe(0)
})

it('rejects malformed, falsy, cross-platform and unrelated responses until timeout', async () => {
  const send = vi.fn(); window.LuckieverseBridge = { postMessage: send }
  const pending = api.getFoldState(); const check = expect(pending).rejects.toThrow('시간')
  const id = request(send).id
  for (const state of [null, undefined, false, 0, '', {}, [], { ...duo, platform: 'web' },
    { ...duo, platform: 'android' }, { ...duo, deviceType: null }, { ...duo, posture: 'closed' },
    { ...duo, deviceType: 'unknown' }, { ...fold, posture: 'folded' }]) reply(id, duo, { state })
  reply(id, duo, { version: 0 }); reply(id, duo, { type: 'pong' }); reply('stale', duo)
  window.dispatchEvent(new Event('luckieverse:response'))
  await vi.advanceTimersByTimeAsync(5000); await check
  expect(vi.getTimerCount()).toBe(0)
})

it('preserves unknown rather than inferring a standard device or folded posture', async () => {
  window.LuckieverseBridge = { postMessage(message) {
    reply(JSON.parse(message).id, { platform: 'android', deviceType: 'unknown', posture: 'unknown' })
  } }
  await expect(api.getFoldState()).resolves.toEqual({ platform: 'android', deviceType: 'unknown', posture: 'unknown' })
})

it('shares one subscription, replays its snapshot and stops only after the last unsubscribe', () => {
  const send = vi.fn(); window.LuckieverseBridge = { postMessage: send }
  const first = vi.fn(); const second = vi.fn()
  const stopOne = api.subscribeFoldState(first); stops.push(stopOne)
  const id = request(send).id
  expect(request(send).type).toBe('subscribeFoldState')
  reply(id)
  const stopTwo = api.subscribeFoldState(second); stops.push(stopTwo)
  expect(send).toHaveBeenCalledTimes(1)
  expect(first).toHaveBeenCalledExactlyOnceWith(duo)
  expect(second).toHaveBeenCalledExactlyOnceWith(duo)
  stopOne(); reply(id, { ...duo, posture: 'folded' })
  expect(first).toHaveBeenCalledTimes(1)
  expect(second).toHaveBeenLastCalledWith({ ...duo, posture: 'folded' })
  stopTwo(); stopTwo(); reply(id)
  expect(second).toHaveBeenCalledTimes(2)
  expect(request(send, 1)).toEqual({ version: 1, id, type: 'unsubscribeFoldState' })
  expect(vi.getTimerCount()).toBe(0)
})

it('ignores late responses from an older subscription', () => {
  const send = vi.fn(); window.LuckieverseBridge = { postMessage: send }
  const old = vi.fn(); const stop = api.subscribeFoldState(old); stops.push(stop)
  const oldId = request(send).id; stop()
  const current = vi.fn(); stops.push(api.subscribeFoldState(current))
  const newId = request(send, 2).id
  expect(newId).not.toBe(oldId)
  reply(oldId); expect(current).not.toHaveBeenCalled()
  reply(newId, fold); expect(current).toHaveBeenCalledExactlyOnceWith(fold)
})

it('reports subscription timeout and allows a fresh subscription to retry', async () => {
  const send = vi.fn(); window.LuckieverseBridge = { postMessage: send }
  const error = vi.fn(); const listener = vi.fn()
  const stop = api.subscribeFoldState(listener, error); stops.push(stop)
  const oldId = request(send).id
  await vi.advanceTimersByTimeAsync(5000)
  expect(error).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('시간') }))
  reply(oldId); expect(listener).not.toHaveBeenCalled()
  stop()
  stops.push(api.subscribeFoldState(listener, error))
  const latest = request(send, send.mock.calls.length - 1)
  reply(latest.id, fold)
  expect(listener).toHaveBeenCalledExactlyOnceWith(fold)
})

it('cleans up synchronous transport failures for both queries and subscriptions', async () => {
  window.LuckieverseBridge = { postMessage() { throw new Error('transport failed') } }
  await expect(api.getFoldState()).rejects.toThrow('transport failed')
  const error = vi.fn(); stops.push(api.subscribeFoldState(vi.fn(), error))
  expect(error).toHaveBeenCalledWith(expect.objectContaining({ message: 'transport failed' }))
  expect(vi.getTimerCount()).toBe(0)
})

it('suspends on pagehide, cancels pending requests and resubscribes with a fresh id on pageshow', async () => {
  const send = vi.fn(); window.LuckieverseBridge = { postMessage: send }
  const listener = vi.fn(); stops.push(api.subscribeFoldState(listener))
  const oldId = request(send).id; reply(oldId)
  const pending = api.getFoldState(); const check = expect(pending).rejects.toThrow('페이지')
  window.dispatchEvent(new Event('pagehide')); await check
  reply(oldId, fold); expect(listener).toHaveBeenCalledTimes(1)
  window.dispatchEvent(new Event('pageshow'))
  const last = request(send, send.mock.calls.length - 1)
  expect(last.type).toBe('subscribeFoldState'); expect(last.id).not.toBe(oldId)
  reply(last.id, fold); expect(listener).toHaveBeenLastCalledWith(fold)
  expect(vi.getTimerCount()).toBe(0)
})

it('does not let a consumer corrupt the cached snapshot or interrupt other listeners', () => {
  const send = vi.fn(); window.LuckieverseBridge = { postMessage: send }
  const error = vi.fn()
  stops.push(api.subscribeFoldState(() => { throw new Error('consumer') }, error))
  const listener = vi.fn(); stops.push(api.subscribeFoldState(listener))
  reply(request(send).id, duo)
  expect(error).toHaveBeenCalledWith(expect.objectContaining({ message: 'consumer' }))
  expect(listener).toHaveBeenCalledExactlyOnceWith(duo)
  expect(Object.isFrozen(listener.mock.calls[0][0])).toBe(true)
})

it('allows query-only consumers to resume after bfcache restoration', async () => {
  const send = vi.fn(); window.LuckieverseBridge = { postMessage: send }
  const pending = api.getFoldState(); const check = expect(pending).rejects.toThrow('페이지')
  window.dispatchEvent(new Event('pagehide')); await check
  window.dispatchEvent(new Event('pageshow'))
  const current = api.getFoldState()
  reply(request(send, 1).id)
  await expect(current).resolves.toEqual(duo)
})
