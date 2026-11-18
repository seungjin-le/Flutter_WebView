import { expect, test } from '@playwright/test'

test('shows the illustrated cover then snaps to a live iframe while the navigation stays put', async ({
  page,
}) => {
  await page.goto('/')
  const feed = page.getByRole('region', { name: '홈 피드' })
  const cards = feed.getByRole('article')
  const nav = page.getByRole('navigation', { name: '하단 메뉴' })
  await expect(feed).toBeVisible()
  const first = cards.first()
  await expect(first.getByRole('button', { name: '시작하기', exact: true })).toBeVisible()
  await expect(first.locator('iframe')).toHaveCount(0)
  const navBox = await nav.boundingBox()
  await cards.nth(1).scrollIntoViewIfNeeded()
  await expect(cards.nth(1)).toBeInViewport({ ratio: 0.98 })
  await expect(cards.nth(1).locator('iframe')).toBeVisible()
  await expect(cards.nth(1).frameLocator('iframe').locator('body')).not.toBeEmpty()
  await expect(cards.nth(1)).toHaveAttribute('data-active', 'true')
  await expect(nav).toBeInViewport({ ratio: 1 })
  expect(await nav.boundingBox()).toEqual(navBox)
  await cards.nth(4).scrollIntoViewIfNeeded()
  await expect(cards.nth(4)).toHaveAttribute('data-active', 'true')
  await expect(cards.nth(1).locator('iframe')).toHaveCount(0)
  await page.getByRole('link', { name: '탐색' }).click()
  await expect(page.locator('iframe')).toHaveCount(0)
})

test('opens a playable document and returns to the same feed card', async ({ page }) => {
  await page.goto('/')
  const card = page.getByRole('article').first()
  await card.getByRole('button', { name: '시작하기', exact: true }).click()
  const player = page.getByRole('dialog')
  await expect(player).toBeVisible()
  await expect(player.frameLocator('iframe').locator('body')).not.toBeEmpty()
  await player.getByRole('button', { name: '닫기' }).click()
  await expect(player).toHaveCount(0)
  await expect(card).toHaveAttribute('data-active', 'true')
  await card.getByRole('button', { name: '시작하기', exact: true }).click()
  await page.goBack()
  await expect(player).toHaveCount(0)
  await expect(card).toBeInViewport({ ratio: 0.98 })
})

test('pauses neighboring previews, resumes only the current one and pauses it during play', async ({
  page,
}) => {
  await page.goto('/')
  const cards = page.locator('.home-feed-scroll > article')
  const liveCard = cards.nth(1)
  const pauseRule = () =>
    liveCard
      .frameLocator('iframe')
      .locator('html')
      .evaluate(
        (html) =>
          Array.from(html.querySelectorAll('style')).find((style) =>
            style.textContent.includes('animation-play-state:paused'),
          )?.media,
      )
  await liveCard.scrollIntoViewIfNeeded()
  await expect(liveCard.locator('iframe')).toHaveAttribute('data-ready', 'true')
  await expect.poll(pauseRule).toBe('not all')
  await cards.first().scrollIntoViewIfNeeded()
  await expect.poll(pauseRule).toBe('all')
  await liveCard.scrollIntoViewIfNeeded()
  await expect.poll(pauseRule).toBe('not all')
  await liveCard.getByRole('button', { name: /시작하기$/ }).click()
  const player = page.getByRole('dialog')
  await expect(player.locator('iframe')).toHaveAttribute('data-ready', 'true')
  await expect.poll(pauseRule).toBe('all')
  await player.getByRole('button', { name: '닫기' }).click()
  await expect.poll(pauseRule).toBe('not all')
  await expect(liveCard).toBeInViewport({ ratio: 0.98 })
})

test('recovers a preview that fails to initialize without opening the player', async ({ page }) => {
  let fail = true
  await page.route('**/feed/*.html', (route) =>
    fail
      ? route.fulfill({ status: 503, contentType: 'text/html', body: 'Unavailable' })
      : route.continue(),
  )
  await page.clock.install()
  await page.goto('/')
  const card = page.getByRole('article').nth(1)
  await card.scrollIntoViewIfNeeded()
  await expect(card).toHaveAttribute('data-active', 'true')
  await page.clock.fastForward(16000)
  const retry = card.getByRole('button', { name: '다시 시도' })
  await expect(retry).toBeVisible()
  fail = false
  await retry.click()
  await expect(card.locator('iframe')).toHaveAttribute('data-ready', 'true')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('shared links restore their card and recommendation filters reset the scroll', async ({
  page,
}) => {
  await page.goto('/?feed=t3')
  const feed = page.getByRole('region', { name: '홈 피드' })
  await expect(feed.locator('article[data-active="true"] iframe')).toHaveAttribute(
    'src',
    '/feed/t3.html',
  )
  const total = await feed.getByRole('article').count()
  await page.getByRole('button', { name: '팔로잉', exact: true }).click()
  await expect(feed.getByRole('article').first()).toHaveAttribute('data-active', 'true')
  expect(await feed.getByRole('article').count()).toBeLessThan(total)
  await page.getByRole('button', { name: '추천', exact: true }).click()
  await expect(feed.getByRole('article')).toHaveCount(total)
  await page.goto('/?feed=unknown&play=unknown')
  await expect(feed.getByRole('article').first()).toHaveAttribute('data-active', 'true')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('matches the original preview dimensions and following order', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const cards = page.locator('.home-feed-scroll > article')
  await cards.nth(1).scrollIntoViewIfNeeded()
  const iframe = cards.nth(1).locator('iframe')
  await expect(iframe).toHaveAttribute('data-ready', 'true')
  const dimensions = await iframe.evaluate((frame) => {
    const card = frame.closest('article')!
    const device = document.querySelector('#root')!
    const designHeight = Math.max(card.clientHeight, device.clientHeight - 56)
    return {
      actual: frame.clientHeight,
      expected: designHeight,
      width: frame.getBoundingClientRect().width,
      expectedWidth: (device.clientWidth * card.clientHeight) / designHeight,
    }
  })
  expect(dimensions.actual).toBe(dimensions.expected)
  expect(dimensions.width).toBeCloseTo(dimensions.expectedWidth, 0)
  await page.getByRole('button', { name: '팔로잉', exact: true }).click()
  await expect(cards.first()).toHaveAttribute('aria-label', '수호 동물 카드')
})

test('restores the live card after reloading the player and handles its share request', async ({
  page,
}) => {
  await page.goto('/')
  const card = page.locator('.home-feed-scroll > article').nth(1)
  await card.scrollIntoViewIfNeeded()
  await card.getByRole('button', { name: /시작하기$/ }).click()
  await page.reload()
  const dialog = page.getByRole('dialog')
  await expect(dialog.locator('iframe')).toHaveAttribute('data-ready', 'true')
  await dialog
    .frameLocator('iframe')
    .locator('body')
    .evaluate(() =>
      window.parent.postMessage({ __lb: 1, proto: 1, type: 'share' }, new URL(document.URL).origin),
    )
  const link = dialog.getByRole('textbox', { name: '공유 링크' })
  await expect(link).toHaveValue(/\/\?feed=t\d+$/)
  await dialog.getByRole('button', { name: '공유 닫기' }).click()
  await dialog.getByRole('button', { name: '닫기', exact: true }).click()
  await expect(card).toHaveAttribute('data-active', 'true')
  await expect(card).toBeInViewport({ ratio: 0.98 })
})
