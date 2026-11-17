import { test, expect, type Page } from '@playwright/test'

const open = async (page: Page, name: string) => {
  await page.goto('/components')
  const region = page.getByRole('region', { name })
  await expect(region).toBeVisible()
  return region
}

test.describe('Checkbox', () => {
  test('toggles by click and label click, with checked styling', async ({ page }) => {
    const region = await open(page, 'Checkbox')
    const box = region.getByRole('checkbox', { name: '체크박스' })
    await expect(box).toHaveAttribute('aria-checked', 'false')
    await expect(box).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await box.click()
    await expect(box).toHaveAttribute('aria-checked', 'true')
    await expect(box).toHaveCSS('background-color', 'rgb(37, 99, 235)')
    await region.getByText('체크박스', { exact: true }).click()
    await expect(box).toHaveAttribute('aria-checked', 'false')
    await expect(box).toHaveCSS('width', '16px')
    await expect(box).toHaveCSS('border-radius', '4px')
  })

  test('starts checked with defaultChecked', async ({ page }) => {
    const region = await open(page, 'Checkbox')
    await expect(region.getByRole('checkbox', { name: '선택됨' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  test('Space and Enter toggle from the keyboard and show focus ring', async ({ page }) => {
    const region = await open(page, 'Checkbox')
    const box = region.getByRole('checkbox', { name: '체크박스' })
    await box.focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Shift+Tab')
    await expect(box).toBeFocused()
    await expect(box).toHaveCSS('border-color', 'rgb(96, 165, 250)')
    await page.keyboard.press('Space')
    await expect(box).toHaveAttribute('aria-checked', 'true')
    await page.keyboard.press('Enter')
    await expect(box).toHaveAttribute('aria-checked', 'false')
  })

  test('rapid repeated clicks end in the parity state', async ({ page }) => {
    const region = await open(page, 'Checkbox')
    const box = region.getByRole('checkbox', { name: '체크박스' })
    for (let i = 0; i < 7; i++) await box.click({ delay: 0 })
    await expect(box).toHaveAttribute('aria-checked', 'true')
  })

  test('controlled checkbox drives external state', async ({ page }) => {
    const region = await open(page, 'Checkbox')
    await expect(region.getByText('상태: 해제')).toBeVisible()
    await region.getByRole('checkbox', { name: '약관에 동의합니다' }).click()
    await expect(region.getByText('상태: 선택')).toBeVisible()
  })

  test('hover tints the border of an unchecked box', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'no hover on touch')
    const region = await open(page, 'Checkbox')
    await region.getByText('체크박스', { exact: true }).hover()
    await expect(region.getByRole('checkbox', { name: '체크박스' })).toHaveCSS(
      'border-color',
      'rgb(147, 197, 253)',
    )
  })
})

test.describe('Switch', () => {
  test('toggles, moves the thumb and recolors the track', async ({ page }) => {
    const region = await open(page, 'Switch')
    const sw = region.getByRole('switch', { name: '스위치' })
    await expect(sw).toHaveAttribute('aria-checked', 'false')
    await expect(sw).toHaveCSS('background-color', 'rgb(229, 229, 229)')
    await sw.click()
    await expect(sw).toHaveAttribute('aria-checked', 'true')
    await expect(sw).toHaveCSS('background-color', 'rgb(37, 99, 235)')
    await expect(sw.locator('span')).toHaveCSS('translate', 'calc(100% - 2px)')
    await region.getByText('스위치', { exact: true }).click()
    await expect(sw).toHaveAttribute('aria-checked', 'false')
  })

  test('starts on with defaultChecked and works by keyboard', async ({ page }) => {
    const region = await open(page, 'Switch')
    const sw = region.getByRole('switch', { name: '활성' })
    await expect(sw).toHaveAttribute('aria-checked', 'true')
    await sw.focus()
    await page.keyboard.press('Space')
    await expect(sw).toHaveAttribute('aria-checked', 'false')
    await page.keyboard.press('Enter')
    await expect(sw).toHaveAttribute('aria-checked', 'true')
  })

  test('rapid clicks and controlled state', async ({ page }) => {
    const region = await open(page, 'Switch')
    const sw = region.getByRole('switch', { name: '상단 고정 글만 보기' })
    await expect(region.getByText('상태: 꺼짐')).toBeVisible()
    for (let i = 0; i < 5; i++) await sw.click({ delay: 0 })
    await expect(sw).toHaveAttribute('aria-checked', 'true')
    await expect(region.getByText('상태: 켜짐')).toBeVisible()
  })
})

test.describe('Radio Group', () => {
  test('first option is selected by default and click selects another', async ({ page }) => {
    const region = await open(page, 'Radio Group')
    const group = region.getByRole('radiogroup', { name: '옵션' })
    const a = group.getByRole('radio', { name: '[옵션 A]' })
    const b = group.getByRole('radio', { name: '[옵션 B]' })
    await expect(a).toHaveAttribute('aria-checked', 'true')
    await b.click()
    await expect(b).toHaveAttribute('aria-checked', 'true')
    await expect(a).toHaveAttribute('aria-checked', 'false')
    await expect(b).toHaveCSS('border-color', 'rgb(37, 99, 235)')
    await group.getByText('[옵션 C]').click()
    await expect(group.getByRole('radio', { name: '[옵션 C]' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  test('arrow keys move selection and focus with wrap-around, roving tabindex', async ({
    page,
  }) => {
    const region = await open(page, 'Radio Group')
    const group = region.getByRole('radiogroup', { name: '옵션' })
    const a = group.getByRole('radio', { name: '[옵션 A]' })
    const b = group.getByRole('radio', { name: '[옵션 B]' })
    const c = group.getByRole('radio', { name: '[옵션 C]' })
    await expect(a).toHaveAttribute('tabindex', '0')
    await expect(b).toHaveAttribute('tabindex', '-1')
    await a.focus()
    await page.keyboard.press('ArrowUp')
    await expect(c).toBeFocused()
    await expect(c).toHaveAttribute('aria-checked', 'true')
    await page.keyboard.press('ArrowDown')
    await expect(a).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(b).toBeFocused()
    await page.keyboard.press('ArrowLeft')
    await expect(a).toBeFocused()
    await expect(a).toHaveAttribute('aria-checked', 'true')
  })

  test('horizontal controlled group is labelled by its heading and shares state', async ({
    page,
  }) => {
    const region = await open(page, 'Radio Group')
    const group = region.getByRole('radiogroup', { name: '정렬' })
    await expect(group).toHaveAttribute('aria-orientation', 'horizontal')
    await expect(region.getByText('정렬 기준: 최신순')).toBeVisible()
    await group.getByRole('radio', { name: '조회순' }).click()
    await expect(region.getByText('정렬 기준: 조회순')).toBeVisible()
    await page.keyboard.press('ArrowRight')
    await expect(group.getByRole('radio', { name: '최신순' })).toBeFocused()
    await expect(region.getByText('정렬 기준: 최신순')).toBeVisible()
  })

  test('Tab leaves the group after a single stop', async ({ page }) => {
    const region = await open(page, 'Radio Group')
    const group = region.getByRole('radiogroup', { name: '옵션' })
    await group.getByRole('radio', { name: '[옵션 A]' }).focus()
    await page.keyboard.press('Tab')
    expect(await group.evaluate((g) => g.contains(document.activeElement))).toBe(false)
  })
})

test.describe('Textarea', () => {
  const group = (region: ReturnType<Page['getByRole']>, name: string) =>
    region.getByRole('group', { name })

  test('field label, description and typing', async ({ page }) => {
    const region = await open(page, 'Textarea')
    const field = group(region, 'Field')
    const ta = field.getByLabel('메시지')
    await expect(ta).toHaveAttribute('placeholder', '메시지를 입력하세요.')
    await expect(ta).toHaveAttribute('aria-describedby', /desc/)
    await expect(field.getByText('아래에 메시지를 입력하세요.')).toBeVisible()
    await ta.fill('안녕하세요 👋 こんにちは')
    await expect(ta).toHaveValue('안녕하세요 👋 こんにちは')
    await expect(ta).toHaveAttribute('aria-invalid', 'false')
  })

  test('grows with content and keeps the 64px minimum', async ({ page }) => {
    const region = await open(page, 'Textarea')
    const ta = group(region, 'Demo').getByRole('textbox')
    const before = (await ta.boundingBox())?.height ?? 0
    expect(before).toBeGreaterThanOrEqual(64)
    await ta.fill(Array.from({ length: 12 }, (_, i) => `줄 ${i}`).join('\n'))
    await expect
      .poll(async () => (await ta.boundingBox())?.height ?? 0)
      .toBeGreaterThan(before + 100)
    await ta.fill('')
    await expect.poll(async () => (await ta.boundingBox())?.height ?? 0).toBe(before)
  })

  test('disabled textarea cannot be edited', async ({ page }) => {
    const region = await open(page, 'Textarea')
    const ta = group(region, 'Disabled').getByRole('textbox')
    await expect(ta).toBeDisabled()
    await expect(ta).toHaveCSS('opacity', '0.5')
    await expect(ta).toHaveCSS('cursor', 'not-allowed')
  })

  test('invalid textarea shows destructive styling, description and alert', async ({ page }) => {
    const region = await open(page, 'Textarea')
    const field = group(region, 'Invalid')
    const ta = field.getByRole('textbox')
    await expect(ta).toHaveAttribute('aria-invalid', 'true')
    await expect(ta).toHaveCSS('border-color', 'rgb(231, 0, 11)')
    await expect(field.getByText('올바른 메시지를 입력하세요.')).toHaveCSS(
      'color',
      'rgb(231, 0, 11)',
    )
    await expect(field.getByRole('alert')).toHaveCount(0)
    await expect(ta).toHaveAttribute('aria-describedby', /desc/)
    const shadow = await ta.evaluate((el) => getComputedStyle(el).boxShadow)
    expect(shadow).toContain('0.12')
    expect(shadow).not.toContain('0px 1px 2px')
  })

  test('hostile and oversized input stays inert text', async ({ page }) => {
    const region = await open(page, 'Textarea')
    const ta = group(region, 'Demo').getByRole('textbox')
    const xss = `<img src=x onerror=alert(1)>'; DROP TABLE users;--`
    await ta.fill(xss)
    await expect(ta).toHaveValue(xss)
    const long = 'あ'.repeat(20000)
    await ta.fill(long)
    await expect(ta).toHaveValue(long)
    await ta.fill('   ')
    await expect(ta).toHaveValue('   ')
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  })

  test('controlled send button reads and clears the value', async ({ page }) => {
    const region = await open(page, 'Textarea')
    const box = group(region, 'Button')
    const ta = box.getByRole('textbox')
    await ta.fill('보낼 메시지')
    await box.getByRole('button', { name: '메시지 보내기' }).click()
    await expect(ta).toHaveValue('')
    await box.getByRole('button', { name: '메시지 보내기' }).click()
    await expect(ta).toHaveValue('')
  })
})

test.describe('Design fidelity', () => {
  const css = (loc: ReturnType<Page['locator']>, prop: string) =>
    loc.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)

  test('small button matches the SearchForm ghost toggle (h32, gap 6, px 10, 14px)', async ({
    page,
  }) => {
    const region = await open(page, 'Button')
    const sm = region.getByRole('button', { name: '작게' })
    await expect(sm).toHaveCSS('height', '32px')
    await expect(sm).toHaveCSS('padding-left', '10px')
    await expect(sm).toHaveCSS('padding-right', '10px')
    await expect(sm).toHaveCSS('column-gap', '6px')
    await expect(sm).toHaveCSS('font-size', '14px')
  })

  test('checkbox hover shows only the ring and uses the design transition', async ({
    page,
  }, testInfo) => {
    const region = await open(page, 'Checkbox')
    const box = region.getByRole('checkbox', { name: '체크박스' })
    expect(await css(box, 'transition-duration')).toBe('0.15s, 0.15s, 0.15s, 0.1s')
    expect(await css(box, 'transition-timing-function')).toBe('ease, ease, ease, ease')
    test.skip(testInfo.project.name === 'mobile', 'no hover on touch')
    await region.getByText('체크박스', { exact: true }).hover()
    await expect.poll(() => css(box, 'box-shadow')).toContain('0px 0px 0px 3px')
    expect(await css(box, 'box-shadow')).not.toContain('0px 1px 2px')
  })

  test('checkbox focus ring replaces the control shadow', async ({ page }) => {
    const region = await open(page, 'Checkbox')
    const box = region.getByRole('checkbox', { name: '체크박스' })
    await box.focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Shift+Tab')
    await expect(box).toBeFocused()
    await expect.poll(() => css(box, 'box-shadow')).toContain('0px 0px 0px 3px')
    expect(await css(box, 'box-shadow')).not.toContain('0px 1px 2px')
  })

  test('switch track and thumb use .15s ease', async ({ page }) => {
    const region = await open(page, 'Switch')
    const sw = region.getByRole('switch', { name: '스위치' })
    expect(await css(sw, 'transition-property')).toBe('all')
    expect(await css(sw, 'transition-duration')).toBe('0.15s')
    expect(await css(sw, 'transition-timing-function')).toBe('ease')
    const thumb = sw.locator('span')
    expect(await css(thumb, 'transition-duration')).toBe('0.15s')
    expect(await css(thumb, 'transition-timing-function')).toBe('ease')
  })

  test('radio item and dot use the design transitions', async ({ page }) => {
    const region = await open(page, 'Radio Group')
    const item = region.getByRole('radiogroup', { name: '옵션' }).getByRole('radio').first()
    expect(await css(item, 'transition-duration')).toBe('0.15s, 0.15s, 0.1s')
    expect(await css(item, 'transition-timing-function')).toBe('ease, ease, ease')
    const dot = item.locator('span')
    expect(await css(dot, 'transition-duration')).toBe('0.22s, 0.15s')
    expect(await css(dot, 'transition-timing-function')).toBe(
      'cubic-bezier(0.34, 1.56, 0.64, 1), ease',
    )
  })
})
