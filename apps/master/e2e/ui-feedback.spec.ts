import { test, expect, type Page } from '@playwright/test'

const gotoGallery = async (page: Page) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/components')
  return errors
}

const fireToast = async (page: Page, times = 1) => {
  // keyboard activation: toasts may overlap the button on small viewports
  const trigger = page.getByRole('region', { name: 'Toaster' }).getByRole('button', {
    name: '토스트 보기',
  })
  await trigger.focus()
  for (let i = 0; i < times; i++) await page.keyboard.press('Enter')
}

test.describe('Toaster', () => {
  test('shows a styled toast from the demo button and stacks within the alert region', async ({
    page,
  }) => {
    const errors = await gotoGallery(page)
    await expect(page.getByRole('region', { name: '알림' })).toHaveCount(0)
    await fireToast(page)
    const viewport = page.getByRole('region', { name: '알림' })
    const toast = viewport.getByRole('status')
    await expect(toast).toContainText('검색 조건을 적용했습니다')
    await expect(toast).toContainText('전체 게시글을 검색합니다.')
    await expect(toast).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(toast).toHaveCSS('border-radius', '8px')
    const box = await toast.boundingBox()
    const width = page.viewportSize()?.width ?? 0
    expect(Math.round(box?.width ?? 0)).toBe(width >= 500 ? 360 : width - 32)
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    expect(errors).toEqual([])
  })

  test('auto dismisses after five seconds', async ({ page }) => {
    await gotoGallery(page)
    await fireToast(page)
    const toast = page.getByRole('region', { name: '알림' }).getByRole('status')
    await expect(toast).toBeVisible()
    await expect(page.getByRole('region', { name: '알림' })).toHaveCount(0, { timeout: 9000 })
  })

  test('Escape on a focused toast closes it', async ({ page }) => {
    await gotoGallery(page)
    await fireToast(page)
    const toast = page.getByRole('region', { name: '알림' }).getByRole('status')
    await toast.focus()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('region', { name: '알림' })).toHaveCount(0)
  })

  test('toast height transition is 0.15s ease while transform keeps the .5s curve', async ({
    page,
  }) => {
    await gotoGallery(page)
    await fireToast(page)
    const toast = page.getByRole('region', { name: '알림' }).getByRole('status')
    const read = (prop: string) =>
      toast.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)
    expect(await read('transition-property')).toBe('transform, opacity, height')
    expect(await read('transition-duration')).toBe('0.5s, 0.5s, 0.15s')
    expect(await read('transition-timing-function')).toBe(
      'cubic-bezier(0.22, 1, 0.36, 1), ease, ease',
    )
  })

  test('dismissing a focused toast with Escape does not leave the stack paused', async ({
    page,
  }) => {
    await gotoGallery(page)
    await fireToast(page, 2)
    const viewport = page.getByRole('region', { name: '알림' })
    await viewport.locator('[role=status]').last().focus()
    await page.keyboard.press('Escape')
    await expect(viewport.getByRole('status')).toHaveCount(1)
    await expect(viewport).toHaveCount(0, { timeout: 9000 })
  })

  test('demo sample id increments per click like the design', async ({ page }) => {
    await gotoGallery(page)
    await fireToast(page, 6)
    await expect(page.locator('section[aria-label=알림] [role=status]').last()).toContainText(
      'POST-1006',
    )
  })

  test('collapsed stack exposes only the front toast; hover expands up to three', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'hover only')
    await gotoGallery(page)
    await fireToast(page, 4)
    const viewport = page.getByRole('region', { name: '알림' })
    await expect(viewport.getByRole('status')).toHaveCount(1)
    await viewport.locator('[role=status]').last().hover()
    await expect(viewport.getByRole('status')).toHaveCount(3)
  })

  test('hover pauses the timer and leaving resumes it', async ({ page, isMobile }) => {
    test.skip(isMobile, 'hover only')
    await gotoGallery(page)
    await fireToast(page)
    const toast = page.getByRole('region', { name: '알림' }).getByRole('status')
    await toast.hover()
    await page.waitForTimeout(5600)
    await expect(toast).toBeVisible()
    await page.mouse.move(2, 2)
    await expect(page.getByRole('region', { name: '알림' })).toHaveCount(0, { timeout: 8000 })
  })

  test('swiping right past the threshold dismisses; a short drag springs back', async ({
    page,
  }) => {
    await gotoGallery(page)
    await fireToast(page)
    const toast = page.getByRole('region', { name: '알림' }).getByRole('status')
    await expect
      .poll(() => toast.evaluate((el) => getComputedStyle(el).transform))
      .toBe('matrix(1, 0, 0, 1, 0, 0)')
    const box = await toast.boundingBox()
    if (!box) throw new Error('no box')
    const x = box.x + box.width / 2
    const y = box.y + box.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 10, y, { steps: 3 })
    await page.mouse.up()
    await expect(toast).toBeVisible()
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 120, y, { steps: 6 })
    await page.mouse.up()
    await expect(page.getByRole('region', { name: '알림' })).toHaveCount(0)
  })

  test('rapid repeated toasts are capped in the DOM', async ({ page }) => {
    const errors = await gotoGallery(page)
    await fireToast(page, 15)
    await expect(page.locator('section[aria-label=알림] [role=status]')).toHaveCount(5)
    expect(errors).toEqual([])
  })
})

test.describe('AlertDialog', () => {
  const group = (page: Page, name: string) =>
    page.getByRole('region', { name: 'Alert Dialog' }).getByRole('group', { name, exact: true })

  test('opens with alertdialog semantics, focuses cancel and locks body scroll', async ({
    page,
  }) => {
    const errors = await gotoGallery(page)
    const trigger = group(page, 'Basic').getByRole('button', { name: '다이얼로그 열기' })
    await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await trigger.click()
    const dialog = page.getByRole('alertdialog', { name: '정말 진행할까요?' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
    await expect(dialog).toHaveAccessibleDescription(/되돌릴 수 없습니다/)
    await expect(dialog.getByRole('button', { name: '취소' })).toBeFocused()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
    await expect(dialog).toHaveCSS('border-radius', '12px')
    const width = page.viewportSize()?.width ?? 0
    expect(await dialog.evaluate((el) => Number.parseFloat(getComputedStyle(el).width))).toBe(
      width >= 640 ? 384 : 320,
    )
    expect(errors).toEqual([])
  })

  test('Escape closes, restores focus to the trigger and unlocks scroll', async ({ page }) => {
    await gotoGallery(page)
    const trigger = group(page, 'Basic').getByRole('button', { name: '다이얼로그 열기' })
    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect(trigger).toBeFocused()
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
  })

  test('Tab and Shift+Tab are trapped inside the dialog', async ({ page }) => {
    await gotoGallery(page)
    await group(page, 'Basic').getByRole('button', { name: '다이얼로그 열기' }).click()
    const dialog = page.getByRole('alertdialog')
    const cancel = dialog.getByRole('button', { name: '취소' })
    const action = dialog.getByRole('button', { name: '계속' })
    await page.keyboard.press('Tab')
    await expect(action).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(cancel).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(action).toBeFocused()
  })

  test('overlay click does not dismiss; cancel does not run the action; confirm does', async ({
    page,
  }) => {
    await gotoGallery(page)
    const section = page.getByRole('region', { name: 'Alert Dialog' })
    const trigger = group(page, 'Media').getByRole('button', { name: '프로젝트 공유' })
    await trigger.click()
    const dialog = page.getByRole('alertdialog', { name: '이 프로젝트를 공유할까요?' })
    await expect(dialog.locator('svg')).toHaveCount(1)
    await page.mouse.click(2, 2)
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: '취소' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(section.getByText('마지막 동작: 없음')).toBeVisible()
    await trigger.click()
    await page.getByRole('alertdialog').getByRole('button', { name: '공유' }).click()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect(section.getByText('마지막 동작: 공유')).toBeVisible()
  })

  test('small size is 320px wide with a two column footer; destructive media is tinted', async ({
    page,
  }) => {
    await gotoGallery(page)
    await group(page, 'Destructive').getByRole('button', { name: '채팅 삭제' }).click()
    const dialog = page.getByRole('alertdialog', { name: '채팅을 삭제할까요?' })
    expect(await dialog.evaluate((el) => Number.parseFloat(getComputedStyle(el).width))).toBe(320)
    await expect(dialog.locator('[data-slot=footer]')).toHaveCSS('display', 'grid')
    await expect(dialog.locator('[data-slot=media]')).toHaveCSS('background-color', / 0\.1\)$/)
    await expect(dialog.getByRole('button', { name: '삭제' })).toHaveCSS('color', 'rgb(193, 0, 7)')
  })

  test('rapid open and Escape cycles leave the page unlocked', async ({ page }) => {
    const errors = await gotoGallery(page)
    const trigger = group(page, 'Small').getByRole('button', { name: '다이얼로그 열기' })
    await trigger.focus()
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Enter')
      await page.keyboard.press('Escape')
    }
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
    expect(errors).toEqual([])
  })
})

test.describe('AlertDialog scroll lock and focus return', () => {
  const triggerOf = (page: Page, name: string, label: string) =>
    page
      .getByRole('region', { name: 'Alert Dialog' })
      .getByRole('group', { name, exact: true })
      .getByRole('button', { name: label })
  const overflow = (page: Page) => page.evaluate(() => document.body.style.overflow)

  test('body stays locked until the last of two open dialogs closes', async ({ page }) => {
    await gotoGallery(page)
    await triggerOf(page, 'Basic', '다이얼로그 열기').click()
    await triggerOf(page, 'Small', '다이얼로그 열기').evaluate((el: HTMLElement) => el.click())
    await expect(page.getByRole('alertdialog')).toHaveCount(2)
    const first = page.getByRole('alertdialog', { name: '정말 진행할까요?' })
    await first.getByRole('button', { name: '취소' }).focus()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('alertdialog')).toHaveCount(1)
    expect(await overflow(page)).toBe('hidden')
    await page.getByRole('alertdialog').getByRole('button', { name: '허용 안 함' }).focus()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    expect(await overflow(page)).toBe('')
  })

  test('focus returns to a connected ancestor when the opener was removed', async ({ page }) => {
    await gotoGallery(page)
    const trigger = triggerOf(page, 'Basic', '다이얼로그 열기')
    await trigger.click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await trigger.evaluate((el) => el.remove())
    await page.keyboard.press('Escape')
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    const section = page.getByRole('region', { name: 'Alert Dialog' })
    expect(await section.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  })
})

test.describe('Skeleton', () => {
  test('renders avatar and line placeholders with pulse animation, hidden from AT', async ({
    page,
  }) => {
    await gotoGallery(page)
    const bars = page.getByRole('region', { name: 'Skeleton' }).locator('[data-slot=skeleton]')
    await expect(bars).toHaveCount(3)
    await expect(bars.nth(0)).toHaveCSS('width', '48px')
    await expect(bars.nth(0)).toHaveCSS('border-radius', '999px')
    await expect(bars.nth(1)).toHaveCSS('width', '250px')
    await expect(bars.nth(2)).toHaveCSS('width', '200px')
    await expect(bars.nth(2)).toHaveCSS('height', '16px')
    await expect(bars.nth(2)).toHaveCSS('background-color', 'rgb(245, 245, 245)')
    await expect(bars.nth(2)).toHaveCSS('animation-name', 'skeleton-pulse')
    await expect(bars.nth(2)).toHaveAttribute('aria-hidden', 'true')
  })
})

test.describe('Spinner', () => {
  test('exposes labelled status spinners in four sizes that rotate', async ({ page }) => {
    await gotoGallery(page)
    const section = page.getByRole('region', { name: 'Spinner' })
    const spinners = section.getByRole('status', { name: '로딩 중' })
    await expect(spinners).toHaveCount(5)
    for (const [index, size] of [16, 12, 16, 24, 32].entries()) {
      await expect(spinners.nth(index)).toHaveCSS('width', `${size}px`)
    }
    await expect(spinners.first()).toHaveCSS('animation-name', 'spinner-spin')
  })

  test('badge matches the design (gap 4, line-height 16, height 22)', async ({ page }) => {
    await gotoGallery(page)
    const badge = page.getByRole('region', { name: 'Spinner' }).getByText('동기화 중')
    await expect(badge).toHaveCSS('column-gap', '4px')
    await expect(badge).toHaveCSS('line-height', '16px')
    expect(Math.round((await badge.boundingBox())?.height ?? 0)).toBe(22)
  })

  test('decorative spinners inside disabled buttons and badges are aria-hidden', async ({
    page,
  }) => {
    await gotoGallery(page)
    const section = page.getByRole('region', { name: 'Spinner' })
    const button = section.getByRole('button', { name: '불러오는 중…' })
    await expect(button).toBeDisabled()
    await expect(button.locator('svg')).toHaveAttribute('aria-hidden', 'true')
    await expect(section.getByText('동기화 중').locator('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
  })
})

test.describe('Empty', () => {
  test('matches the artboard: dashed border, folder media, keyboard-operable actions', async ({
    page,
  }) => {
    await gotoGallery(page)
    const section = page.getByRole('region', { name: 'Empty' })
    const boxes = section.locator('[data-slot=empty]')
    await expect(boxes).toHaveCount(1)
    const box = boxes.first()
    await expect(box).toHaveCSS('border-top-style', 'dashed')
    await expect(box.getByText('아직 프로젝트가 없어요')).toBeVisible()
    const create = box.getByRole('button', { name: '프로젝트 만들기' })
    await create.focus()
    await page.keyboard.press('Tab')
    await expect(box.getByRole('button', { name: '가져오기' })).toBeFocused()
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  })

  test('outline action keeps the Empty artboard hover text color (#0A0A0A)', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'no hover on touch')
    await gotoGallery(page)
    const secondary = page.getByRole('region', { name: 'Empty' }).getByRole('button', {
      name: '가져오기',
    })
    // Lazy gallery sections can shift the layout under a stationary pointer, so re-hover until it sticks.
    await expect(async () => {
      await secondary.hover()
      await expect(secondary).toHaveCSS('background-color', 'rgb(245, 245, 245)', { timeout: 500 })
    }).toPass()
    await expect(secondary).toHaveCSS('color', 'rgb(10, 10, 10)')
  })
})
