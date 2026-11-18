import { expect, test, type Page } from '@playwright/test'

const app = (page: Page) => page.frameLocator('iframe[src="/prototype-tabs/index.html"]')
const nav = (page: Page) => page.locator('.bottom-nav')
const historyLength = (page: Page) => page.evaluate(() => window.history.length)
const prizes = ['네이버페이 포인트 5,000원', '스타벅스 아메리카노 T 2잔'] as const

test('raffle URLs identify each prize and restore the expanded, scrolled list with Back', async ({
  page,
}) => {
  await page.goto('/benefits')
  const tab = app(page)
  const list = tab.locator('#benefit')
  await tab.getByRole('button', { name: /미션 .*개 더 보기/ }).click()
  for (const [index, prize] of prizes.entries()) {
    const card = tab.getByRole('button', { name: new RegExp(prize) })
    await card.scrollIntoViewIfNeeded()
    const y = await list.evaluate((el) => el.scrollTop)
    expect(y).toBeGreaterThan(0)
    await card.click()
    const address = '/benefits/raffles/r' + (index + 1)
    await expect(page).toHaveURL(address)
    await expect(tab.locator('#raffle .dttl')).toHaveText(prize)
    await expect(nav(page)).toBeHidden()
    await expect(nav(page).locator('[href="/benefits"]')).toHaveAttribute('aria-current', 'page')
    const entries = await historyLength(page)
    await tab.getByRole('button', { name: '한 번 늘리기' }).click()
    await expect(tab.getByRole('button', { name: '2회 응모하기' })).toBeVisible()
    expect(await historyLength(page)).toBe(entries)
    await page.goBack()
    await expect(page).toHaveURL('/benefits')
    await expect(tab.getByRole('button', { name: /접기/ })).toHaveAttribute('aria-expanded', 'true')
    await expect.poll(() => list.evaluate((el) => el.scrollTop)).toBe(y)
    await page.goForward()
    await expect(page).toHaveURL(address)
    await expect(tab.locator('#raffle .dttl')).toHaveText(prize)
    await tab.getByRole('button', { name: '뒤로', exact: true }).click()
    await expect(page).toHaveURL('/benefits')
  }
})

test('clover history opens from the wallet and returns there without filter history entries', async ({
  page,
}) => {
  await page.goto('/benefits')
  const tab = app(page)
  await tab.getByRole('button', { name: /^내역/ }).click()
  await expect(page).toHaveURL('/benefits/history')
  await expect(tab.getByRole('heading', { name: '클로버 내역' })).toBeVisible()
  await expect(nav(page).getByRole('link', { name: '혜택' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  const count = await historyLength(page)
  await tab.getByRole('button', { name: '적립', exact: true }).click()
  await expect(tab.locator('#clover .amt.plus').first()).toBeVisible()
  await tab.getByRole('button', { name: '사용', exact: true }).click()
  expect(await historyLength(page)).toBe(count)
  await tab.getByRole('button', { name: '뒤로', exact: true }).click()
  await expect(page).toHaveURL('/benefits')
  await expect(tab.getByRole('heading', { name: '혜택', exact: true })).toBeVisible()
  await page.goForward()
  await expect(page).toHaveURL('/benefits/history')
  await expect(tab.getByRole('heading', { name: '클로버 내역' })).toBeVisible()
})

async function openNotificationHistory(page: Page) {
  await page.goto('/explore')
  const tab = app(page)
  await expect(tab.getByRole('heading', { name: '탐색', exact: true })).toBeVisible()
  // The shell has no entry point for the sample notification list.
  await tab.locator('body').evaluate(() => {
    if (!('go' in window) || typeof window.go !== 'function')
      throw new Error('Missing prototype navigation')
    window.go('noti')
  })
  await tab.getByRole('button', { name: /클로버 소멸 예정/ }).click()
  await expect(page).toHaveURL('/benefits/history')
}

test('clover history returns to the originating prototype notification panel', async ({ page }) => {
  await openNotificationHistory(page)
  const tab = app(page)
  await expect(tab.getByRole('heading', { name: '클로버 내역' })).toBeVisible()
  await tab.getByRole('button', { name: '뒤로', exact: true }).click()
  await expect(page).toHaveURL('/explore')
  await expect(tab.getByRole('heading', { name: '알림', exact: true })).toBeVisible()
})

test('reloading history opened by a notification falls back to benefits when its source is lost', async ({
  page,
}) => {
  await openNotificationHistory(page)
  await page.reload()
  const tab = app(page)
  await expect(tab.getByRole('heading', { name: '클로버 내역' })).toBeVisible()
  await tab.getByRole('button', { name: '뒤로', exact: true }).click()
  await expect(page).toHaveURL('/benefits')
  await expect(tab.getByRole('heading', { name: '혜택', exact: true })).toBeVisible()
})

test('settings returns to More and preserves the value of its local toggles', async ({ page }) => {
  await page.goto('/profile')
  const tab = app(page)
  await tab.getByRole('button', { name: /더보기 메뉴/ }).click()
  const settings = tab.getByRole('button', { name: /⚙️ 설정/ })
  await settings.click()
  await expect(page).toHaveURL('/profile/settings')
  await expect(nav(page).getByRole('link', { name: '프로필' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  const toggle = tab
    .locator('.srow')
    .filter({ hasText: '새 팔로워가 생기면 알려요' })
    .getByRole('button')
  const old = await toggle.getAttribute('class')
  const count = await historyLength(page)
  await toggle.click()
  await expect(toggle).not.toHaveAttribute('class', old ?? '')
  expect(await historyLength(page)).toBe(count)
  await page.goBack()
  await expect(page).toHaveURL('/profile')
  await expect(tab.getByRole('heading', { name: '더보기' })).toBeVisible()
  await page.goForward()
  await expect(tab.getByRole('heading', { name: '설정', exact: true })).toBeVisible()
  await expect(toggle).not.toHaveAttribute('class', old ?? '')
  await tab.locator('#more .ph button').click()
  await expect(page).toHaveURL('/profile')
  await expect(settings).toBeVisible()
})

for (const [address, title, backTo] of [
  ['/benefits/raffles/r2', '래플 응모', '/benefits'],
  ['/benefits/history', '클로버 내역', '/benefits'],
  ['/profile/settings', '설정', '/profile'],
] as const) {
  test(
    'direct entry and reload restore ' + address + ' with an in-app Back fallback',
    async ({ page }) => {
      await page.goto('/explore')
      await page.goto(address)
      const tab = app(page)
      const heading = tab.getByRole('heading', { name: title, exact: true })
      await expect(heading).toBeVisible()
      await page.reload()
      await expect(page).toHaveURL(address)
      await expect(heading).toBeVisible()
      if (title === '래플 응모') await expect(tab.locator('#raffle .dttl')).toHaveText(prizes[1])
      const back =
        title === '설정'
          ? tab.locator('#more .ph button')
          : tab.getByRole('button', { name: '뒤로', exact: true })
      await back.click()
      await expect(page).toHaveURL(backTo)
      await expect(
        tab.getByRole('heading', { name: backTo === '/profile' ? '프로필' : '혜택', exact: true }),
      ).toBeVisible()
      await page.goBack()
      await expect(page).toHaveURL('/explore')
    },
  )
}

test('an unknown raffle replaces its history entry with benefits', async ({ page }) => {
  await page.goto('/explore')
  await page.goto('/benefits/raffles/r999')
  await expect(page).toHaveURL('/benefits')
  await expect(app(page).getByRole('heading', { name: '혜택', exact: true })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL('/explore')
})

test('going back to a protected detail as a guest shows the login gate', async ({ page }) => {
  await page.goto('/profile/settings')
  const tab = app(page)
  await tab.getByRole('button', { name: /로그아웃/ }).click()
  await tab.getByRole('button', { name: '로그아웃', exact: true }).click()
  await tab.getByRole('button', { name: '로그인 없이 둘러보기' }).click()
  await expect(page).toHaveURL('/')
  await page.goBack()
  await expect(page).toHaveURL('/profile/settings')
  await expect(tab.getByRole('heading', { name: '로그인이 필요해요' })).toBeVisible()
  await expect(tab.getByRole('button', { name: /휴대폰 인증/ })).toHaveCount(0)
  await tab.getByRole('button', { name: '다음에' }).click()
  await expect(page).toHaveURL('/')
})
