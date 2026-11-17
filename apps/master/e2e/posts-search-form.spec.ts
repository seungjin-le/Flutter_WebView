import { test, expect, type Page } from '@playwright/test'

const setup = async (page: Page, which: 'toast' | 'callback' = 'toast') => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.clock.setFixedTime('2028-02-10T12:00:00Z')
  await page.goto('/components')
  const root = page
    .getByRole('region', { name: 'Search Form' })
    .getByTestId(which === 'toast' ? 'sf-toast' : 'sf-callback')
  const keyword = root.getByLabel('검색어', { exact: true })
  const search = root.getByRole('button', { name: '검색', exact: true })
  const reset = root.getByRole('button', { name: '초기화' })
  const advanced = root.getByRole('button', { name: /상세 검색/ })
  const toasts = page.getByRole('region', { name: '알림' }).getByRole('status')
  const readout = page.getByTestId('sf-query')
  const badges = root.getByRole('list', { name: '적용된 필터' }).getByRole('listitem')
  const pick = async (trigger: string, option: string) => {
    await root.getByRole('button', { name: trigger, exact: true }).click()
    await root.getByRole('option', { name: option, exact: true }).click()
  }
  return { errors, root, keyword, search, reset, advanced, toasts, readout, badges, pick }
}

const emptyQuery = {
  field: 'title_body',
  kw: '',
  category: 'all',
  author: '',
  from: '',
  to: '',
  status: [],
  showOn: [],
  sort: 'latest',
  size: '20',
  pinned: false,
}

test.describe('layout', () => {
  test('renders title, description, helper text, empty badge state and open advanced section', async ({
    page,
  }) => {
    const { errors, root, advanced, badges } = await setup(page)
    await expect(root.getByRole('heading', { name: '검색 필터' })).toBeVisible()
    await expect(root.getByText('조건을 조합해 게시글을 찾습니다.')).toBeVisible()
    await expect(root.getByText('제목, 내용 또는 태그에서 2자 이상으로 검색합니다.')).toBeVisible()
    await expect(root.getByText('적용된 필터가 없습니다.')).toBeVisible()
    await expect(badges).toHaveCount(0)
    await expect(advanced).toHaveAttribute('aria-expanded', 'true')
    await expect(root.getByRole('radiogroup', { name: '정렬' })).toBeVisible()
    await expect(root.getByRole('group', { name: '노출 위치' })).toBeVisible()
    await expect(root.getByRole('switch', { name: '상단 고정 글만 보기' })).toBeVisible()
    await expect(root.getByRole('button', { name: '목록 개수' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    expect(errors).toEqual([])
  })

  test('keyword input has design size and the select is attached on the left', async ({ page }) => {
    const { root, keyword } = await setup(page)
    await expect(keyword).toHaveCSS('height', '36px')
    await expect(keyword).toHaveAttribute('placeholder', '검색어를 입력하세요')
    await expect(keyword).toHaveCSS('border-left-width', '0px')
    await expect(keyword).toHaveCSS('border-top-left-radius', '0px')
    await expect(root.getByRole('button', { name: '검색 대상' })).toHaveText('제목+내용')
  })
})

test.describe('advanced section', () => {
  test('toggles with aria-expanded and rapid clicks end in a consistent state', async ({
    page,
  }) => {
    const { root, advanced } = await setup(page)
    await advanced.click()
    await expect(advanced).toHaveAttribute('aria-expanded', 'false')
    await expect(root.getByRole('radiogroup', { name: '정렬' })).toHaveCount(0)
    await advanced.click()
    await expect(root.getByRole('radiogroup', { name: '정렬' })).toBeVisible()
    for (let i = 0; i < 5; i++) await advanced.click()
    await expect(advanced).toHaveAttribute('aria-expanded', 'false')
    await expect(root.getByRole('radiogroup', { name: '정렬' })).toHaveCount(0)
  })

  test('collapsed advanced filters still apply and keep their badges', async ({ page }) => {
    const { root, advanced, badges } = await setup(page)
    await root.getByRole('switch', { name: '상단 고정 글만 보기' }).click()
    await advanced.click()
    await expect(badges).toHaveText(['상단 고정 글만'])
  })

  test('is controllable from the keyboard', async ({ page }) => {
    const { advanced, root } = await setup(page)
    await advanced.focus()
    await page.keyboard.press('Enter')
    await expect(root.getByRole('radiogroup', { name: '정렬' })).toHaveCount(0)
    await page.keyboard.press('Space')
    await expect(root.getByRole('radiogroup', { name: '정렬' })).toBeVisible()
  })
})

test.describe('validation and toast', () => {
  test('one character shows the error, flags the input, focuses it and shows no toast', async ({
    page,
  }) => {
    const { root, keyword, search, toasts } = await setup(page)
    await keyword.fill('a')
    await search.click()
    await expect(root.getByText('검색어는 2자 이상 입력하세요.')).toBeVisible()
    await expect(keyword).toHaveAttribute('aria-invalid', 'true')
    await expect(keyword).toBeFocused()
    await expect(root.locator('label', { hasText: '검색어' })).toHaveCSS('color', 'rgb(231, 0, 11)')
    await expect(toasts).toHaveCount(0)
  })

  test('fixing the keyword clears the error and shows the success toast with a filter count', async ({
    page,
  }) => {
    const { root, keyword, toasts } = await setup(page)
    await keyword.fill('a')
    await keyword.press('Enter')
    await expect(keyword).toHaveAttribute('aria-invalid', 'true')
    await keyword.fill('ab')
    await expect(keyword).toHaveAttribute('aria-invalid', 'false')
    await expect(root.getByText('검색어는 2자 이상 입력하세요.')).toHaveCount(0)
    await keyword.press('Enter')
    await expect(toasts).toContainText('검색 조건을 적용했습니다')
    await expect(toasts).toContainText('필터 1개로 게시글을 검색합니다.')
  })

  test('empty and whitespace-only keywords are valid and search everything', async ({ page }) => {
    const { keyword, search, toasts } = await setup(page)
    await keyword.fill('   ')
    await search.click()
    await expect(keyword).toHaveAttribute('aria-invalid', 'false')
    await expect(toasts).toContainText('전체 게시글을 검색합니다.')
  })

  test('the error stays hidden until the first submit while typing a short keyword', async ({
    page,
  }) => {
    const { root, keyword } = await setup(page)
    await keyword.fill('x')
    await expect(root.getByText('검색어는 2자 이상 입력하세요.')).toHaveCount(0)
  })

  test('reset removes a shown error', async ({ page }) => {
    const { root, keyword, search, reset } = await setup(page)
    await keyword.fill('a')
    await search.click()
    await expect(keyword).toHaveAttribute('aria-invalid', 'true')
    await reset.click()
    await expect(keyword).toHaveValue('')
    await expect(keyword).toHaveAttribute('aria-invalid', 'false')
    await expect(root.getByText('검색어는 2자 이상 입력하세요.')).toHaveCount(0)
  })

  test('counts every applied filter in the toast', async ({ page }) => {
    const { root, keyword, pick, toasts } = await setup(page)
    await keyword.fill('가나')
    await pick('카테고리', '[카테고리 1]')
    await root.getByRole('checkbox', { name: '공지 영역' }).click()
    await keyword.press('Enter')
    await expect(toasts).toContainText('필터 3개로 게시글을 검색합니다.')
  })
})

test.describe('filter badges', () => {
  test('keyword and select/combobox/facet/range filters create badges in design order', async ({
    page,
  }) => {
    const { root, keyword, pick, badges } = await setup(page)
    await keyword.fill('  hello  ')
    await pick('검색 대상', '제목')
    await pick('카테고리', '[카테고리 2]')
    await root.getByRole('combobox', { name: '작성자' }).click()
    await root.getByRole('option', { name: '[작성자 B]' }).click()
    await root.getByRole('button', { name: '게시 상태' }).click()
    await root.getByRole('option', { name: '임시저장' }).click()
    await root.getByRole('option', { name: '비공개' }).click()
    await keyword.click()
    await root.getByRole('button', { name: '등록일' }).click()
    const dialog = page.getByRole('dialog', { name: '날짜 범위 선택' })
    await dialog
      .getByRole('grid', { name: '시작일' })
      .getByRole('button', { name: '2028년 2월 5일', exact: true })
      .click()
    await dialog
      .getByRole('grid', { name: '종료일' })
      .getByRole('button', { name: '2028년 3월 2일', exact: true })
      .click()
    await page.keyboard.press('Escape')
    await expect(badges).toHaveText([
      '제목: hello',
      '카테고리: [카테고리 2]',
      '작성자: [작성자 B]',
      '등록일: 2028.02.05 - 2028.03.02',
      '상태: 임시저장, 비공개',
    ])
  })

  test('advanced controls create badges: show positions in click order, switch, sort, size', async ({
    page,
  }) => {
    const { root, pick, badges } = await setup(page)
    await root.getByRole('checkbox', { name: '목록 상단' }).click()
    await root.getByRole('checkbox', { name: '메인 화면' }).click()
    await root.getByRole('switch', { name: '상단 고정 글만 보기' }).click()
    await root.getByRole('radio', { name: '조회수순' }).click()
    await pick('목록 개수', '50개씩')
    await expect(badges).toHaveText([
      '노출: 목록 상단, 메인 화면',
      '상단 고정 글만',
      '정렬: 조회수순',
      '목록: 50개씩',
    ])
    await root.getByRole('checkbox', { name: '목록 상단' }).click()
    await expect(badges.first()).toHaveText('노출: 메인 화면')
  })

  test('each badge x button has an aria-label and removes only that filter', async ({ page }) => {
    const { root, keyword, pick, badges } = await setup(page)
    await keyword.fill('hello')
    await pick('카테고리', '[카테고리 3]')
    await root.getByRole('button', { name: '카테고리: [카테고리 3] 필터 제거' }).click()
    await expect(badges).toHaveText(['제목+내용: hello'])
    await expect(root.getByRole('button', { name: '카테고리' })).toHaveText('전체')
    await root.getByRole('button', { name: '제목+내용: hello 필터 제거' }).click()
    await expect(keyword).toHaveValue('')
    await expect(root.getByText('적용된 필터가 없습니다.')).toBeVisible()
  })

  test('removing the range badge clears both dates', async ({ page }) => {
    const { root, badges } = await setup(page)
    await root.getByRole('button', { name: '등록일' }).click()
    await page
      .getByRole('dialog', { name: '날짜 범위 선택' })
      .getByRole('grid', { name: '시작일' })
      .getByRole('button', { name: '2028년 2월 5일', exact: true })
      .click()
    await page.keyboard.press('Escape')
    await expect(badges).toHaveText(['등록일: 2028.02.05 -'])
    await root.getByRole('button', { name: '등록일: 2028.02.05 - 필터 제거' }).click()
    await expect(root.getByRole('button', { name: '등록일' })).toHaveText('날짜 선택')
  })

  test('badge x is keyboard operable', async ({ page }) => {
    const { root, keyword, badges } = await setup(page)
    await keyword.fill('abc')
    await root.getByRole('button', { name: '제목+내용: abc 필터 제거' }).focus()
    await page.keyboard.press('Enter')
    await expect(badges).toHaveCount(0)
  })
})

test.describe('reset', () => {
  test('restores every control to its default', async ({ page }) => {
    const { root, keyword, pick, reset, badges } = await setup(page)
    await keyword.fill('hello')
    await pick('검색 대상', '태그')
    await pick('카테고리', '[카테고리 1]')
    await root.getByRole('checkbox', { name: '메인 화면' }).click()
    await root.getByRole('switch', { name: '상단 고정 글만 보기' }).click()
    await root.getByRole('radio', { name: '제목순' }).click()
    await pick('목록 개수', '100개씩')
    await expect(badges).toHaveCount(6)
    await reset.click()
    await expect(badges).toHaveCount(0)
    await expect(keyword).toHaveValue('')
    await expect(root.getByRole('button', { name: '검색 대상' })).toHaveText('제목+내용')
    await expect(root.getByRole('button', { name: '카테고리' })).toHaveText('전체')
    await expect(root.getByRole('button', { name: '목록 개수' })).toHaveText('20개씩')
    await expect(root.getByRole('checkbox', { name: '메인 화면' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    await expect(root.getByRole('switch', { name: '상단 고정 글만 보기' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    await expect(root.getByRole('radio', { name: '최신 등록순' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  test('does not toast', async ({ page }) => {
    const { reset, toasts } = await setup(page)
    await reset.click()
    await expect(toasts).toHaveCount(0)
  })
})

test.describe('onSearch callback', () => {
  test('receives the typed query instead of toasting', async ({ page }) => {
    const { root, keyword, pick, readout, toasts, advanced } = await setup(page, 'callback')
    await advanced.click()
    await expect(readout).toHaveText('아직 검색하지 않았습니다.')
    await keyword.fill('hello')
    await pick('카테고리', '[카테고리 2]')
    await root.getByRole('checkbox', { name: '공지 영역' }).click()
    await root.getByRole('switch', { name: '상단 고정 글만 보기' }).click()
    await keyword.press('Enter')
    expect(JSON.parse((await readout.textContent()) ?? '')).toEqual({
      ...emptyQuery,
      kw: 'hello',
      category: 'cat2',
      showOn: ['notice'],
      pinned: true,
    })
    await expect(toasts).toHaveCount(0)
  })

  test('is not called while the keyword is invalid', async ({ page }) => {
    const { keyword, search, readout } = await setup(page, 'callback')
    await keyword.fill('a')
    await search.click()
    await expect(readout).toHaveText('아직 검색하지 않았습니다.')
  })

  test('reset calls it with the defaults', async ({ page }) => {
    const { keyword, reset, readout } = await setup(page, 'callback')
    await keyword.fill('hello')
    await keyword.press('Enter')
    await expect(readout).toContainText('hello')
    await reset.click()
    expect(JSON.parse((await readout.textContent()) ?? '')).toEqual(emptyQuery)
  })

  test('starts with the advanced section closed when advancedOpen is false', async ({ page }) => {
    const { root, advanced } = await setup(page, 'callback')
    await expect(advanced).toHaveAttribute('aria-expanded', 'false')
    await expect(root.getByRole('radiogroup', { name: '정렬' })).toHaveCount(0)
  })

  test('passes odd keywords through untouched: markup, SQL, emoji, multibyte, very long', async ({
    page,
  }) => {
    const { root, keyword, readout, badges, errors } = await setup(page, 'callback')
    const long = '가'.repeat(5000)
    for (const kw of [
      '<img src=x onerror=alert(1)>',
      "'; DROP TABLE posts;--",
      '😀🎉',
      'テスト',
      long,
    ]) {
      await keyword.fill(kw)
      await keyword.press('Enter')
      expect(JSON.parse((await readout.textContent()) ?? '').kw).toBe(kw)
    }
    await keyword.fill('<b>x</b>')
    await expect(badges.first()).toContainText('<b>x</b>')
    await expect(root.locator('b')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    expect(errors).toEqual([])
  })
})
