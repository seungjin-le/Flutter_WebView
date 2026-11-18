import { expect, test, type Page } from '@playwright/test'

const frameSelector = 'iframe[src="/prototype-tabs/index.html"]'
const prototype = (page: Page) => page.frameLocator(frameSelector)
const menu = (page: Page) => page.getByRole('navigation', { name: '하단 메뉴' })

test('explore searches the prototype catalog and opens a matching playable item', async ({
  page,
}) => {
  await page.goto('/explore')
  const app = prototype(page)
  await expect(app.getByRole('heading', { name: '탐색', exact: true })).toBeVisible()
  await expect(app.getByRole('heading', { name: '에디터 픽' })).toBeVisible()
  await expect(app.getByRole('heading', { name: '주목할 유저' })).toBeVisible()
  await app.getByRole('button', { name: '최신순' }).click()
  await expect(app.getByRole('button', { name: '최신순' })).toHaveAttribute('aria-pressed', 'true')

  await app.getByRole('button', { name: '콘텐츠, 태그, 유저 검색' }).click()
  const search = app.getByRole('textbox', { name: '검색어' })
  await search.fill('  ')
  await search.press('Enter')
  await expect(search).toBeVisible()
  await search.fill('없는검색어🍀')
  await search.press('Enter')
  await expect(app.getByText('검색 결과가 없어요', { exact: true })).toBeVisible()
  await app.getByRole('button', { name: '뒤로', exact: true }).click()
  await app.getByRole('button', { name: '콘텐츠, 태그, 유저 검색' }).click()
  await expect(app.getByRole('heading', { name: '최근 검색어' })).toBeVisible()
  await search.fill('장마 요정')
  await search.press('Enter')
  const result = app.getByRole('button', { name: /장마 요정 테스트/ })
  await expect(result).toHaveCount(1)
  await result.click()
  const player = page.getByRole('dialog', { name: '장마 요정 테스트' })
  await expect(player.locator('iframe')).toHaveAttribute('src', '/feed/t91.html')
  await expect(player.locator('iframe')).toHaveAttribute('data-ready', 'true')
  await player.getByRole('button', { name: '닫기', exact: true }).click()
  await expect(page).toHaveURL(/\/explore$/)
  await expect(result).toBeVisible()
})

test('benefits claims attendance once and records it in the clover history', async ({ page }) => {
  await page.goto('/benefits')
  const app = prototype(page)
  await expect(app.getByRole('heading', { name: '경품 응모' })).toBeVisible()
  await app.getByRole('button', { name: '클로버 안내' }).click()
  await expect(app.getByRole('tooltip')).toContainText('경품 응모')
  await app.getByRole('button', { name: '클로버 안내' }).click()
  await expect(app.getByRole('tooltip')).toHaveCount(0)
  const more = app.getByRole('button', { name: /미션 .*개 더 보기/ })
  await more.click()
  await expect(app.getByRole('button', { name: /접기/ })).toHaveAttribute('aria-expanded', 'true')
  const attendance = app.locator('.ms').filter({ hasText: '출석하기' })
  await attendance.getByRole('button', { name: '받기 +1' }).click()
  await expect(attendance).toContainText('받음')
  await expect(attendance.getByRole('button')).toHaveCount(0)
  await app.getByRole('button', { name: /^내역/ }).click()
  await expect(app.getByRole('heading', { name: '클로버 내역' })).toBeVisible()
  await app.getByRole('button', { name: '적립', exact: true }).click()
  await expect(app.locator('.clrow').filter({ hasText: '출석하기' }).first()).toContainText('+1')
  await app.getByRole('button', { name: '뒤로', exact: true }).click()
  await expect(app.locator('#clnum')).toHaveText('13')
  await expect(menu(page).getByRole('link', { name: '혜택' })).toHaveAttribute(
    'aria-current',
    'page',
  )
})

test('profile edits survive tab changes and the collection supports visibility changes', async ({
  page,
}) => {
  await page.goto('/profile')
  const app = prototype(page)
  await expect(app.getByText('재빠른 토끼96', { exact: false })).toBeVisible()
  await app.getByRole('button', { name: '편집', exact: true }).click()
  const name = app.getByRole('textbox')
  await name.fill(' ')
  await app.getByRole('button', { name: '저장', exact: true }).click()
  await expect(app.getByRole('heading', { name: '프로필 수정' })).toBeVisible()
  await name.fill('새봄토끼')
  await app.getByRole('button', { name: '저장', exact: true }).click()
  await menu(page).getByRole('link', { name: '혜택' }).click()
  await expect(app.getByRole('heading', { name: '혜택', exact: true })).toBeVisible()
  await menu(page).getByRole('link', { name: '프로필' }).click()
  await expect(app.getByText('새봄토끼', { exact: false })).toBeVisible()
  await app.getByRole('button', { name: /^유형 도감/ }).click()
  const privacy = app.getByRole('button', { name: /^(공개|비공개)로 바꾸기$/ })
  const previous = await privacy.textContent()
  await privacy.click()
  await expect(privacy).not.toHaveText(previous ?? '')
})

test('opening the collection from a mission navigates to profile and updates that mission', async ({
  page,
}) => {
  await page.goto('/benefits')
  const app = prototype(page)
  await app.getByRole('button', { name: /미션 .*개 더 보기/ }).click()
  const mission = app.locator('.ms').filter({ hasText: '유형 도감 둘러보기' })
  await mission.getByRole('button', { name: '바로가기' }).click()
  await expect(page).toHaveURL(/\/profile$/)
  await expect(menu(page).getByRole('link', { name: '프로필' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(app.getByRole('button', { name: '공개로 바꾸기', exact: true })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/benefits$/)
  await expect(mission.getByRole('button', { name: '받기 +1' })).toBeVisible()
})

test('guest entry to benefits and profile shows the sign-in prompt', async ({ page }) => {
  await page.goto('/profile')
  const app = prototype(page)
  await app.getByRole('button', { name: /더보기 메뉴/ }).click()
  await app.getByRole('button', { name: /설정/ }).click()
  await app.getByRole('button', { name: /로그아웃/ }).click()
  await app.getByRole('button', { name: '로그아웃', exact: true }).click()
  await app.getByRole('button', { name: '로그인 없이 둘러보기' }).click()
  await expect(page).toHaveURL(/\/$/)
  for (const label of ['혜택', '프로필']) {
    const publicPath = label === '혜택' ? '/' : '/explore'
    if (publicPath === '/explore') await menu(page).getByRole('link', { name: '탐색' }).click()
    await menu(page).getByRole('link', { name: label, exact: true }).click()
    await expect(app.getByRole('heading', { name: '로그인이 필요해요' })).toBeVisible()
    await app.getByRole('button', { name: '다음에', exact: true }).click()
    await expect(page).toHaveURL(publicPath)
  }
  await page.goBack()
  await expect(page).toHaveURL('/')
  await expect(app.getByRole('heading', { name: '로그인이 필요해요' })).toBeHidden()
})
