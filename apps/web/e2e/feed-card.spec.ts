import { expect, test } from '@playwright/test'

test('card actions work independently of opening the player', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.addInitScript(() => Object.defineProperty(navigator, 'share', { value: undefined }))
  await page.goto('/')
  const card = page.getByRole('article').first()
  const like = card.getByRole('button', { name: /^좋아요/ })
  await like.click()
  await expect(like).toHaveAttribute('aria-pressed', 'true')
  await like.click()
  await expect(like).toHaveAttribute('aria-pressed', 'false')
  await card.getByRole('button', { name: /^공유/ }).click()
  const shared = new URL(await page.evaluate(() => navigator.clipboard.readText()))
  expect(shared.origin).toBe(new URL(page.url()).origin)
  expect(shared.searchParams.get('feed')).toBeTruthy()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
