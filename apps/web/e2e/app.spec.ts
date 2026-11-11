import { test, expect } from '@playwright/test'

test('browser mode is accessible and does not claim a native connection', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Luckieverse' })).toBeVisible()
  await expect(page.getByRole('button', { name: '앱 연결 확인' })).toBeDisabled()
  await expect(page.getByRole('status')).toContainText('브라우저')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(overflow).toBe(false)
})

test('native bridge mock replies, survives reload and supports repeated checks', async ({ page }) => {
  await page.addInitScript(() => {
    window.LuckieverseBridge = { postMessage(message: string) {
      const request = JSON.parse(message)
      window.dispatchEvent(new CustomEvent('luckieverse:response', {
        detail: { ...request, type: 'pong', platform: 'ios' },
      }))
    } }
  })
  await page.goto('/')
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: '앱 연결 확인' }).click()
    await expect(page.getByRole('status')).toContainText('iOS 앱과 연결됐어')
    await page.reload()
  }
  await page.getByRole('button', { name: '앱 연결 확인' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status')).toContainText('iOS 앱과 연결됐어')
})

test('a silent native transport times out and can be retried', async ({ page }) => {
  await page.addInitScript(() => { window.LuckieverseBridge = { postMessage() {} } })
  await page.clock.install()
  await page.goto('/')
  await page.getByRole('button', { name: '앱 연결 확인' }).click()
  await expect(page.getByRole('button', { name: '확인 중' })).toBeDisabled()
  await page.clock.fastForward(5100)
  await expect(page.getByRole('status')).toContainText('시간')
  await expect(page.getByRole('button', { name: '앱 연결 확인' })).toBeEnabled()
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
