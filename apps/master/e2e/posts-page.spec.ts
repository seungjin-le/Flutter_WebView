import { test, expect, type Locator, type Page } from '@playwright/test'

const open = async (page: Page) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: '게시글' })).toBeVisible()
  const main = page.getByRole('main')
  return {
    main,
    sidebar: page.getByRole('complementary', { name: '관리자 메뉴' }),
    toggle: main.getByRole('button', { name: /사이드바 (접기|펼치기)/ }),
    table: main.getByRole('region', { name: '검색 결과' }),
  }
}

test('shows header breadcrumb, title row and result table', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const { main, table } = await open(page)
  const crumbs = main.getByRole('navigation', { name: '현재 위치' })
  await expect(crumbs.getByRole('link', { name: '콘텐츠' })).toBeVisible()
  await expect(crumbs.getByText('게시글')).toHaveAttribute('aria-current', 'page')
  await expect(main.getByText('게시글을 검색하고 관리합니다.')).toBeVisible()
  await expect(main.getByRole('button', { name: '내보내기' })).toBeVisible()
  await expect(main.getByRole('button', { name: '새 글 작성' })).toBeVisible()
  await expect(table.getByRole('table')).toBeVisible()
  expect(errors).toEqual([])
})

test('sidebar toggle collapses and expands by click and keyboard, label flips', async ({
  page,
}) => {
  const { sidebar, toggle } = await open(page)
  await expect(sidebar).toHaveAttribute('data-state', 'expanded')
  expect((await sidebar.boundingBox())?.width).toBe(256)
  await toggle.click()
  await expect(sidebar).toHaveAttribute('data-state', 'collapsed')
  await expect(toggle).toHaveAccessibleName('사이드바 펼치기')
  await toggle.focus()
  await page.keyboard.press('Enter')
  await expect(sidebar).toHaveAttribute('data-state', 'expanded')
  await expect(toggle).toHaveAccessibleName('사이드바 접기')
  await page.keyboard.press('Space')
  await expect(sidebar).toHaveAttribute('data-state', 'collapsed')
  for (let i = 0; i < 4; i++) await toggle.click()
  await expect(sidebar).toHaveAttribute('data-state', 'collapsed')
})

const searchBox = (main: Locator) => main.getByLabel('검색어', { exact: true })
const searchButton = (main: Locator) => main.getByRole('button', { name: '검색', exact: true })
// Data rows only: skeleton rows (aria-hidden) and the Empty row carry no aria-selected.
const dataRows = (table: Locator) => table.locator('tbody tr[aria-selected]')
const settled = (table: Locator) => expect(table.locator('[data-slot="skeleton"]')).toHaveCount(0)

test('search shows loading skeleton then results; no match shows Empty; reset restores', async ({
  page,
}) => {
  const { main, table } = await open(page)
  await expect(dataRows(table)).toHaveCount(20)
  await searchBox(main).fill('존재하지않는검색어zzz')
  await searchButton(main).click()
  await expect(table.locator('[data-slot="skeleton"]').first()).toBeVisible()
  await expect(table.getByText('검색 결과가 없습니다')).toBeVisible()
  await settled(table)
  await expect(dataRows(table)).toHaveCount(0)
  await main.getByRole('button', { name: '초기화' }).click()
  await settled(table)
  await expect(dataRows(table)).toHaveCount(20)
  await expect(dataRows(table).first()).toContainText('[게시글 제목 01]')
  await expect(table.getByText('검색 결과가 없습니다')).toHaveCount(0)
  await expect(searchBox(main)).toHaveValue('')
  expect(new URL(page.url()).search).toBe('')
})

test('rapid repeated searches settle on the last query without errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const { main, table } = await open(page)
  await searchBox(main).fill('제목 05')
  await searchButton(main).click()
  await searchBox(main).fill('제목 07')
  for (let i = 0; i < 3; i++) await searchButton(main).click()
  await settled(table)
  await expect(dataRows(table)).toHaveCount(1)
  await expect(dataRows(table).first()).toContainText('[게시글 제목 07]')
  await expect(table.getByText('총 1행 중 0행 선택됨')).toBeVisible()
  expect(errors).toEqual([])
})

test('actions during the search loading leave a consistent final state', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const { main, table } = await open(page)
  await dataRows(table).first().getByRole('checkbox').click()
  await expect(table.getByText('총 24행 중 1행 선택됨')).toBeVisible()
  await searchBox(main).fill('제목')
  await searchButton(main).click()
  // Loading: skeleton rows replace data rows, so no row checkbox or row menu can be hit.
  await expect(table.locator('[data-slot="skeleton"]').first()).toBeVisible()
  await expect(dataRows(table)).toHaveCount(0)
  await expect(table.getByRole('checkbox')).toHaveCount(1)
  await expect(table.getByRole('button', { name: /작업 메뉴/ })).toHaveCount(0)
  // Pagination stays live while loading.
  await table.getByRole('button', { name: '다음 페이지' }).click()
  await expect(page).toHaveURL(/page=2/)
  await settled(table)
  await expect(page).toHaveURL(/kw=/)
  await expect(dataRows(table)).toHaveCount(4)
  await expect(table.getByText('총 24행 중 0행 선택됨')).toBeVisible()
  await expect(table.getByRole('button', { name: '2페이지, 현재 페이지' })).toBeVisible()
  expect(errors).toEqual([])
})

test.describe('url state', () => {
  const pick = async (main: Locator, trigger: string, option: string) => {
    await main.getByRole('button', { name: trigger, exact: true }).click()
    await main.getByRole('option', { name: option, exact: true }).click()
  }

  test('a submitted search lives in the URL and reload restores form and results', async ({
    page,
  }) => {
    const { main, table } = await open(page)
    await searchBox(main).fill('가이드')
    await pick(main, '검색 대상', '태그')
    await main.getByRole('checkbox', { name: '메인 화면' }).click()
    await main.getByRole('radio', { name: '조회수순' }).click()
    await searchButton(main).click()
    await settled(table)
    await expect(page).toHaveURL(/kw=/)
    const params = new URL(page.url()).searchParams
    expect(params.get('field')).toBe('tag')
    expect(params.get('sort')).toBe('views')
    expect(params.has('category')).toBe(false)
    const before = await dataRows(table).allTextContents()
    expect(before.length).toBeGreaterThan(0)
    await page.reload()
    await expect(searchBox(main)).toHaveValue('가이드')
    await expect(main.getByRole('button', { name: '검색 대상', exact: true })).toContainText('태그')
    await expect(main.getByRole('checkbox', { name: '메인 화면' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await expect(main.getByRole('radio', { name: '조회수순' })).toBeChecked()
    await expect(dataRows(table)).toHaveCount(before.length)
    expect(await dataRows(table).allTextContents()).toEqual(before)
  })

  test('page number and page size are URL state and survive reload', async ({ page }) => {
    const { main, table } = await open(page)
    await table.getByRole('button', { name: '다음 페이지' }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(dataRows(table)).toHaveCount(4)
    await page.reload()
    await expect(dataRows(table)).toHaveCount(4)
    await expect(table.getByRole('button', { name: '2페이지, 현재 페이지' })).toBeVisible()
    await table.getByRole('button', { name: '페이지당 행' }).click()
    await page.getByRole('option', { name: '10', exact: true }).click()
    expect(new URL(page.url()).searchParams.get('size')).toBe('"10"')
    expect(new URL(page.url()).searchParams.has('page')).toBe(false)
    await expect(dataRows(table)).toHaveCount(10)
    await expect(main.getByRole('button', { name: '10개씩' })).toBeVisible()
  })

  test('invalid params fall back to the defaults without crashing', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(
      '/?page=abc&size=7&sort=bogus&kw=a&field=x&category=%5B1%5D&status=nope&showOn=%5B9%5D&pinned=maybe&from=yesterday',
    )
    const { main, table } = {
      main: page.getByRole('main'),
      table: page.getByRole('region', { name: '검색 결과' }),
    }
    await expect(page.getByRole('heading', { level: 1, name: '게시글' })).toBeVisible()
    await expect(dataRows(table)).toHaveCount(20)
    await expect(searchBox(main)).toHaveValue('')
    await expect(main.getByText('적용된 필터가 없습니다.')).toBeVisible()
    await expect(table.getByRole('button', { name: '1페이지, 현재 페이지' })).toBeVisible()
    expect(errors).toEqual([])
  })

  test('a page beyond the last one clamps to the last page', async ({ page }) => {
    await page.goto('/?page=99')
    const table = page.getByRole('region', { name: '검색 결과' })
    await expect(dataRows(table)).toHaveCount(4)
    await expect(table.getByRole('button', { name: '2페이지, 현재 페이지' })).toBeVisible()
  })

  test('numeric-looking keywords survive the URL round trip', async ({ page }) => {
    const { main, table } = await open(page)
    await searchBox(main).fill('0505')
    await searchButton(main).click()
    await settled(table)
    await page.reload()
    await expect(searchBox(main)).toHaveValue('0505')
    await expect(dataRows(table)).toHaveCount(0)
  })

  test('back and forward restore the form values and the results', async ({ page }) => {
    const { main, table } = await open(page)
    await searchBox(main).fill('제목 05')
    await searchButton(main).click()
    await settled(table)
    await searchBox(main).fill('제목 07')
    await searchButton(main).click()
    await settled(table)
    await expect(dataRows(table).first()).toContainText('[게시글 제목 07]')
    await page.goBack()
    await expect(searchBox(main)).toHaveValue('제목 05')
    await expect(dataRows(table)).toHaveCount(1)
    await expect(dataRows(table).first()).toContainText('[게시글 제목 05]')
    await page.goBack()
    await expect(searchBox(main)).toHaveValue('')
    await expect(dataRows(table)).toHaveCount(20)
    await page.goForward()
    await page.goForward()
    await expect(searchBox(main)).toHaveValue('제목 07')
    await expect(dataRows(table)).toHaveCount(1)
    await expect(dataRows(table).first()).toContainText('[게시글 제목 07]')
  })
})

test.describe('search options change the results', () => {
  const pick = async (main: Locator, trigger: string, option: string) => {
    await main.getByRole('button', { name: trigger, exact: true }).click()
    await main.getByRole('option', { name: option, exact: true }).click()
  }

  test('search field: body and tag find what the title cannot', async ({ page }) => {
    const { main, table } = await open(page)
    await searchBox(main).fill('공지')
    await searchButton(main).click()
    await settled(table)
    await expect(table.getByText('총 6행 중 0행 선택됨')).toBeVisible()
    await pick(main, '검색 대상', '제목')
    await searchButton(main).click()
    await settled(table)
    await expect(table.getByText('검색 결과가 없습니다')).toBeVisible()
    await pick(main, '검색 대상', '태그')
    await searchBox(main).fill('가이드')
    await searchButton(main).click()
    await settled(table)
    await expect(table.getByText('총 8행 중 0행 선택됨')).toBeVisible()
  })

  test('show position and sort order apply to the table', async ({ page }) => {
    const { main, table } = await open(page)
    await main.getByRole('checkbox', { name: '공지 영역' }).click()
    await main.getByRole('radio', { name: '조회수순' }).click()
    await searchButton(main).click()
    await settled(table)
    await expect(table.getByText('총 6행 중 0행 선택됨')).toBeVisible()
    const views = await dataRows(table).allTextContents()
    expect(views).toHaveLength(6)
    await main.getByRole('radio', { name: '제목순' }).click()
    await searchButton(main).click()
    await settled(table)
    const titles = (await dataRows(table).allTextContents()).map((t) => t.match(/\d\d(?=\])/)?.[0])
    const unpinned = titles.slice(1)
    expect(unpinned).toEqual([...unpinned].sort())
    expect(titles).not.toEqual(views.map((t) => t.match(/\d\d(?=\])/)?.[0]))
  })
})

test('header buttons use the Main artboard styles', async ({ page, isMobile }) => {
  const { main } = await open(page)
  const outline = main.getByRole('button', { name: '내보내기' })
  const primary = main.getByRole('button', { name: '새 글 작성' })
  await expect(outline).toHaveCSS('border-top-color', 'rgb(228, 228, 231)')
  await expect(outline).toHaveCSS('color', 'rgb(24, 24, 27)')
  await expect(outline).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(outline).toHaveCSS('box-shadow', /rgba\(0, 0, 0, 0\.04\) 0px 1px 2px 0px$/)
  await expect(outline).toHaveCSS('transition-duration', '0s')
  await expect(primary).toHaveCSS('border-top-color', 'rgb(37, 99, 235)')
  await expect(primary).toHaveCSS('background-color', 'rgb(37, 99, 235)')
  if (!isMobile) {
    await outline.hover()
    await expect(outline).toHaveCSS('background-color', 'rgb(244, 244, 245)')
    await expect(outline).toHaveCSS('color', 'rgb(24, 24, 27)')
    await primary.hover()
    await expect(primary).toHaveCSS('border-top-color', 'rgb(29, 78, 216)')
    await expect(primary).toHaveCSS('background-color', 'rgb(29, 78, 216)')
  }
  await outline.focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(outline).toHaveCSS('box-shadow', / \/ 0\.6\) 0px 0px 0px 3px/)
  await expect(outline).toHaveCSS('border-top-color', 'rgb(228, 228, 231)')
})

test('result heading keeps the artboard line height and breadcrumb links home', async ({
  page,
}) => {
  const { main, table } = await open(page)
  await expect(main.getByRole('heading', { level: 2, name: '검색 결과' })).toHaveCSS(
    'line-height',
    'normal',
  )
  const home = main.getByRole('navigation', { name: '현재 위치' }).getByRole('link', {
    name: '콘텐츠',
  })
  await expect(home).toHaveAttribute('href', '/')
  await table.getByRole('button', { name: '다음 페이지' }).click()
  await expect(page).toHaveURL(/page=2/)
  await home.click()
  await expect(page).toHaveURL((url) => url.search === '')
  await expect(dataRows(table)).toHaveCount(20)
})

test('layout wraps on mobile without page-level horizontal scroll', async ({ page }) => {
  await open(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  await page.setViewportSize({ width: 360, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  await page.setViewportSize({ width: 1440, height: 900 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
})

test('components gallery route still works', async ({ page }) => {
  await page.goto('/components')
  await expect(page.getByRole('heading', { level: 1, name: '컴포넌트' })).toBeVisible()
})
