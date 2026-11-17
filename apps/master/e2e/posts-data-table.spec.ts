import { test, expect, type Locator, type Page } from '@playwright/test'

const open = async (page: Page) => {
  await page.goto('/components')
  const section = page.getByRole('region', { name: 'Data Table' })
  await section.scrollIntoViewIfNeeded()
  await expect(section.getByRole('table')).toBeVisible()
  return section
}
const bodyRows = (section: Locator) => section.locator('tbody tr')
const summary = (section: Locator, total: number, selected = 0) =>
  expect(section.getByText(`총 ${total}행 중 ${selected}행 선택됨`)).toBeVisible()
const rowMenu = (section: Locator, title: string) =>
  section.getByRole('button', { name: `${title} 작업 메뉴` })

test('renders 20 rows per page, pinned first, with pagination state', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const section = await open(page)
  await expect(bodyRows(section)).toHaveCount(20)
  await summary(section, 24)
  await expect(bodyRows(section).first()).toContainText('[게시글 제목 01]')
  await expect(bodyRows(section).first().getByRole('img', { name: '상단 고정' })).toBeVisible()
  await expect(bodyRows(section).first()).toContainText('[작성자 A]')
  await expect(bodyRows(section).first()).toContainText('게시중')
  await expect(section.getByRole('button', { name: '첫 페이지' })).toBeDisabled()
  await expect(section.getByRole('button', { name: '이전 페이지' })).toBeDisabled()
  await expect(section.getByRole('button', { name: '1페이지, 현재 페이지' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(section.getByRole('columnheader', { name: '제목' })).toBeVisible()
  expect(errors).toEqual([])
})

test('page buttons, rapid next clicks and page size select', async ({ page }) => {
  const section = await open(page)
  const next = section.getByRole('button', { name: '다음 페이지' })
  for (let i = 0; i < 6; i++) await next.click({ force: true })
  await expect(bodyRows(section)).toHaveCount(4)
  await expect(next).toBeDisabled()
  await expect(section.getByRole('button', { name: '마지막 페이지' })).toBeDisabled()
  await section.getByRole('button', { name: '첫 페이지' }).click()
  await expect(bodyRows(section)).toHaveCount(20)
  await section.getByRole('button', { name: '페이지당 행' }).click()
  await page.getByRole('option', { name: '50', exact: true }).click()
  await expect(bodyRows(section)).toHaveCount(24)
  await expect(section.getByRole('button', { name: '2페이지' })).toHaveCount(0)
  await section.getByRole('button', { name: '페이지당 행' }).click()
  await page.getByRole('option', { name: '10', exact: true }).click()
  await expect(bodyRows(section)).toHaveCount(10)
  await section.getByRole('button', { name: '3페이지' }).click()
  await expect(bodyRows(section)).toHaveCount(4)
})

test('selection: row, mixed header, select-all, persists across pages', async ({ page }) => {
  const section = await open(page)
  const all = section.getByRole('checkbox', { name: '현재 페이지 전체 선택' })
  await expect(all).toHaveAttribute('aria-checked', 'false')
  await section.getByRole('checkbox', { name: '[게시글 제목 01] 선택' }).click()
  await summary(section, 24, 1)
  await expect(all).toHaveAttribute('aria-checked', 'mixed')
  await expect(bodyRows(section).first()).toHaveAttribute('aria-selected', 'true')
  await all.click()
  await expect(all).toHaveAttribute('aria-checked', 'true')
  await summary(section, 24, 20)
  await section.getByRole('button', { name: '다음 페이지' }).click()
  await summary(section, 24, 20)
  await expect(all).toHaveAttribute('aria-checked', 'false')
  await section.getByRole('button', { name: '이전 페이지' }).click()
  await all.click()
  await summary(section, 24, 0)
})

test('selection works from the keyboard', async ({ page }) => {
  const section = await open(page)
  const box = section.getByRole('checkbox', { name: '[게시글 제목 01] 선택' })
  await box.focus()
  await page.keyboard.press('Space')
  await expect(box).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Enter')
  await expect(box).toHaveAttribute('aria-checked', 'false')
})

test('delete via row menu: cancel keeps, Escape keeps, confirm removes with toast', async ({
  page,
}) => {
  const section = await open(page)
  const title = '[게시글 제목 02]'
  await rowMenu(section, title).click()
  await page.getByRole('menuitem', { name: '삭제' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText('게시글을 삭제할까요?')
  await expect(dialog).toContainText('이 게시글이 영구적으로 삭제되며 되돌릴 수 없습니다.')
  await dialog.getByRole('button', { name: '취소' }).click()
  await expect(dialog).toHaveCount(0)
  await summary(section, 24)
  await rowMenu(section, title).click()
  await page.getByRole('menuitem', { name: '삭제' }).click()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await summary(section, 24)
  await rowMenu(section, title).click()
  await page.getByRole('menuitem', { name: '삭제' }).click()
  await dialog.getByRole('button', { name: '삭제' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(section.getByText(title, { exact: true })).toHaveCount(0)
  await summary(section, 23)
  await expect(page.getByText('게시글을 삭제했습니다')).toBeVisible()
  await expect(page.getByText('1개 게시글이 삭제되었습니다.')).toBeVisible()
})

test('deleting a selected row drops it from the selection count', async ({ page }) => {
  const section = await open(page)
  await section.getByRole('checkbox', { name: '[게시글 제목 03] 선택' }).click()
  await summary(section, 24, 1)
  await rowMenu(section, '[게시글 제목 03]').click()
  await page.getByRole('menuitem', { name: '삭제' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: '삭제' }).click()
  await summary(section, 23, 0)
})

test('deleting every row on the last page clamps back to the previous page', async ({ page }) => {
  const section = await open(page)
  await section.getByRole('button', { name: '마지막 페이지' }).click()
  await expect(bodyRows(section)).toHaveCount(4)
  for (let left = 4; left > 0; left--) {
    await bodyRows(section)
      .first()
      .getByRole('button', { name: /작업 메뉴/ })
      .click()
    await page.getByRole('menuitem', { name: '삭제' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: '삭제' }).click()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
  }
  await summary(section, 20)
  await expect(bodyRows(section)).toHaveCount(20)
  await expect(section.getByRole('button', { name: '1페이지, 현재 페이지' })).toBeVisible()
})

test('publish toggle changes the status badge; copy and edit raise toasts', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const section = await open(page)
  const first = bodyRows(section).first()
  await rowMenu(section, '[게시글 제목 01]').click()
  await expect(page.getByRole('menuitem', { name: '게시 중지' })).toBeVisible()
  await page.getByRole('menuitem', { name: '게시 중지' }).click()
  await expect(first).toContainText('비공개')
  await expect(page.getByText('게시를 중지했습니다')).toBeVisible()
  await rowMenu(section, '[게시글 제목 01]').click()
  await page.getByRole('menuitem', { name: '게시하기' }).click()
  await expect(first).toContainText('게시중')
  await rowMenu(section, '[게시글 제목 01]').click()
  await page.getByRole('menuitem', { name: 'ID 복사' }).click()
  await expect(page.getByText('ID를 복사했습니다')).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('POST-1024')
  await rowMenu(section, '[게시글 제목 01]').click()
  await page.getByRole('menuitem', { name: '수정' }).click()
  await expect(page.getByText('수정 화면은 아직 연결되지 않았습니다.')).toBeVisible()
})

test('query drives filter, sort, size and clears selection; empty state; reset', async ({
  page,
}) => {
  const section = await open(page)
  await section.getByRole('checkbox', { name: '[게시글 제목 01] 선택' }).click()
  await section.getByRole('button', { name: '검색 조건 적용' }).click()
  await summary(section, 9)
  await expect(bodyRows(section)).toHaveCount(9)
  await expect(bodyRows(section).first()).toContainText('[게시글 제목 01]')
  await expect(bodyRows(section).nth(1)).toContainText('[게시글 제목 08]')
  await expect(bodyRows(section).nth(2)).toContainText('[게시글 제목 02]')
  await section.getByRole('button', { name: '결과 없는 검색' }).click()
  await expect(section.getByText('검색 결과가 없습니다')).toBeVisible()
  await expect(section.getByText('검색 조건이나 필터를 바꿔 다시 시도해 보세요.')).toBeVisible()
  await expect(section.getByRole('button', { name: '1페이지, 현재 페이지' })).toBeVisible()
  await expect(section.getByRole('button', { name: '다음 페이지' })).toBeDisabled()
  await section.getByRole('button', { name: '조건 해제' }).click()
  await summary(section, 24)
})

test('loading shows aria-hidden skeleton rows and hides data and empty state', async ({ page }) => {
  const section = await open(page)
  await section.getByRole('button', { name: '로딩 전환' }).click()
  await expect(section.locator('tbody tr[aria-hidden="true"]')).toHaveCount(20)
  await expect(section.getByText('[게시글 제목 01]')).toHaveCount(0)
  await section.getByRole('button', { name: '로딩 전환' }).click()
  await expect(bodyRows(section)).toHaveCount(20)
  await expect(section.locator('tbody tr[aria-hidden="true"]')).toHaveCount(0)
})

test('table scrolls inside its own box at mobile width', async ({ page }) => {
  const section = await open(page)
  const box = section.locator('table').locator('..')
  const { sw, cw, overflowX } = await box.evaluate((el) => ({
    sw: el.scrollWidth,
    cw: el.clientWidth,
    overflowX: getComputedStyle(el).overflowX,
  }))
  expect(overflowX).toBe('auto')
  if ((page.viewportSize()?.width ?? 1280) < 500) expect(sw).toBeGreaterThan(cw)
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
})

test.describe('copy failure', () => {
  const copyId = async (page: Page) => {
    const section = await open(page)
    await rowMenu(section, '[게시글 제목 01]').click()
    await page.getByRole('menuitem', { name: 'ID 복사' }).click()
  }

  test('a rejected clipboard write shows an error toast, not the success toast', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new DOMException('denied', 'NotAllowedError')) },
        configurable: true,
      })
    })
    await copyId(page)
    await expect(page.getByText('ID를 복사하지 못했습니다')).toBeVisible()
    await expect(page.getByText('ID를 복사했습니다')).toHaveCount(0)
  })

  test('a missing clipboard API shows the error toast too', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    })
    await copyId(page)
    await expect(page.getByText('ID를 복사하지 못했습니다')).toBeVisible()
    await expect(page.getByText('ID를 복사했습니다')).toHaveCount(0)
  })
})

test('last row menu opens fully visible without scrolling the table box', async ({ page }) => {
  const section = await open(page)
  const last = bodyRows(section).last()
  await last.scrollIntoViewIfNeeded()
  const box = section.locator('table').locator('..')
  expect(await box.evaluate((el) => el.scrollTop)).toBe(0)
  await last.getByRole('button', { name: /작업 메뉴/ }).click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  const rect = await menu.evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { top: r.top, bottom: r.bottom, h: innerHeight }
  })
  expect(rect.top).toBeGreaterThanOrEqual(0)
  expect(rect.bottom).toBeLessThanOrEqual(rect.h)
  expect(await box.evaluate((el) => el.scrollTop)).toBe(0)
  expect(await box.evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(true)
})

test('few remaining rows keep the table box as tall as its content', async ({ page }) => {
  const section = await open(page)
  await section.getByRole('button', { name: '결과 없는 검색' }).click()
  await section.getByRole('button', { name: '조건 해제' }).click()
  await section.getByRole('button', { name: '검색 조건 적용' }).click()
  const box = section.locator('table').locator('..')
  const table = section.locator('table')
  const heights = await Promise.all([
    box.evaluate((el) => el.clientHeight),
    table.evaluate((el) => el.getBoundingClientRect().height),
  ])
  expect(heights[0]).toBeLessThanOrEqual(heights[1] + 2)
})

test('current page button keeps the blue text on hover; idle page button turns near-black', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Tailwind hover variants only apply when the device can hover')
  const section = await open(page)
  const current = section.getByRole('button', { name: '1페이지, 현재 페이지' })
  await current.hover()
  await expect(current).toHaveCSS('color', 'rgb(29, 78, 216)')
  await expect(current).toHaveCSS('background-color', 'rgb(219, 234, 254)')
  const idle = section.getByRole('button', { name: '2페이지', exact: true })
  await idle.hover()
  await expect(idle).toHaveCSS('color', 'rgb(23, 23, 23)')
})
