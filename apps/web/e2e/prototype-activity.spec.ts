import { expect, test, type Page } from '@playwright/test'

const tabs = (page: Page) => page.frameLocator('iframe[src="/prototype-tabs/index.html"]')
const mission = (page: Page, name: string) =>
  tabs(page)
    .locator('.ms')
    .filter({ has: page.getByText(name, { exact: true }) })

async function showMissions(page: Page) {
  await page.getByRole('link', { name: '혜택' }).click()
  const more = tabs(page).getByRole('button', { name: /미션 .*개 더 보기/ })
  await more.click()
}

test('only recent visible feed activity advances the same timer displayed in benefits', async ({
  page,
}) => {
  await page.clock.install()
  await page.goto('/')
  const clock = page.getByLabel('피드 둘러본 시간')
  await expect(clock).toContainText('0:40')
  await page.clock.runFor(7000)
  await expect(clock).toContainText('0:40')
  await page.locator('.home-feed-scroll').dispatchEvent('wheel')
  await page.clock.runFor(9000)
  await expect(clock).toContainText('0:45')
  await showMissions(page)
  await expect(mission(page, '피드 3분 둘러보기')).toContainText('0:45 / 3:00')
})

test('likes and successful shares before the first tab visit count towards their missions', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'share', { value: async () => {} }),
  )
  await page.goto('/')
  const card = page.getByRole('article').first()
  const like = card.getByRole('button', { name: /^좋아요/ })
  await like.click()
  await like.click()
  await like.click()
  await card.getByRole('button', { name: /^공유/ }).click()
  await showMissions(page)
  await expect(mission(page, '좋아요 3번 누르기')).toContainText('1 / 3')
  await expect(mission(page, '결과 공유하기').getByRole('button', { name: /받기/ })).toBeVisible()
})

test('finishing an actual feed game adds its result to the collection and advances participation', async ({
  page,
}) => {
  await page.goto('/?play=t80')
  const dialog = page.getByRole('dialog')
  const game = dialog.frameLocator('iframe')
  await expect(dialog.locator('iframe')).toHaveAttribute('data-ready', 'true')
  await game.getByRole('button', { name: '내 띠 순위 확인하기' }).click()
  await game.getByRole('button', { name: /쥐띠/ }).first().click()
  await game.locator('#btn-share').click()
  await expect(dialog.getByRole('textbox', { name: '공유 링크' })).toHaveValue(/feed=t80$/)
  await dialog.getByRole('button', { name: '공유 닫기' }).click()
  await dialog.getByRole('button', { name: '닫기', exact: true }).click()
  await showMissions(page)
  await expect(mission(page, '콘텐츠 3개 참여')).toContainText('2 / 3')
  await expect(mission(page, '결과 공유하기').getByRole('button', { name: /받기/ })).toBeVisible()
  await page.getByRole('link', { name: '프로필' }).click()
  const app = tabs(page)
  await app.getByRole('button', { name: /^유형 도감/ }).click()
  await expect(app.locator('.g3 .pc').first()).toContainText('여행지에서 길 잘 찾는 띠 순위')
})

test('canceling a share and receiving a result from a preview grant no mission credit', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'share', {
      value: async () => {
        throw new DOMException('Canceled', 'AbortError')
      },
    }),
  )
  await page.goto('/')
  const card = page.getByRole('article').nth(1)
  await card.scrollIntoViewIfNeeded()
  await expect(card.locator('iframe')).toHaveAttribute('data-ready', 'true')
  await card
    .frameLocator('iframe')
    .locator('body')
    .evaluate(() =>
      parent.postMessage(
        { __lb: 1, proto: 1, type: 'result', payload: { resultId: '쥐띠' } },
        new URL(document.URL).origin,
      ),
    )
  await card.getByRole('button', { name: /^공유/ }).click()
  await showMissions(page)
  await expect(mission(page, '결과 공유하기')).toContainText('참여 가능')
  await expect(mission(page, '콘텐츠 3개 참여')).toContainText('1 / 3')
})
