import { test, expect, type Locator, type Page } from '@playwright/test'

const gotoSection = async (page: Page, name: string) => {
  await page.goto('/components')
  const section = page.getByRole('region', { name, exact: true })
  await expect(section).toBeVisible()
  return section
}

const clickOutside = (page: Page) => page.getByRole('heading', { level: 1 }).click()

/** Resolves once every running animation on the element (the 150ms enter animation) has ended. */
const settled = (locator: Locator) =>
  locator.evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished)))

test.describe('Select', () => {
  test('trigger follows the design tokens and starts closed', async ({ page }) => {
    const section = await gotoSection(page, 'Select')
    const trigger = section.getByRole('button', { name: '기본 선택' })
    await expect(trigger).toHaveText('전체')
    await expect(trigger).toHaveCSS('height', '36px')
    await expect(trigger).toHaveCSS('border-radius', '6px')
    await expect(trigger).toHaveCSS('border-top-color', 'rgb(229, 229, 229)')
    await expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(section.getByRole('listbox')).toHaveCount(0)
  })

  test('click opens with the selected option focused; picking selects, closes and refocuses', async ({
    page,
  }) => {
    const section = await gotoSection(page, 'Select')
    const trigger = section.getByRole('button', { name: '기본 선택' })
    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(trigger).toHaveCSS('border-top-color', 'rgb(37, 99, 235)')
    const list = section.getByRole('listbox', { name: '기본 선택' })
    await expect(list.getByRole('option')).toHaveCount(4)
    await expect(list.getByRole('option', { name: '전체' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(list.getByRole('option', { name: '전체' })).toBeFocused()
    await list.getByRole('option', { name: '[옵션 2]' }).click()
    await expect(section.getByRole('listbox')).toHaveCount(0)
    await expect(trigger).toHaveText('[옵션 2]')
    await expect(trigger).toBeFocused()
    await trigger.click()
    await expect(section.getByRole('option', { name: '[옵션 2]' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  test('keyboard: arrows open and move, Home/End, typeahead, Escape, Tab is trapped', async ({
    page,
  }) => {
    const section = await gotoSection(page, 'Select')
    const trigger = section.getByRole('button', { name: '기본 선택' })
    await trigger.focus()
    await page.keyboard.press('ArrowDown')
    await expect(section.getByRole('option', { name: '전체' })).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(section.getByRole('option', { name: '[옵션 1]' })).toBeFocused()
    await page.keyboard.press('End')
    await expect(section.getByRole('option', { name: '[옵션 3]' })).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(section.getByRole('option', { name: '[옵션 3]' })).toBeFocused()
    await page.keyboard.press('Home')
    await expect(section.getByRole('option', { name: '전체' })).toBeFocused()
    await page.keyboard.press('[')
    await expect(section.getByRole('option', { name: '[옵션 1]' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(section.getByRole('option', { name: '[옵션 1]' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(trigger).toHaveText('[옵션 1]')
    await expect(trigger).toBeFocused()
    await page.keyboard.press('ArrowUp')
    await expect(section.getByRole('listbox')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(section.getByRole('listbox')).toHaveCount(0)
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveText('[옵션 1]')
  })

  test('outside click closes; rapid double click on the trigger ends closed', async ({ page }) => {
    const section = await gotoSection(page, 'Select')
    const trigger = section.getByRole('button', { name: '기본 선택' })
    await trigger.click()
    await expect(section.getByRole('listbox')).toBeVisible()
    await clickOutside(page)
    await expect(section.getByRole('listbox')).toHaveCount(0)
    await trigger.dblclick()
    await expect(section.getByRole('listbox')).toHaveCount(0)
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  test('controlled select is named by its label and reports the value', async ({ page }) => {
    const section = await gotoSection(page, 'Select')
    const trigger = section.getByRole('button', { name: '페이지당 행' })
    await expect(trigger).toHaveText('10')
    await expect(trigger).toHaveCSS('width', '80px')
    await trigger.click()
    await section.getByRole('option', { name: '50' }).click()
    await expect(section.getByText('페이지 크기: 50')).toBeVisible()
    await expect(trigger).toHaveText('50')
  })

  test('attached select drops its right radius; popup stays inside the viewport', async ({
    page,
  }) => {
    const section = await gotoSection(page, 'Select')
    const trigger = section.getByRole('button', { name: '검색 대상' })
    await expect(trigger).toHaveCSS('border-top-right-radius', '0px')
    await expect(trigger).toHaveCSS('border-top-left-radius', '6px')
    await trigger.click()
    const list = section.getByRole('listbox', { name: '검색 대상' })
    await settled(list)
    const box = await list.boundingBox()
    const width = page.viewportSize()?.width ?? 0
    expect(box && box.x >= 0 && box.x + box.width <= width).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  })
})

test.describe('Combobox', () => {
  const input = (section: ReturnType<Page['locator']>) =>
    section.getByRole('combobox', { name: '항목 선택' })

  test('opens on click with every option and a placeholder', async ({ page }) => {
    const section = await gotoSection(page, 'Combobox')
    const box = input(section)
    await expect(box).toHaveAttribute('placeholder', '입력하거나 선택하세요')
    await expect(box).toHaveCSS('height', '36px')
    await box.click()
    await expect(section.getByRole('option')).toHaveCount(5)
    await expect(box).toHaveAttribute('aria-expanded', 'true')
  })

  test('typing filters, Enter picks the highlighted option and closes', async ({ page }) => {
    const section = await gotoSection(page, 'Combobox')
    const box = input(section)
    await box.click()
    await box.fill('b')
    await expect(section.getByRole('option')).toHaveCount(1)
    await page.keyboard.press('Enter')
    await expect(box).toHaveValue('[항목 B]')
    await expect(section.getByRole('listbox')).toHaveCount(0)
    await box.click()
    await expect(section.getByRole('option', { name: '[항목 B]' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  test('no match shows the empty text; XSS, SQL and very long input are inert', async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('dialog', (dialog) => {
      errors.push(`dialog:${dialog.message()}`)
      void dialog.dismiss()
    })
    const section = await gotoSection(page, 'Combobox')
    const box = input(section)
    await box.click()
    for (const text of [
      '<img src=x onerror=alert(1)>',
      "'; DROP TABLE users;--",
      'ㅋ'.repeat(5000),
    ]) {
      await box.fill(text)
      await expect(section.getByText('결과가 없습니다.').first()).toBeVisible()
      await expect(section.getByRole('option')).toHaveCount(0)
    }
    expect(errors).toEqual([])
  })

  test('arrow keys move the active descendant; Escape closes then restores the text', async ({
    page,
  }) => {
    const section = await gotoSection(page, 'Combobox')
    const box = input(section)
    await box.click()
    const first = await section.getByRole('option').first().getAttribute('id')
    await expect(box).toHaveAttribute('aria-activedescendant', first ?? '')
    await page.keyboard.press('ArrowDown')
    const second = await section.getByRole('option').nth(1).getAttribute('id')
    await expect(box).toHaveAttribute('aria-activedescendant', second ?? '')
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('ArrowUp')
    await expect(box).toHaveAttribute('aria-activedescendant', first ?? '')
    await box.fill('zzz')
    await page.keyboard.press('Escape')
    await expect(section.getByRole('listbox')).toHaveCount(0)
    await expect(box).toHaveValue('zzz')
    await page.keyboard.press('Escape')
    await expect(box).toHaveValue('')
  })

  test('blur commits an exact label (case-insensitive) and reverts anything else', async ({
    page,
  }) => {
    const section = await gotoSection(page, 'Combobox')
    const box = input(section)
    await box.click()
    await box.fill('[항목 c]')
    await page.keyboard.press('Tab')
    await expect(box).toHaveValue('[항목 C]')
    await box.fill('없는 항목')
    await clickOutside(page)
    await expect(box).toHaveValue('[항목 C]')
  })

  test('controlled combobox clears its value when the text is emptied', async ({ page }) => {
    const section = await gotoSection(page, 'Combobox')
    const box = section.getByRole('combobox', { name: '작성자' })
    await expect(section.getByText('작성자: 없음')).toBeVisible()
    await box.click()
    await section.getByRole('option', { name: 'Alice' }).click()
    await expect(section.getByText('작성자: alice')).toBeVisible()
    await box.fill('')
    await clickOutside(page)
    await expect(section.getByText('작성자: 없음')).toBeVisible()
  })

  test('chevron button toggles the list without stealing focus', async ({ page }) => {
    const section = await gotoSection(page, 'Combobox')
    const box = input(section)
    const chevron = box.locator('..').getByRole('button', { name: '목록 열기' })
    await chevron.click()
    await expect(section.getByRole('listbox')).toBeVisible()
    await expect(box).toBeFocused()
    await box.locator('..').getByRole('button', { name: '목록 닫기' }).click()
    await expect(section.getByRole('listbox')).toHaveCount(0)
  })
})

test.describe('Faceted Filter', () => {
  test('trigger is dashed, opens with a focused search and all options, no clear row', async ({
    page,
  }) => {
    const section = await gotoSection(page, 'Faceted Filter')
    const trigger = section.getByRole('button', { name: '상태' })
    await expect(trigger).toHaveCSS('border-top-style', 'dashed')
    await expect(trigger).toHaveCSS('height', '32px')
    await trigger.click()
    await expect(section.getByRole('combobox', { name: '상태 검색' })).toBeFocused()
    await expect(section.getByRole('option')).toHaveCount(5)
    await expect(section.getByRole('option', { name: '필터 지우기' })).toHaveCount(0)
  })

  test('selecting shows badges, collapses past two, and clearing resets', async ({ page }) => {
    const section = await gotoSection(page, 'Faceted Filter')
    const trigger = section.getByRole('button', { name: '상태' })
    await trigger.click()
    await section.getByRole('option', { name: '게시중' }).click()
    await expect(section.getByRole('option', { name: '게시중' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(trigger).toContainText('게시중')
    await section.getByRole('option', { name: '임시저장' }).click()
    await expect(trigger).toContainText('임시저장')
    await section.getByRole('option', { name: '예약' }).click()
    await expect(trigger).toContainText('3개 선택')
    await expect(section.getByText('선택된 상태: published, draft, scheduled')).toBeVisible()
    await section.getByRole('option', { name: '예약' }).click()
    await expect(trigger).not.toContainText('개 선택')
    await section.getByRole('option', { name: '필터 지우기' }).click()
    await expect(section.getByRole('option', { name: '필터 지우기' })).toHaveCount(0)
    await expect(section.getByText('선택된 상태: 없음')).toBeVisible()
    await expect(trigger).toHaveText('상태')
  })

  test('search narrows the list and shows an empty state', async ({ page }) => {
    const section = await gotoSection(page, 'Faceted Filter')
    await section.getByRole('button', { name: '상태' }).click()
    const search = section.getByRole('combobox', { name: '상태 검색' })
    await search.fill('예')
    await expect(section.getByRole('option')).toHaveCount(1)
    await search.fill('<script>')
    await expect(section.getByText('결과가 없습니다.')).toBeVisible()
    await expect(section.getByRole('option')).toHaveCount(0)
  })

  test('keyboard toggles with Enter, reaches the clear row, and Escape returns focus', async ({
    page,
  }) => {
    const section = await gotoSection(page, 'Faceted Filter')
    const trigger = section.getByRole('button', { name: '상태' })
    await trigger.focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')
    await expect(section.getByRole('option', { name: '게시중' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await page.keyboard.press('End')
    await page.keyboard.press('Enter')
    await expect(section.getByText('선택된 상태: 없음')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(section.getByRole('listbox')).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })

  test('Home and End are left to the text input; only the arrows are intercepted', async ({
    page,
  }) => {
    const section = await gotoSection(page, 'Faceted Filter')
    await section.getByRole('button', { name: '상태' }).click()
    // Default caret movement for Home/End is platform specific, so assert the event stays unprevented.
    await page.evaluate(() => {
      const seen: Record<string, boolean> = {}
      ;(window as unknown as { seen: typeof seen }).seen = seen
      document.addEventListener('keydown', (event) => {
        seen[event.key] = event.defaultPrevented
      })
    })
    for (const key of ['Home', 'End', 'ArrowDown']) await page.keyboard.press(key)
    const seen = await page.evaluate(() => (window as unknown as { seen: object }).seen)
    expect(seen).toEqual({ Home: false, End: false, ArrowDown: true })
  })

  test('Tab out of the search input closes the popup', async ({ page }) => {
    const section = await gotoSection(page, 'Faceted Filter')
    await section.getByRole('button', { name: '상태' }).click()
    await expect(section.getByRole('listbox')).toBeVisible()
    await page.keyboard.press('Tab')
    await expect(section.getByRole('listbox')).toHaveCount(0)
  })

  test('outside click closes and reopening resets the query', async ({ page }) => {
    const section = await gotoSection(page, 'Faceted Filter')
    const trigger = section.getByRole('button', { name: '상태' })
    await trigger.click()
    await section.getByRole('combobox', { name: '상태 검색' }).fill('예')
    await clickOutside(page)
    await expect(section.getByRole('listbox')).toHaveCount(0)
    await trigger.click()
    await expect(section.getByRole('option')).toHaveCount(5)
  })
})

test.describe('Dropdown Menu', () => {
  test('icon trigger opens the menu; arrows move, Enter runs, focus returns', async ({ page }) => {
    const section = await gotoSection(page, 'Dropdown Menu')
    const trigger = section.getByRole('button', { name: '계정 메뉴' })
    await expect(trigger).toHaveCSS('width', '32px')
    await trigger.click()
    const menu = page.getByRole('menu', { name: '계정 메뉴' })
    await expect(menu).toBeFocused()
    await expect(page.getByRole('separator')).toHaveCount(2)
    await page.keyboard.press('ArrowDown')
    await expect(menu.getByRole('menuitem', { name: /프로필/ })).toBeFocused()
    await expect(menu.getByRole('menuitem', { name: /프로필/ })).toHaveCSS(
      'background-color',
      'rgb(245, 245, 245)',
    )
    await page.keyboard.press('Enter')
    await expect(page.getByRole('menu')).toHaveCount(0)
    await expect(section.getByText('마지막 실행: profile')).toBeVisible()
    await expect(trigger).toBeFocused()
  })

  test('trigger keys open on first/last item; typeahead and Home/End work', async ({ page }) => {
    const section = await gotoSection(page, 'Dropdown Menu')
    const trigger = section.getByRole('button', { name: '계정 메뉴' })
    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('menuitem', { name: /프로필/ })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
    await page.keyboard.press('ArrowUp')
    await expect(page.getByRole('menuitem', { name: '로그아웃' })).toBeFocused()
    await page.keyboard.press('Home')
    await expect(page.getByRole('menuitem', { name: /프로필/ })).toBeFocused()
    await page.keyboard.press('End')
    await expect(page.getByRole('menuitem', { name: '로그아웃' })).toBeFocused()
    await expect(page.getByRole('menuitem', { name: '로그아웃' })).toHaveCSS(
      'color',
      'rgb(193, 0, 7)',
    )
    await page.keyboard.press('Tab')
    await expect(page.getByRole('menuitem', { name: '로그아웃' })).toBeFocused()
  })

  test('checkbox item toggles through the controlling parent', async ({ page }) => {
    const section = await gotoSection(page, 'Dropdown Menu')
    const trigger = section.getByRole('button', { name: '계정 메뉴' })
    await trigger.click()
    const item = page.getByRole('menuitemcheckbox', { name: '알림 받기' })
    await expect(item).toHaveAttribute('aria-checked', 'true')
    await item.click()
    await expect(section.getByText('알림: 꺼짐')).toBeVisible()
    await trigger.click()
    await expect(page.getByRole('menuitemcheckbox', { name: '알림 받기' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  test('outline trigger: uncontrolled checkbox, disabled items are skipped and inert', async ({
    page,
  }) => {
    const section = await gotoSection(page, 'Dropdown Menu')
    const trigger = section.getByRole('button', { name: '옵션' })
    await expect(trigger).toHaveCSS('height', '36px')
    await trigger.click()
    const disabled = page.getByRole('menuitem', { name: '복제' })
    await expect(disabled).toBeDisabled()
    await disabled.click({ force: true })
    await expect(page.getByRole('menu')).toBeVisible()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('menuitem', { name: '새로 만들기' })).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('menuitemcheckbox', { name: '미리보기 표시' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('menu')).toHaveCount(0)
    await trigger.click()
    await expect(page.getByRole('menuitemcheckbox', { name: '미리보기 표시' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  test('start-aligned menu hugs the left edge, end-aligned the right edge; outside click closes', async ({
    page,
  }) => {
    const section = await gotoSection(page, 'Dropdown Menu')
    const icon = section.getByRole('button', { name: '계정 메뉴' })
    await icon.click()
    const triggerBox = await icon.boundingBox()
    await settled(page.getByRole('menu'))
    const menuBox = await page.getByRole('menu').boundingBox()
    // Right edges line up unless the menu is wider than the room left of the trigger: then it clamps to x=0.
    const triggerRight = (triggerBox?.x ?? 0) + (triggerBox?.width ?? 0)
    const menuRight = (menuBox?.x ?? 0) + (menuBox?.width ?? 0)
    expect(Math.abs(Math.max(triggerRight, menuBox?.width ?? 0) - menuRight)).toBeLessThan(1.5)
    expect(menuBox?.x).toBeGreaterThanOrEqual(0)
    await clickOutside(page)
    await expect(page.getByRole('menu')).toHaveCount(0)
    const outline = section.getByRole('button', { name: '옵션' })
    await outline.click()
    const outlineBox = await outline.boundingBox()
    const startMenu = await page.getByRole('menu', { name: '옵션' }).boundingBox()
    expect(Math.abs((outlineBox?.x ?? 0) - (startMenu?.x ?? 0))).toBeLessThan(1.5)
    await outline.click()
    await expect(page.getByRole('menu')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  })
})

test.describe('concurrent popovers', () => {
  test('opening another popover while one is open closes the first', async ({ page }) => {
    await page.goto('/components')
    const select = page.getByRole('region', { name: 'Select', exact: true })
    const faceted = page.getByRole('region', { name: 'Faceted Filter', exact: true })
    await select.getByRole('button', { name: '기본 선택' }).click()
    await expect(select.getByRole('listbox')).toBeVisible()
    await faceted.getByRole('button', { name: '상태' }).click()
    await expect(page.getByRole('listbox')).toHaveCount(1)
    await expect(faceted.getByRole('combobox', { name: '상태 검색' })).toBeFocused()
  })

  test('opening a popover while a menu is open closes the menu', async ({ page }) => {
    await page.goto('/components')
    const menus = page.getByRole('region', { name: 'Dropdown Menu' })
    await menus.getByRole('button', { name: '옵션' }).click()
    await expect(page.getByRole('menu')).toBeVisible()
    await page
      .getByRole('region', { name: 'Faceted Filter', exact: true })
      .getByRole('button', { name: '상태' })
      .click()
    await expect(page.getByRole('menu')).toHaveCount(0)
    await expect(page.getByRole('listbox')).toHaveCount(1)
  })

  test('rapid clicks on a menu trigger settle on the parity of the clicks', async ({ page }) => {
    const section = await gotoSection(page, 'Dropdown Menu')
    const trigger = section.getByRole('button', { name: '옵션' })
    for (let i = 0; i < 3; i += 1) await trigger.click()
    await expect(page.getByRole('menu')).toHaveCount(1)
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await trigger.click()
    await expect(page.getByRole('menu')).toHaveCount(0)
  })
})

test.describe('Dropdown Menu portal', () => {
  const insideMenu = (menu: Locator) =>
    menu.evaluate((el) => {
      const rect = el.getBoundingClientRect()
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
      return el.contains(hit)
    })

  test('panel escapes a small overflow:auto ancestor and stays fully visible', async ({ page }) => {
    const section = await gotoSection(page, 'Dropdown Menu')
    const trigger = section.getByRole('button', { name: '계정 메뉴' })
    await trigger.evaluate((el) => {
      const box = el.parentElement?.parentElement
      if (box) box.style.cssText = 'overflow:auto;height:48px;width:120px;position:relative'
    })
    await trigger.click()
    const menu = page.getByRole('menu', { name: '계정 메뉴' })
    await expect(menu).toBeVisible()
    await settled(menu)
    expect(await menu.evaluate((el) => el.parentElement === document.body)).toBe(true)
    const box = await menu.boundingBox()
    const viewport = page.viewportSize()
    expect(box).not.toBeNull()
    expect(box?.x).toBeGreaterThanOrEqual(0)
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewport?.width ?? 0)
    expect(await insideMenu(menu)).toBe(true)
    await menu.getByText('내 계정').click()
    await expect(menu).toBeVisible()
    await clickOutside(page)
    await expect(page.getByRole('menu')).toHaveCount(0)
  })

  test('flips above the trigger when there is no room below', async ({ page }) => {
    const section = await gotoSection(page, 'Dropdown Menu')
    const trigger = section.getByRole('button', { name: '옵션' })
    await trigger.evaluate((el) => {
      const root = el.parentElement
      if (root) root.style.cssText = 'position:fixed;bottom:8px;left:24px'
    })
    await trigger.click()
    const menu = page.getByRole('menu', { name: '옵션' })
    await expect(menu).toBeVisible()
    await settled(menu)
    const menuBox = await menu.boundingBox()
    const triggerBox = await trigger.boundingBox()
    expect((menuBox?.y ?? 0) + (menuBox?.height ?? 0)).toBeLessThanOrEqual(triggerBox?.y ?? 0)
    expect(menuBox?.y).toBeGreaterThanOrEqual(0)
  })

  test('follows the trigger while the page scrolls and keeps keyboard focus handling', async ({
    page,
  }) => {
    const section = await gotoSection(page, 'Dropdown Menu')
    const trigger = section.getByRole('button', { name: '옵션' })
    await trigger.focus()
    await page.keyboard.press('ArrowDown')
    const menu = page.getByRole('menu', { name: '옵션' })
    await expect(menu.getByRole('menuitem', { name: '새로 만들기' })).toBeFocused()
    await page.mouse.wheel(0, 40)
    await expect
      .poll(async () => {
        const t = await trigger.boundingBox()
        const m = await menu.boundingBox()
        return Math.abs((m?.y ?? 0) - ((t?.y ?? 0) + (t?.height ?? 0) + 4))
      })
      .toBeLessThan(2)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })
})
