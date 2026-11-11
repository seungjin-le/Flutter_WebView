import { test, expect } from '@playwright/test'

test('master opens independently and preserves its empty state after reload', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  for (let visit = 0; visit < 2; visit++) {
    await expect(page).toHaveTitle('Luckieverse Master')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ko')
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: '관리 콘솔' })).toBeVisible()
    await expect(page.getByText('등록된 관리 메뉴가 없어.')).toBeVisible()
    expect(await page.evaluate(() => 'LuckieverseBridge' in window)).toBe(false)
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    if (visit === 0) await page.reload()
  }
  expect(errors).toEqual([])
})

// Preflight resets the old design while app-local utilities remain available.
test('Tailwind resets custom styles and utilities work at responsive boundaries', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toHaveCSS('margin', '0px')
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-size', '16px')
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-weight', '400')
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(page.getByRole('main')).toHaveCSS('padding', '0px')
  await expect(page.getByRole('main')).toHaveCSS('max-width', 'none')
  await expect(page.locator('section')).toHaveCSS('border-top-width', '0px')
  await page.evaluate(() => {
    const probe = document.createElement('div')
    probe.id = 'tailwind-probe'
    probe.className = 'grid gap-2 p-4 md:p-8'
    document.body.append(probe)
  })
  const probe = page.locator('#tailwind-probe')
  await expect(probe).toHaveCSS('display', 'grid')
  await expect(probe).toHaveCSS('gap', '8px')
  await page.setViewportSize({ width: 767, height: 900 })
  await expect(probe).toHaveCSS('padding', '16px')
  await page.setViewportSize({ width: 768, height: 900 })
  await expect(probe).toHaveCSS('padding', '32px')
})
