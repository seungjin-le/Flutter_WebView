import { test, expect } from '@playwright/test'

test('gallery renders heading and the Button section with design tokens', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/components')
  await expect(page.getByRole('heading', { level: 1, name: '컴포넌트' })).toBeVisible()
  const section = page.getByRole('region', { name: 'Button' })
  await expect(section).toBeVisible()
  await expect(section.getByRole('heading', { level: 2, name: 'Button' })).toBeVisible()
  const primary = section.getByRole('button', { name: '기본' })
  await expect(primary).toHaveCSS('background-color', 'rgb(37, 99, 235)')
  await expect(primary).toHaveCSS('border-radius', '6px')
  await expect(primary).toHaveCSS('height', '36px')
  await expect(section.getByRole('button', { name: '삭제' })).toHaveCSS('color', 'rgb(193, 0, 7)')
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  expect(errors).toEqual([])
})

test('Button shows focus ring on keyboard focus and respects disabled', async ({ page }) => {
  await page.goto('/components')
  const section = page.getByRole('region', { name: 'Button' })
  await section.getByRole('button', { name: '기본' }).focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(section.getByRole('button', { name: '기본' })).toHaveCSS(
    'border-color',
    'rgb(96, 165, 250)',
  )
  await expect(section.getByRole('button', { name: '비활성' })).toBeDisabled()
})

test('Noto Sans KR is the first body font and keeps system fallbacks', async ({ page }) => {
  await page.goto('/components')
  const family = await page.locator('body').evaluate((el) => getComputedStyle(el).fontFamily)
  expect(family.startsWith('"Noto Sans KR"')).toBe(true)
  expect(family).toMatch(/-apple-system/)
  await expect(
    page.locator('link[href*="fonts.googleapis.com"][href*="Noto+Sans+KR"]'),
  ).toHaveCount(1)
})

test('root route renders the posts page and trailing-slash components route works', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: '게시글' })).toBeVisible()
  await page.goto('/components/')
  await expect(page.getByRole('heading', { level: 1, name: '컴포넌트' })).toBeVisible()
})

test('unknown routes do not crash the app', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/does-not-exist')
  await expect(page.locator('#root')).not.toBeEmpty()
  await expect(page.getByText('Not Found')).toBeVisible()
  expect(errors).toEqual([])
})

test('reduced motion keeps the spinner rotating slowly and stops the skeleton', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/components')
  const spinner = page.locator('.animate-spinner').first()
  await expect(spinner).toHaveCSS('animation-duration', '3s')
  await expect(spinner).toHaveCSS('animation-iteration-count', 'infinite')
  await expect(page.locator('.animate-skeleton').first()).toHaveCSS('animation-name', 'none')
})

test('upload shimmer token matches the artboard', async ({ page }) => {
  await page.goto('/components')
  const value = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--animate-upload-shimmer'),
  )
  expect(value.trim()).toBe('upload-shimmer 1.6s linear infinite')
})

test('default easing is ease and shell-ring token resolves', async ({ page }) => {
  await page.goto('/components')
  const [easing, ring] = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement)
    return [
      s.getPropertyValue('--default-transition-timing-function').trim(),
      s.getPropertyValue('--color-shell-ring').trim(),
    ]
  })
  expect(easing).toBe('ease')
  expect(ring).toBe('#a1a1aa')
})

test('the gallery route is split out of the entry chunk', async ({ page }) => {
  const scripts: string[] = []
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(r.url())
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: '게시글' })).toBeVisible()
  expect(scripts.some((u) => /Upload|ComponentsGallery/.test(u))).toBe(false)
})
