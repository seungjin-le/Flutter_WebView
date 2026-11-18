import { expect, test } from '@playwright/test'

const route = '**/prototype-tabs/index.html'
const frame = 'iframe[src="/prototype-tabs/index.html"]'
const fixture = `<script>
  window.addEventListener('message', (e) => document.body.dataset.tab = e.data.tab)
  window.parent.postMessage({type:'prototype-ready'},new URL(document.URL).origin)
</script><body>화면</body>`

test('loads one isolated tab document on first use and keeps it across navigation', async ({
  page,
}) => {
  await page.route(route, (r) => r.fulfill({ contentType: 'text/html', body: fixture }))
  await page.goto('/')
  await expect(page.locator(frame)).toHaveCount(0)
  await page.getByRole('link', { name: '탐색' }).click()
  const host = page.locator(frame)
  const child = page.frameLocator(frame).locator('body')
  await expect(host).toHaveAttribute('sandbox', 'allow-scripts')
  await expect(child).toHaveAttribute('data-tab', 'explore')
  await child.evaluate((el) => (el.dataset.marker = 'retained'))
  await page.getByRole('link', { name: '혜택' }).click()
  await expect(child).toHaveAttribute('data-tab', 'benefits')
  await page.evaluate(() =>
    window.postMessage({ type: 'prototype-open', tab: 'home' }, window.origin),
  )
  await child.evaluate(() =>
    parent.postMessage(
      { type: 'prototype-open', tab: 'home', play: 'bad-id' },
      new URL(document.URL).origin,
    ),
  )
  await expect(page).toHaveURL(/\/benefits$/)
  await child.evaluate(() =>
    parent.postMessage(
      { type: 'prototype-open', tab: 'home', play: 't3' },
      new URL(document.URL).origin,
    ),
  )
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(host).toBeHidden()
  await expect(child).toHaveAttribute('data-tab', 'inactive')
  await child.evaluate(() =>
    parent.postMessage({ type: 'prototype-open', tab: 'profile' }, new URL(document.URL).origin),
  )
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: '닫기', exact: true }).click()
  await expect(page).toHaveURL(/\/benefits$/)
  await expect(child).toHaveAttribute('data-tab', 'benefits')
  await expect(child).toHaveAttribute('data-marker', 'retained')
})

test('retries a tab document that fails to initialize', async ({ page }) => {
  let fail = true
  await page.route(route, (r) =>
    r.fulfill({
      status: fail ? 503 : 200,
      contentType: 'text/html',
      body: fail ? 'Unavailable' : fixture,
    }),
  )
  await page.clock.install()
  await page.goto('/profile')
  await expect(page.locator(frame)).toHaveCount(1)
  await page.clock.fastForward(16000)
  const retry = page.getByRole('button', { name: '다시 시도' })
  await expect(retry).toBeVisible()
  fail = false
  await retry.click()
  await expect(page.frameLocator(frame).locator('body')).toHaveAttribute('data-tab', 'profile')
})

test('opens a tab from a trailing-slash link with a query and fragment', async ({ page }) => {
  await page.goto('/explore/?source=app#detail')
  await expect(
    page.frameLocator(frame).getByRole('heading', { level: 1, name: '탐색', exact: true }),
  ).toBeVisible()
})

test('gives profile editing the full prototype frame and restores the tab bar on close', async ({
  page,
}) => {
  await page.goto('/profile')
  const app = page.frameLocator(frame)
  const bar = page.getByRole('navigation', { name: '하단 메뉴', includeHidden: true })
  await app.getByRole('button', { name: '편집', exact: true }).click()
  await expect(app.getByRole('heading', { name: '프로필 수정' })).toBeVisible()
  await expect(bar).toBeHidden()
  await app.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('navigation', { name: '하단 메뉴' })).toBeVisible()
})
