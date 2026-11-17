import { test, expect, type Page } from '@playwright/test'

const open = async (page: Page) => {
  await page.goto('/components')
  const section = page.getByRole('region', { name: 'Sidebar' })
  const sidebar = section.getByRole('complementary', { name: '관리자 메뉴' })
  await expect(sidebar).toBeVisible()
  return {
    section,
    sidebar,
    toggle: section.getByTestId('demo-toggle'),
    userButton: sidebar.getByRole('button', { name: /관리자명|계정/ }),
    search: sidebar.getByRole('searchbox'),
  }
}

const widthOf = async (locator: ReturnType<Page['locator']>) =>
  Math.round((await locator.boundingBox())?.width ?? -1)

test('expanded sidebar shows groups, design width and the active item', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const { sidebar } = await open(page)
  await expect(sidebar).toHaveAttribute('data-state', 'expanded')
  expect(await widthOf(sidebar)).toBe(256)
  await expect(sidebar).toHaveCSS('background-color', 'rgb(250, 250, 250)')
  for (const label of ['콘텐츠', '회원', '운영', '설정']) {
    await expect(sidebar.getByText(label, { exact: true })).toBeVisible()
  }
  await expect(sidebar.getByRole('navigation').getByRole('button')).toHaveCount(12)
  const active = sidebar.getByRole('navigation').getByRole('button', { name: '게시글' })
  await expect(active).toHaveAttribute('aria-current', 'page')
  await expect(active).not.toHaveAttribute('href')
  await expect(active).toHaveAttribute('type', 'button')
  await expect(active).toHaveCSS('background-color', 'rgb(239, 246, 255)')
  await expect(active).toHaveCSS('color', 'rgb(29, 78, 216)')
  await expect(sidebar.locator('[aria-current="page"]')).toHaveCount(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  expect(errors).toEqual([])
})

test('clicking an item moves aria-current and does not change the URL hash', async ({ page }) => {
  const { sidebar } = await open(page)
  const before = page.url()
  await sidebar.getByRole('navigation').getByRole('button', { name: '배너' }).click()
  await expect(
    sidebar.getByRole('navigation').getByRole('button', { name: '배너' }),
  ).toHaveAttribute('aria-current', 'page')
  await expect(
    sidebar.getByRole('navigation').getByRole('button', { name: '게시글' }),
  ).not.toHaveAttribute('aria-current')
  await expect(sidebar.locator('[aria-current="page"]')).toHaveCount(1)
  expect(page.url()).toBe(before)
})

test('keyboard: Tab reaches items, Enter activates and focus ring is visible', async ({ page }) => {
  const { sidebar, search } = await open(page)
  await search.focus()
  await page.keyboard.press('Tab')
  const first = sidebar.getByRole('navigation').getByRole('button', { name: '대시보드' })
  await expect(first).toBeFocused()
  await expect(first).toHaveCSS('box-shadow', /rgb\(96, 165, 250\)/)
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(
    sidebar.getByRole('navigation').getByRole('button', { name: '게시글' }),
  ).toHaveAttribute('aria-current', 'page')
})

test('search filters case-insensitively, trims, and shows the empty state', async ({ page }) => {
  const { sidebar, search } = await open(page)
  await search.fill('  회원  ')
  await expect(sidebar.getByRole('navigation').getByRole('button')).toHaveCount(1)
  await expect(
    sidebar.getByRole('navigation').getByRole('button', { name: '회원 목록' }),
  ).toBeVisible()
  await expect(sidebar.getByText('콘텐츠', { exact: true })).toBeHidden()
  await search.fill('zzz')
  await expect(sidebar.getByText('일치하는 메뉴가 없습니다.')).toBeVisible()
  await expect(sidebar.getByRole('navigation').getByRole('button')).toHaveCount(0)
  await search.fill('   ')
  await expect(sidebar.getByRole('navigation').getByRole('button')).toHaveCount(12)
  await search.fill('')
  await expect(sidebar.getByText('일치하는 메뉴가 없습니다.')).toBeHidden()
  await search.fill('미디어 ')
  await expect(
    sidebar.getByRole('navigation').getByRole('button', { name: '미디어 라이브러리' }),
  ).toBeVisible()
})

test('search treats markup, regex and emoji as plain text', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const { sidebar, search } = await open(page)
  for (const value of [
    '<img src=x onerror=alert(1)>',
    '.*',
    '(',
    '😀'.repeat(200),
    'a'.repeat(5000),
  ]) {
    await search.fill(value)
    await expect(sidebar.getByText('일치하는 메뉴가 없습니다.')).toBeVisible()
  }
  expect(errors).toEqual([])
})

test('toggle collapses to 48px, hides text and search, then expands again', async ({ page }) => {
  const { sidebar, toggle, search } = await open(page)
  await expect(toggle).toHaveAccessibleName('사이드바 접기')
  await toggle.click()
  await expect(sidebar).toHaveAttribute('data-state', 'collapsed')
  await expect.poll(() => widthOf(sidebar)).toBe(48)
  await expect(toggle).toHaveAccessibleName('사이드바 펼치기')
  await expect(search).toBeHidden()
  await expect(sidebar.getByText('[사이트명]')).toBeHidden()
  await expect(sidebar.getByText('콘텐츠', { exact: true })).toBeHidden()
  const item = sidebar.getByRole('navigation').getByRole('button', { name: '게시글' })
  expect(await widthOf(item)).toBe(32)
  await toggle.click()
  await expect.poll(() => widthOf(sidebar)).toBe(256)
  await expect(search).toBeVisible()
})

test('the sidebar edge rail also toggles', async ({ page }) => {
  const { sidebar } = await open(page)
  await sidebar.getByRole('button', { name: '사이드바 접기' }).click()
  await expect(sidebar).toHaveAttribute('data-state', 'collapsed')
})

test('rapid repeated toggling ends in the parity state', async ({ page }) => {
  const { sidebar, toggle } = await open(page)
  for (let i = 0; i < 7; i += 1) await toggle.click({ delay: 0 })
  await expect(sidebar).toHaveAttribute('data-state', 'collapsed')
  await toggle.click()
  await expect(sidebar).toHaveAttribute('data-state', 'expanded')
})

test('collapsed: items keep accessible names and show a tooltip on hover and keyboard focus', async ({
  page,
  isMobile,
}) => {
  const { sidebar, toggle } = await open(page)
  await toggle.click()
  const item = sidebar.getByRole('navigation').getByRole('button', { name: '게시글' })
  await expect(item).toBeVisible()
  const tip = item.locator('[data-tip]')
  await expect(tip).toBeHidden()
  // touch devices have no hover (Tailwind gates hover: behind @media (hover: hover))
  if (!isMobile) {
    await item.hover()
    await expect(tip).toBeVisible()
    await expect(tip).toHaveCSS('background-color', 'rgb(24, 24, 27)')
    await page.mouse.move(600, 5)
    await expect(tip).toBeHidden()
  }
  await sidebar.getByRole('navigation').getByRole('button', { name: '대시보드' }).focus()
  await page.keyboard.press('Tab')
  await expect(item).toBeFocused()
  await expect(tip).toBeVisible()
})

test('collapsed ignores the filter and it returns after expanding', async ({ page }) => {
  const { sidebar, toggle, search } = await open(page)
  await search.fill('zzz')
  await toggle.click()
  await expect(sidebar.getByRole('navigation').getByRole('button')).toHaveCount(12)
  await expect(sidebar.getByText('일치하는 메뉴가 없습니다.')).toBeHidden()
  await toggle.click()
  await expect(search).toHaveValue('zzz')
  await expect(sidebar.getByText('일치하는 메뉴가 없습니다.')).toBeVisible()
})

test('user menu opens, exposes menu items and closes with Escape', async ({ page }) => {
  const { sidebar, userButton } = await open(page)
  await expect(userButton).toHaveAttribute('aria-haspopup', 'menu')
  await expect(userButton).toHaveAttribute('aria-expanded', 'false')
  await userButton.click()
  await expect(userButton).toHaveAttribute('aria-expanded', 'true')
  const menu = sidebar.getByRole('menu', { name: '계정 메뉴' })
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('menuitem')).toHaveText([/내 계정/, /로그아웃/])
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  await expect(userButton).toHaveAttribute('aria-expanded', 'false')
})

test('user menu closes on outside click, backdrop and menu item pick', async ({ page }) => {
  const { sidebar, userButton } = await open(page)
  const menu = sidebar.getByRole('menu', { name: '계정 메뉴' })
  await userButton.click()
  await page.getByRole('heading', { level: 1, name: '컴포넌트' }).click({ force: true })
  await expect(menu).toHaveCount(0)
  await userButton.click()
  await menu.getByRole('menuitem', { name: '로그아웃' }).click()
  await expect(menu).toHaveCount(0)
  await userButton.click()
  await userButton.click()
  await expect(menu).toHaveCount(0)
})

test('user menu opens above the button when expanded and beside it when collapsed', async ({
  page,
}) => {
  const { sidebar, toggle, userButton } = await open(page)
  const menu = sidebar.getByRole('menu', { name: '계정 메뉴' })
  await userButton.click()
  const button = await userButton.boundingBox()
  await expect
    .poll(async () => {
      const above = await menu.boundingBox()
      return !!above && !!button && above.y + above.height <= button.y
    })
    .toBe(true)
  await toggle.focus()
  await page.keyboard.press('Enter')
  await expect(menu).toHaveCount(0)
  await sidebar.getByRole('button', { name: '계정' }).click()
  await expect(menu).toBeVisible()
  await expect
    .poll(async () => {
      const bar = await sidebar.boundingBox()
      const side = await menu.boundingBox()
      return !!side && !!bar && side.x >= bar.x + bar.width - 1
    })
    .toBe(true)
})

test('rapid user menu toggling leaves a consistent state', async ({ page }) => {
  const { sidebar, userButton } = await open(page)
  for (let i = 0; i < 5; i += 1) await userButton.click({ delay: 0 })
  await expect(sidebar.getByRole('menu')).toHaveCount(1)
  await userButton.click()
  await expect(sidebar.getByRole('menu')).toHaveCount(0)
})

test('layout follows the viewport: wraps above content on narrow screens', async ({ page }) => {
  const { section, sidebar } = await open(page)
  const bar = await sidebar.boundingBox()
  const content = await section.getByTestId('demo-content').boundingBox()
  const narrow = (page.viewportSize()?.width ?? 1280) < 900
  if (narrow) expect(content && bar && content.y >= bar.y + bar.height - 1).toBe(true)
  else expect(content && bar && content.x >= bar.x + bar.width - 1).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
})

test('design details: search icon geometry, easing and keyframe tokens', async ({ page }) => {
  const { sidebar } = await open(page)
  const icon = sidebar.locator('svg:has(circle)').first()
  await expect(icon.locator('circle')).toHaveAttribute('r', '7')
  await expect(icon.locator('path')).toHaveAttribute('d', 'm20 20-3.5-3.5')
  await expect(sidebar).toHaveCSS('transition-timing-function', 'ease')
  expect(await sidebar.locator('style').count()).toBe(0)
  await sidebar.getByRole('button', { name: /관리자명/ }).click()
  const menu = page.getByRole('menu', { name: '계정 메뉴' })
  await expect(menu).toHaveCSS('animation-name', 'sb-pop-in')
})

test('empty-state text keeps line-height normal', async ({ page }) => {
  const { sidebar, search } = await open(page)
  await search.fill('zzz')
  const empty = sidebar.getByText('일치하는 메뉴가 없습니다.')
  await expect(empty).toHaveCSS('line-height', 'normal')
})

test('collapsed tooltip keeps line-height normal', async ({ page }) => {
  const { sidebar, toggle } = await open(page)
  await toggle.click()
  const item = sidebar.getByRole('navigation').getByRole('button', { name: '게시글' })
  await item.focus()
  await expect(item.locator('[data-tip]')).toHaveCSS('line-height', 'normal')
})
