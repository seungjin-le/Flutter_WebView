import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pingNative, isNativeAvailable } from './bridge'

const reply = (id: string, platform = 'android') => window.dispatchEvent(new CustomEvent(
  'luckieverse:response', { detail: { version: 1, id, type: 'pong', platform } },
))

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => {
  window.dispatchEvent(new Event('pagehide'))
  delete window.LuckieverseBridge
  vi.useRealTimers()
})

describe('native bridge contract', () => {
  it('rejects browser-only calls instead of pretending to succeed', async () => {
    expect(isNativeAvailable()).toBe(false)
    await expect(pingNative()).rejects.toThrow('앱')
  })
  it('correlates simultaneous replies even when they arrive out of order', async () => {
    const send = vi.fn()
    window.LuckieverseBridge = { postMessage: send }
    const first = pingNative(); const second = pingNative()
    const one = JSON.parse(send.mock.calls[0][0]); const two = JSON.parse(send.mock.calls[1][0])
    expect(one).toEqual({ version: 1, id: expect.any(String), type: 'ping' })
    expect(one.id).not.toBe(two.id)
    reply(two.id, 'ios'); reply(one.id)
    await expect(first).resolves.toEqual({ version: 1, id: one.id, type: 'pong', platform: 'android' })
    await expect(second).resolves.toHaveProperty('platform', 'ios')
    expect(vi.getTimerCount()).toBe(0)
  })
  it('ignores malformed, empty, falsy and unrelated responses and times out', async () => {
    const send = vi.fn(); window.LuckieverseBridge = { postMessage: send }
    const pending = pingNative(); const check = expect(pending).rejects.toThrow('시간')
    const id = JSON.parse(send.mock.calls[0][0]).id
    for (const detail of [null, undefined, false, 0, '', {}, { version: 0, id, type: 'pong', platform: 'ios' },
      { version: 1, id, type: 'pong', platform: null }, { version: 1, id, type: 'ping', platform: 'ios' }]) {
      window.dispatchEvent(new CustomEvent('luckieverse:response', { detail }))
    }
    reply('unrelated')
    await vi.advanceTimersByTimeAsync(5000); await check
    expect(vi.getTimerCount()).toBe(0)
  })
  it.each(['pagehide', 'beforeunload'])('cancels on %s and rejects stale responses', async (event) => {
    const send = vi.fn(); window.LuckieverseBridge = { postMessage: send }
    const pending = pingNative(); const check = expect(pending).rejects.toThrow('페이지')
    const oldId = JSON.parse(send.mock.calls[0][0]).id
    window.dispatchEvent(new Event(event)); await check
    const fresh = pingNative(); reply(oldId)
    reply(JSON.parse(send.mock.calls[1][0]).id)
    await expect(fresh).resolves.toHaveProperty('type', 'pong')
    expect(vi.getTimerCount()).toBe(0)
  })
  it('handles synchronous transport failure and leaves no pending timeout', async () => {
    window.LuckieverseBridge = { postMessage: () => { throw new Error('transport failed') } }
    await expect(pingNative()).rejects.toThrow('transport failed')
    expect(vi.getTimerCount()).toBe(0)
  })
})

it('works on HTTP development hosts without crypto.randomUUID', async () => {
  const original = crypto.getRandomValues.bind(crypto)
  vi.stubGlobal('crypto', { getRandomValues: original })
  vi.resetModules()
  try {
    const bridge = await import('./bridge')
    window.LuckieverseBridge = { postMessage(message) {
      reply(JSON.parse(message).id)
    } }
    await expect(bridge.pingNative()).resolves.toHaveProperty('type', 'pong')
  } finally { vi.unstubAllGlobals() }
})
