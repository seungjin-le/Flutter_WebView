import { expect, test } from '@playwright/test'

// Exercise the exported API without adding a device demo to the product UI.
const modulePath = '/src/fold-state.ts'

test('native fold mock supports query, live updates, SPA navigation, cleanup and reload', async ({ page }) => {
  await page.addInitScript(() => {
    let subscription: string | undefined
    const state = { platform: 'ios', deviceType: 'ios-duo', posture: 'unfolded' }
    const send = (id: string) => window.dispatchEvent(new CustomEvent('luckieverse:response', {
      detail: { version: 1, id, type: 'foldState', state: { ...state } },
    }))
    window.LuckieverseBridge = { postMessage(message) {
      const request = JSON.parse(message)
      if (request.type === 'getFoldState') send(request.id)
      if (request.type === 'subscribeFoldState') { subscription = request.id; send(request.id) }
      if (request.type === 'unsubscribeFoldState' && subscription === request.id) subscription = undefined
    } }
    window.addEventListener('test:fold', () => {
      state.posture = 'half-opened'
      if (subscription) send(subscription)
    })
  })
  await page.goto('/')
  for (let index = 0; index < 2; index++) {
    const result = await page.evaluate(async (path) => {
      const { getFoldState, subscribeFoldState } = await import(path)
      const query = await getFoldState()
      const states: unknown[] = []
      const stop = subscribeFoldState((state: unknown) => states.push(state))
      history.pushState({}, '', '/spa-path')
      window.dispatchEvent(new Event('test:fold'))
      stop()
      window.dispatchEvent(new Event('test:fold'))
      return { query, states }
    }, modulePath)
    expect(result.query).toEqual({ platform: 'ios', deviceType: 'ios-duo', posture: 'unfolded' })
    expect(result.states).toEqual([
      { platform: 'ios', deviceType: 'ios-duo', posture: 'unfolded' },
      { platform: 'ios', deviceType: 'ios-duo', posture: 'half-opened' },
    ])
    await page.reload()
  }
  await expect(page.getByRole('heading', { name: 'Luckieverse' })).toBeVisible()
})

test('browser-only and silent native fold requests surface errors', async ({ page }) => {
  await page.goto('/')
  const browserError = await page.evaluate(async (path) => {
    const { getFoldState } = await import(path)
    try { await getFoldState(); return '' } catch (error) { return String(error) }
  }, modulePath)
  expect(browserError).toContain('앱')
  await page.clock.install()
  await page.evaluate(async (path) => {
    window.LuckieverseBridge = { postMessage() {} }
    const { getFoldState, subscribeFoldState } = await import(path)
    const errors: string[] = []
    const report = (error: unknown) => {
      errors.push(String(error))
      document.body.dataset.foldErrors = JSON.stringify(errors)
    }
    void getFoldState().catch(report)
    subscribeFoldState(() => {}, report)
  }, modulePath)
  await page.clock.fastForward(5100)
  await expect.poll(async () => JSON.parse(await page.locator('body').getAttribute('data-fold-errors') ?? '[]')).toEqual([expect.stringContaining('시간'), expect.stringContaining('시간')])
})


test('fold responses validate input and correlate concurrent queries without guessing unknown states', async ({ page }) => {
  await page.goto('/')
  const states = await page.evaluate(async (path) => {
    const { getFoldState } = await import(path)
    const requests: Array<{ id: string }> = []
    window.LuckieverseBridge = { postMessage(message) { requests.push(JSON.parse(message)) } }
    const first = getFoldState(); const second = getFoldState()
    const send = (id: string, state: unknown) => window.dispatchEvent(new CustomEvent('luckieverse:response', {
      detail: { version: 1, id, type: 'foldState', state },
    }))
    for (const state of [null, undefined, false, 0, '', {},
      { platform: 'android', deviceType: 'ios-duo', posture: 'unfolded' },
      { platform: 'android', deviceType: 'unknown', posture: 'folded' },
      { platform: 'android', deviceType: 'android-fold', posture: 'folded' }]) send(requests[0].id, state)
    send('stale-document', { platform: 'ios', deviceType: 'ios-duo', posture: 'folded' })
    send(requests[1].id, { platform: 'android', deviceType: 'android-fold', posture: 'half-opened' })
    send(requests[0].id, { platform: 'android', deviceType: 'unknown', posture: 'unknown' })
    return Promise.all([first, second])
  }, modulePath)
  expect(states).toEqual([
    { platform: 'android', deviceType: 'unknown', posture: 'unknown' },
    { platform: 'android', deviceType: 'android-fold', posture: 'half-opened' },
  ])
})

test('fold subscriptions renew document ids after page restoration and ignore stale updates', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async (path) => {
    const { getFoldState, subscribeFoldState } = await import(path)
    const requests: Array<{ id: string; type: string }> = []
    window.LuckieverseBridge = { postMessage(message) { requests.push(JSON.parse(message)) } }
    const states: unknown[] = []
    const stop = subscribeFoldState((state: unknown) => states.push(state))
    const oldId = requests[0].id
    const pending = getFoldState().catch((error: unknown) => String(error))
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    const fresh = requests[requests.length - 1]
    const send = (id: string, posture: string) => window.dispatchEvent(new CustomEvent('luckieverse:response', {
      detail: { version: 1, id, type: 'foldState', state: { platform: 'ios', deviceType: 'ios-duo', posture } },
    }))
    send(oldId, 'folded'); send(fresh.id, 'unfolded')
    stop(); send(fresh.id, 'folded')
    return { states, changedId: oldId !== fresh.id, cancelled: await pending }
  }, modulePath)
  expect(result).toEqual({
    states: [{ platform: 'ios', deviceType: 'ios-duo', posture: 'unfolded' }],
    changedId: true,
    cancelled: expect.stringContaining('페이지'),
  })
})

test('fold transport exceptions reach both API error channels', async ({ page }) => {
  await page.goto('/')
  const errors = await page.evaluate(async (path) => {
    const { getFoldState, subscribeFoldState } = await import(path)
    window.LuckieverseBridge = { postMessage() { throw new Error('transport disconnected') } }
    const errors: string[] = []
    try { await getFoldState() } catch (error) { errors.push(String(error)) }
    const stop = subscribeFoldState(() => {}, (error: unknown) => errors.push(String(error)))
    stop()
    return errors
  }, modulePath)
  expect(errors).toEqual(['Error: transport disconnected', 'Error: transport disconnected'])
})
