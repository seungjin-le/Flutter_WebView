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
