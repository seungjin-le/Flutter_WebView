import { expect, test } from '@playwright/test'

test('bottom navigation opens each destination and keeps creation unavailable', async ({
  page,
}) => {
  await page.goto('/')
  const bar = page.getByRole('navigation', { name: '하단 메뉴' })
  await expect(bar.locator('a, button')).toHaveText(['홈', '탐색', '만들기', '혜택', '프로필'])
  const home = bar.getByRole('link', { name: '홈' })
  await expect(home).toHaveAttribute('aria-current', 'page')
  const homeColor = await bar.evaluate((element) => getComputedStyle(element).backgroundColor)
  await expect(bar.getByRole('button', { name: '만들기' })).toBeDisabled()
  for (const name of ['탐색', '혜택', '프로필', '프로필', '홈']) {
    const tab = bar.getByRole('link', { name })
    await tab.focus()
    await page.keyboard.press('Enter')
    await expect(bar.locator('a[aria-current="page"]')).toHaveText(name)
    if (name === '홈') await expect(bar).toHaveCSS('background-color', homeColor)
    else await expect(bar).not.toHaveCSS('background-color', homeColor)
  }
  await expect(page.getByRole('heading', { name: '홈 피드' })).toBeVisible()
})

test('bottom navigation stays visible without covering the end of narrow content', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/')
  const bar = page.getByRole('navigation', { name: '하단 메뉴' })
  await expect(bar).toBeVisible()
  const main = page.getByRole('main')
  const scroll = main.getByRole('region', { name: '홈 피드' })
  const last = scroll.getByRole('article').last()
  await expect(last).not.toBeInViewport()
  await expect(bar).toBeInViewport({ ratio: 1 })
  const buttons = await bar.locator('a, button').all()
  for (const button of buttons) {
    const size = await button.boundingBox()
    expect(size?.width).toBeGreaterThanOrEqual(44)
    expect(size?.height).toBeGreaterThanOrEqual(44)
  }
  await scroll.evaluate((element) => element.scrollTo(0, element.scrollHeight))
  await expect(last).toBeInViewport({ ratio: 1 })
  await expect
    .poll(() =>
      page.evaluate(() => {
        const main = document.querySelector('main')
        const nav = document.querySelector('nav')
        return main && nav && main.getBoundingClientRect().bottom <= nav.getBoundingClientRect().top
      }),
    )
    .toBe(true)
  await expect(bar).toBeInViewport({ ratio: 1 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
})

test('centers the prototype frame and fills only phone-sized viewports', async ({ page }) => {
  await page.goto('/')
  const frame = page.locator('#root')
  const nav = page.getByRole('navigation', { name: '하단 메뉴' })
  const touch = await page.evaluate(() => matchMedia('(pointer: coarse)').matches)
  await nav.getByRole('link', { name: '탐색' }).click()
  for (const [width, height, full] of [
    [1280, 960, false],
    [820, 1180, false],
    [1024, 768, false],
    [481, 720, false],
    [480, 720, true],
    [390, 844, true],
    [844, 390, touch],
  ] as const) {
    await page.setViewportSize({ width, height })
    const w = full ? width : 390
    const h = full ? height : Math.min(844, height - 32)
    const x = (width - w) / 2
    const y = (height - h) / 2
    await expect.poll(() => frame.boundingBox()).toEqual({ x, y, width: w, height: h })
    await expect(frame).toHaveCSS('border-radius', full ? '0px' : '36px')
    await expect.poll(() => nav.boundingBox()).toEqual({ x, y: y + h - 64, width: w, height: 64 })
  }
  await expect(nav.locator('a[aria-current="page"]')).toHaveText('탐색')
})

test('reserves device safe areas only in the fullscreen layout', async ({ page }) => {
  await page.goto('/')
  const session = await page.context().newCDPSession(page)
  await session.send('Emulation.setSafeAreaInsetsOverride', {
    insets: { top: 24, bottom: 20, left: 8, right: 8 },
  })
  const bar = page.getByRole('navigation', { name: '하단 메뉴' })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(bar).toHaveCSS('padding', '0px 8px 20px')
  await expect(page.getByRole('main')).toHaveCSS('margin', '24px 8px 0px')
  await page.setViewportSize({ width: 820, height: 1180 })
  await expect(bar).toHaveCSS('padding', '0px')
})

test('animates the bar and icon colors when switching tabs', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  const bar = page.getByRole('navigation', { name: '하단 메뉴' })
  await bar.evaluate((nav) => {
    nav.addEventListener('transitionrun', (event) => {
      if (event instanceof TransitionEvent && event.target instanceof HTMLElement) {
        event.target.setAttribute('data-transition-' + event.propertyName, 'started')
      }
    })
  })
  const explore = bar.getByRole('link', { name: '탐색' })
  const benefits = bar.getByRole('link', { name: '혜택' })
  await explore.click()
  await expect(bar).toHaveAttribute('data-transition-background-color', 'started')
  await expect(bar.getByRole('link', { name: '홈' })).toHaveAttribute(
    'data-transition-color',
    'started',
  )
  await expect(explore).toHaveAttribute('data-transition-color', 'started')
  await expect(bar.locator('.bottom-nav-create')).toHaveAttribute(
    'data-transition-background-color',
    'started',
  )
  await expect(bar).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await benefits.evaluate((button) => button.removeAttribute('data-transition-color'))
  await benefits.click()
  await expect(benefits).toHaveAttribute('data-transition-color', 'started')
})

test('applies the final nav colors immediately with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const bar = page.getByRole('navigation', { name: '하단 메뉴' })
  const explore = bar.getByRole('link', { name: '탐색' })
  await explore.click()
  await expect(explore).toHaveAttribute('aria-current', 'page')
  expect(
    await bar.evaluate((nav) => ({
      color: getComputedStyle(nav).backgroundColor,
      activeAnimations: nav.getAnimations({ subtree: true }).length,
    })),
  ).toEqual({ color: 'rgb(255, 255, 255)', activeAnimations: 0 })
  await expect(explore.locator('svg')).toHaveCSS('color', 'rgb(22, 20, 28)')
})

test('opens and reloads each page directly with its corresponding navigation link', async ({
  page,
}) => {
  for (const [path, label, title] of [
    ['/', '홈', '홈 피드'],
    ['/explore', '탐색', '탐색'],
    ['/benefits', '혜택', '혜택'],
    ['/profile', '프로필', '프로필'],
  ]) {
    const url = path + '?source=app#detail'
    await page.goto(url)
    const current = page.getByRole('link', { name: label })
    await expect(current).toHaveAttribute('href', path)
    await expect(current).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible()
    await page.reload()
    await expect(page).toHaveURL(url)
    await expect(current).toHaveAttribute('aria-current', 'page')
    await expect(
      page.getByRole('main').getByRole('heading', { name: title, exact: true }),
    ).toBeVisible()
  }
})

test('tab history follows back and forward and skips reselecting the current page', async ({
  page,
}) => {
  await page.goto('/')
  for (const label of ['탐색', '혜택', '프로필', '프로필']) {
    await page.getByRole('link', { name: label }).click()
    await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible()
  }
  await page.goBack()
  await expect(page).toHaveURL('/benefits')
  await expect(page.locator('a[aria-current="page"]')).toHaveText('혜택')
  await page.goForward()
  await expect(page).toHaveURL('/profile')
  await expect(page.getByRole('heading', { name: '프로필', exact: true })).toBeVisible()
})

test('existing native fixture entry URLs still render the connection demo', async ({ page }) => {
  for (const path of ['/next', '/recover']) {
    await page.goto(path)
    await expect(page).toHaveURL(path)
    await expect(page.getByRole('button', { name: '앱 연결 확인' })).toBeVisible()
  }
})

test('reselecting a deep-linked page preserves its query, fragment and back history', async ({
  page,
}) => {
  await page.goto('/')
  await page.goto('/explore?source=app#detail')
  await page.getByRole('link', { name: '탐색' }).click()
  await expect(page).toHaveURL('/explore?source=app#detail')
  await page.goBack()
  await expect(page).toHaveURL('/')
})
