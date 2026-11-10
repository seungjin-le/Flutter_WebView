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
