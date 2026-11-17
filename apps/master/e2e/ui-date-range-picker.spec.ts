import { test, expect, type Page } from '@playwright/test'

const setup = async (page: Page) => {
  await page.clock.setFixedTime('2028-02-10T12:00:00Z')
  await page.goto('/components')
  const section = page.getByRole('region', { name: 'Date Range Picker' })
  const trigger = section.getByRole('button', { name: '기간', exact: true })
  const dialog = page.getByRole('dialog', { name: '날짜 범위 선택' })
  const startGrid = dialog.getByRole('grid', { name: '시작일' })
  const endGrid = dialog.getByRole('grid', { name: '종료일' })
  const day = (grid: typeof startGrid, label: string) =>
    grid.getByRole('button', { name: label, exact: true })
  return { section, trigger, dialog, startGrid, endGrid, day }
}

test.describe('uncontrolled picker', () => {
  test('shows the placeholder, opens two calendars around the fixed today and focuses today', async ({
    page,
  }) => {
    const { trigger, dialog, startGrid, endGrid, day } = await setup(page)
    await expect(trigger).toHaveText('날짜 선택')
    await expect(trigger).toHaveCSS('height', '36px')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(trigger).toHaveCSS('border-color', 'rgb(37, 99, 235)')
    await expect(dialog.getByText('2028년 2월')).toBeVisible()
    await expect(dialog.getByText('2028년 3월')).toBeVisible()
    await expect(dialog.getByText('시작일', { exact: true })).toBeVisible()
    const today = day(startGrid, '2028년 2월 10일, 오늘')
    await expect(today).toBeFocused()
    await expect(today).toHaveAttribute('tabindex', '0')
    await expect(today).toHaveCSS('background-color', 'rgb(245, 245, 245)')
    await expect(day(endGrid, '2028년 3월 10일')).toHaveAttribute('tabindex', '-1')
  })

  test('picks a start and an end and highlights the range between', async ({ page }) => {
    const { trigger, startGrid, endGrid, day } = await setup(page)
    await trigger.click()
    await day(startGrid, '2028년 2월 5일').click()
    await expect(trigger).toHaveText('2028.02.05 -')
    await day(endGrid, '2028년 3월 2일').click()
    await expect(trigger).toHaveText('2028.02.05 - 2028.03.02')
    const start = day(startGrid, '2028년 2월 5일')
    await expect(start).toHaveAttribute('aria-pressed', 'true')
    await expect(start).toHaveCSS('background-color', 'rgb(37, 99, 235)')
    await expect(start).toHaveCSS('color', 'rgb(255, 255, 255)')
    const mid = day(startGrid, '2028년 2월 20일')
    await expect(mid).toHaveCSS('background-color', 'rgb(239, 246, 255)')
    await expect(mid).toHaveCSS('color', 'rgb(29, 78, 216)')
    await page.mouse.move(0, 0)
    await expect(day(endGrid, '2028년 3월 2일')).toHaveCSS('background-color', 'rgb(37, 99, 235)')
    await expect(day(endGrid, '2028년 3월 5일')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  })

  test('blocks an end before the start and a start after the end', async ({ page }) => {
    const { trigger, dialog, startGrid, endGrid, day } = await setup(page)
    await trigger.click()
    await day(startGrid, '2028년 2월 20일').click()
    await dialog.getByRole('button', { name: '종료일 이전 달' }).click()
    await expect(day(endGrid, '2028년 2월 19일')).toBeDisabled()
    await expect(day(endGrid, '2028년 2월 20일')).toBeEnabled()
    await day(endGrid, '2028년 2월 25일').click()
    await expect(day(startGrid, '2028년 2월 26일')).toBeDisabled()
    await expect(day(startGrid, '2028년 2월 25일')).toBeEnabled()
    await expect(day(startGrid, '2028년 2월 26일')).toHaveCSS('opacity', '0.5')
  })

  test('allows a same-day range without highlighting a band', async ({ page }) => {
    const { trigger, dialog, startGrid, endGrid, day } = await setup(page)
    await trigger.click()
    await day(startGrid, '2028년 2월 10일, 오늘').click()
    await dialog.getByRole('button', { name: '종료일 이전 달' }).click()
    await day(endGrid, '2028년 2월 10일, 오늘').click()
    await expect(trigger).toHaveText('2028.02.10 - 2028.02.10')
    await expect(day(startGrid, '2028년 2월 10일, 오늘')).toHaveCSS(
      'background-color',
      'rgb(37, 99, 235)',
    )
    await expect(day(startGrid, '2028년 2월 11일')).toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0)',
    )
  })

  test('clicking a selected day again clears it; double click toggles back to empty', async ({
    page,
  }) => {
    const { trigger, startGrid, day } = await setup(page)
    await trigger.click()
    const target = day(startGrid, '2028년 2월 5일')
    await target.click()
    await expect(target).toHaveAttribute('aria-pressed', 'true')
    await target.click()
    await expect(trigger).toHaveText('날짜 선택')
    await expect(target).toHaveAttribute('aria-pressed', 'false')
    await target.dblclick()
    await expect(trigger).toHaveText('날짜 선택')
  })

  test('selection survives close and reopen with the stored months in view', async ({ page }) => {
    const { trigger, dialog, startGrid, endGrid, day } = await setup(page)
    await trigger.click()
    await day(startGrid, '2028년 2월 5일').click()
    await dialog.getByRole('button', { name: '종료일 다음 달' }).click()
    await day(endGrid, '2028년 4월 7일').click()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await trigger.click()
    await expect(dialog.getByText('2028년 2월')).toBeVisible()
    await expect(dialog.getByText('2028년 4월')).toBeVisible()
    await expect(trigger).toHaveText('2028.02.05 - 2028.04.07')
  })

  test('month navigation crosses year boundaries and a missing leap day', async ({ page }) => {
    const { trigger, dialog, startGrid, day } = await setup(page)
    await trigger.click()
    const next = dialog.getByRole('button', { name: '시작일 다음 달' })
    await expect(day(startGrid, '2028년 2월 29일')).toBeVisible()
    for (let i = 0; i < 12; i++) await next.click()
    await expect(dialog.getByText('2029년 2월')).toBeVisible()
    await expect(
      startGrid.getByRole('button', { name: '2029년 2월 28일', exact: true }),
    ).toBeVisible()
    await expect(
      startGrid.getByRole('button', { name: '2029년 2월 29일', exact: true }),
    ).toHaveCount(0)
    const prev = dialog.getByRole('button', { name: '시작일 이전 달' })
    for (let i = 0; i < 14; i++) await prev.click()
    await expect(dialog.getByText('2027년 12월')).toBeVisible()
  })
})

test.describe('keyboard and dismissal', () => {
  test('opens with Enter, moves with arrows, selects with Space/Enter and closes with Escape', async ({
    page,
  }) => {
    const { trigger, dialog, startGrid, day } = await setup(page)
    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(day(startGrid, '2028년 2월 10일, 오늘')).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(day(startGrid, '2028년 2월 11일')).toBeFocused()
    await page.keyboard.press('End')
    await expect(day(startGrid, '2028년 2월 12일')).toBeFocused()
    await page.keyboard.press('Home')
    await expect(day(startGrid, '2028년 2월 6일')).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(day(startGrid, '2028년 2월 13일')).toBeFocused()
    await page.keyboard.press('ArrowUp')
    await expect(day(startGrid, '2028년 2월 6일')).toBeFocused()
    await page.keyboard.press('Space')
    await expect(trigger).toHaveText('2028.02.06 -')
    await expect(day(startGrid, '2028년 2월 6일')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(trigger).toHaveText('날짜 선택')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('PageDown/PageUp change the month, Shift jumps a year and clamps the leap day', async ({
    page,
  }) => {
    const { trigger, dialog, startGrid, day } = await setup(page)
    await trigger.click()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight')
    await expect(day(startGrid, '2028년 2월 29일')).toBeFocused()
    await page.keyboard.press('PageDown')
    await expect(dialog.getByText('2028년 3월').first()).toBeVisible()
    await expect(day(startGrid, '2028년 3월 29일')).toBeFocused()
    await page.keyboard.press('PageUp')
    await expect(day(startGrid, '2028년 2월 29일')).toBeFocused()
    await page.keyboard.press('Shift+PageDown')
    await expect(dialog.getByText('2029년 2월').first()).toBeVisible()
    await expect(day(startGrid, '2029년 2월 28일')).toBeFocused()
  })

  test('arrow keys do not move onto a disabled day', async ({ page }) => {
    const { trigger, startGrid, endGrid, day } = await setup(page)
    await trigger.click()
    await day(startGrid, '2028년 2월 10일, 오늘').click()
    await day(endGrid, '2028년 3월 1일').click()
    await day(startGrid, '2028년 2월 29일').focus()
    await page.keyboard.press('ArrowRight')
    await expect(day(startGrid, '2028년 3월 1일')).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(day(startGrid, '2028년 3월 1일')).toBeFocused()
  })

  test('closes on outside click and on trigger toggle, stays open for inside clicks', async ({
    page,
  }) => {
    const { trigger, dialog, startGrid, day } = await setup(page)
    await trigger.click()
    await day(startGrid, '2028년 2월 5일').click()
    await dialog.getByText('시작일', { exact: true }).click()
    await expect(dialog).toBeVisible()
    await page.getByRole('heading', { level: 1, name: '컴포넌트' }).click()
    await expect(dialog).toBeHidden()
    await trigger.click()
    await expect(dialog).toBeVisible()
    await trigger.click()
    await expect(dialog).toBeHidden()
  })

  test('rapid trigger clicks end in a consistent state', async ({ page }) => {
    const { trigger, dialog } = await setup(page)
    for (let i = 0; i < 5; i++) await trigger.click({ delay: 0 })
    await expect(dialog).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await trigger.click()
    await expect(dialog).toBeHidden()
  })
})

test.describe('controlled picker with an external label', () => {
  test('reflects the controlled range, labelled by the external label, with leap-day selection', async ({
    page,
  }) => {
    const { section, dialog, startGrid, endGrid, day } = await setup(page)
    const trigger = section.getByRole('button', { name: '조회 기간', exact: true })
    await expect(trigger).toHaveText('2028.02.28 - 2028.03.02')
    const value = section.getByTestId('drp-value')
    await expect(value).toHaveText('2028-02-28 ~ 2028-03-02')
    await trigger.click()
    await expect(dialog.getByText('2028년 2월')).toBeVisible()
    await expect(dialog.getByText('2028년 3월')).toBeVisible()
    await expect(day(startGrid, '2028년 3월 3일')).toBeDisabled()
    await expect(day(endGrid, '2028년 2월 27일')).toBeDisabled()
    await day(startGrid, '2028년 2월 29일').click()
    await expect(value).toHaveText('2028-02-29 ~ 2028-03-02')
    await expect(trigger).toHaveText('2028.02.29 - 2028.03.02')
    await day(endGrid, '2028년 3월 2일').click()
    await expect(value).toHaveText('2028-02-29 ~ 미선택')
    await expect(trigger).toHaveText('2028.02.29 -')
    await day(startGrid, '2028년 2월 29일').click()
    await expect(trigger).toHaveText('날짜 선택')
    await expect(value).toHaveText('미선택 ~ 미선택')
  })
})

test('popover stays inside the viewport and the page does not scroll horizontally', async ({
  page,
}) => {
  const { trigger, dialog } = await setup(page)
  await trigger.click()
  await expect(dialog).toBeVisible()
  await dialog.evaluate((el) =>
    Promise.all(el.getAnimations().map((animation) => animation.finished)),
  )
  const box = await dialog.boundingBox()
  const width = await page.evaluate(() => innerWidth)
  expect(box).not.toBeNull()
  expect(box?.x).toBeGreaterThanOrEqual(0)
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width)
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
})

test('month navigation and day buttons use the pointer cursor, disabled days the default one', async ({
  page,
}) => {
  const { trigger, startGrid, endGrid, day } = await setup(page)
  await trigger.click()
  await expect(startGrid.getByRole('button', { name: '시작일 다음 달' })).toHaveCSS(
    'cursor',
    'pointer',
  )
  await expect(startGrid.getByRole('button', { name: '시작일 이전 달' })).toHaveCSS(
    'cursor',
    'pointer',
  )
  await expect(day(startGrid, '2028년 2월 10일, 오늘')).toHaveCSS('cursor', 'pointer')
  await day(startGrid, '2028년 2월 5일').click()
  await day(endGrid, '2028년 3월 2일').click()
  await expect(day(startGrid, '2028년 2월 5일')).toHaveCSS('cursor', 'pointer')
  await expect(day(startGrid, '2028년 2월 7일')).toHaveCSS('cursor', 'pointer')
  await expect(day(endGrid, '2028년 3월 2일')).toHaveCSS('cursor', 'pointer')
  await expect(day(endGrid, '2028년 3월 1일')).toHaveCSS('cursor', 'pointer')
  await expect(day(startGrid, '2028년 3월 3일')).toHaveCSS('cursor', 'default')
})
