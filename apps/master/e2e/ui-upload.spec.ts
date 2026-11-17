import { test, expect, type Locator, type Page } from '@playwright/test'

type Payload = { name: string; type: string; content: string }
const png = (name: string): Payload => ({ name, type: 'image/png', content: 'x' })

const dropFiles = (target: Locator, files: Payload[]) =>
  target.evaluate((el, list) => {
    const dt = new DataTransfer()
    list.forEach((f) => dt.items.add(new File([f.content], f.name, { type: f.type })))
    const fire = (type: string) =>
      el.dispatchEvent(new DragEvent(type, { dataTransfer: dt, bubbles: true, cancelable: true }))
    fire('dragenter')
    fire('drop')
  }, files)

const pick = (group: Locator, files: { name: string; mimeType: string; buffer: Buffer }[]) =>
  group.locator('input[type=file]').setInputFiles(files)

const buf = (name: string, mimeType: string, size = 10) => ({
  name,
  mimeType,
  buffer: Buffer.alloc(size, 1),
})

const open = async (page: Page) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __created: string[]; __revoked: string[] }
    w.__created = []
    w.__revoked = []
    const create = URL.createObjectURL.bind(URL)
    const revoke = URL.revokeObjectURL.bind(URL)
    URL.createObjectURL = (o) => {
      const u = create(o)
      w.__created.push(u)
      return u
    }
    URL.revokeObjectURL = (u) => {
      w.__revoked.push(u)
      revoke(u)
    }
  })
  await page.goto('/components')
  const region = page.getByRole('region', { name: 'Upload' })
  await expect(region).toBeVisible()
  return {
    multiImage: region.getByRole('group', { name: '이미지 · 여러 장' }),
    oneImage: region.getByRole('group', { name: '이미지 · 1장' }),
    multiFile: region.getByRole('group', { name: '파일 · 여러 개' }),
    oneFile: region.getByRole('group', { name: '파일 · 1개' }),
    region,
  }
}

const revokedCount = (page: Page) =>
  page.evaluate(() => (window as unknown as { __revoked: string[] }).__revoked.length)

test('renders four slots with labels and hints, no horizontal scroll', async ({ page }) => {
  const { multiImage, oneImage, multiFile, oneFile } = await open(page)
  await expect(multiImage.getByText('PNG, JPG, GIF, WEBP · 장당 최대 5MB · 최대 5장')).toBeVisible()
  await expect(oneImage.getByText('대표 이미지', { exact: true })).toBeVisible()
  await expect(multiFile.getByText('모든 형식 · 파일당 최대 10MB · 최대 5개')).toBeVisible()
  await expect(oneFile.getByText('PDF, DOCX, XLSX, HWP · 최대 10MB · 1개')).toBeVisible()
  await expect(oneFile.locator('input[type=file]')).toHaveAttribute(
    'accept',
    '.pdf,.docx,.xlsx,.hwp',
  )
  await expect(multiImage.locator('input[type=file]')).toHaveAttribute(
    'accept',
    '.png,.jpg,.jpeg,.gif,.webp,image/png,image/jpeg,image/gif,image/webp',
  )
  await expect(multiImage.locator('input[type=file]')).toHaveAttribute('multiple', '')
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
})

test('picking images shows cards that upload then complete', async ({ page }) => {
  const { multiImage } = await open(page)
  await pick(multiImage, [buf('a.png', 'image/png', 2048)])
  const card = multiImage.getByRole('group', { name: '첨부한 이미지' })
  await expect(card.getByText('a.png', { exact: true })).toBeVisible()
  await expect(card.locator('[aria-busy="true"]')).toHaveCount(1)
  await expect(card.getByText('업로드 중', { exact: false })).toBeVisible()
  await expect(card.locator('[aria-busy="false"]')).toHaveCount(1, { timeout: 8000 })
  await expect(card.getByText('PNG · 2 KB')).toBeVisible()
  await expect(multiImage.getByText('1 / 5장')).toBeVisible()
  await expect(multiImage.getByText('완료된 파일 1개')).toBeVisible()
})

test('drag and drop highlights the zone and adds files', async ({ page }) => {
  const { multiImage } = await open(page)
  const zone = multiImage.getByRole('button', { name: /끌어다 놓으세요|여기에 놓으세요/ })
  await zone.evaluate((el) => {
    el.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true }))
  })
  await expect(multiImage.getByRole('button', { name: /여기에 놓으세요/ })).toBeVisible()
  await dropFiles(zone, [png('d1.png'), png('d2.png')])
  await expect(multiImage.getByText('d1.png', { exact: true })).toBeVisible()
  await expect(multiImage.getByText('d2.png', { exact: true })).toBeVisible()
  await expect(multiImage.getByText('2 / 5장')).toBeVisible()
  await expect(multiImage.getByRole('button', { name: /여기에 놓으세요/ })).toHaveCount(0)
})

test('wrong type and oversize files become error cards and do not count', async ({ page }) => {
  const { multiImage } = await open(page)
  await pick(multiImage, [
    buf('note.txt', 'text/plain'),
    buf('big.png', 'image/png', 5 * 1024 * 1024 + 1),
    buf('edge.png', 'image/png', 5 * 1024 * 1024),
  ])
  await expect(multiImage.getByText('이미지 파일만 올릴 수 있습니다.')).toBeVisible()
  await expect(multiImage.getByText('5MB를 넘는 파일입니다.')).toBeVisible()
  await expect(multiImage.getByText('1 / 5장')).toBeVisible()
})

test('exceeding maxFiles skips extras, disables the zone, and removing re-enables it', async ({
  page,
}) => {
  const { multiImage } = await open(page)
  await pick(
    multiImage,
    Array.from({ length: 7 }, (_, i) => buf(`p${i}.png`, 'image/png')),
  )
  await expect(multiImage.getByRole('alert')).toHaveText(
    '최대 5장까지 올릴 수 있어 2개는 제외했습니다.',
  )
  const full = multiImage.getByRole('button', { name: /최대 개수에 도달했습니다/ })
  await expect(full).toBeDisabled()
  await multiImage.getByRole('button', { name: 'p0.png 제거' }).click()
  await expect(multiImage.getByRole('alert')).toHaveCount(0)
  await expect(multiImage.getByRole('button', { name: /끌어다 놓으세요/ })).toBeEnabled()
  await expect(multiImage.getByText('4 / 5장')).toBeVisible()
})

test('remove revokes the preview object URL and sequential removes release each URL', async ({
  page,
}) => {
  const { multiImage } = await open(page)
  await pick(multiImage, [buf('r1.png', 'image/png'), buf('r2.png', 'image/png')])
  await expect(multiImage.getByText('2 / 5장')).toBeVisible()
  const before = await revokedCount(page)
  await multiImage.getByRole('button', { name: 'r1.png 제거' }).click()
  await multiImage.getByRole('button', { name: 'r2.png 제거' }).click()
  expect(await revokedCount(page)).toBe(before + 2)
  await expect(multiImage.getByRole('group', { name: '첨부한 이미지' })).toHaveCount(0)
})

test('unmount revokes every remaining object URL', async ({ page }) => {
  const { multiImage } = await open(page)
  await pick(multiImage, [buf('u1.png', 'image/png'), buf('u2.png', 'image/png')])
  await expect(multiImage.getByText('2 / 5장')).toBeVisible()
  await page.evaluate(() => {
    window.history.pushState({}, '', '/')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await expect(page.getByRole('region', { name: 'Upload' })).toHaveCount(0)
  const { created, revoked } = await page.evaluate(() => {
    const w = window as unknown as { __created: string[]; __revoked: string[] }
    return { created: w.__created, revoked: w.__revoked }
  })
  expect(created.length).toBeGreaterThanOrEqual(2)
  created.forEach((u) => expect(revoked).toContain(u))
})

test('single image keeps only the first file, can be changed and removed', async ({ page }) => {
  const { oneImage } = await open(page)
  await dropFiles(oneImage.getByRole('button', { name: /이미지 선택/ }), [
    png('first.png'),
    png('second.png'),
  ])
  await expect(oneImage.getByRole('alert')).toHaveText(
    '1장만 올릴 수 있어 첫 번째 파일만 사용했습니다.',
  )
  await expect(oneImage.getByRole('img', { name: 'first.png' })).toBeVisible()
  await expect(oneImage.getByText('second.png')).toHaveCount(0)
  const before = await revokedCount(page)
  await pick(oneImage, [buf('third.png', 'image/png')])
  await expect(oneImage.getByRole('img', { name: 'third.png' })).toBeVisible()
  expect(await revokedCount(page)).toBe(before + 1)
  await oneImage.getByRole('button', { name: 'third.png 제거' }).click()
  await expect(oneImage.getByRole('button', { name: /이미지 선택/ })).toBeVisible()
  await expect(oneImage.locator('input[type=file]')).not.toHaveAttribute('multiple', '')
})

test('single image wrong type shows an error box', async ({ page }) => {
  const { oneImage } = await open(page)
  await pick(oneImage, [buf('doc.pdf', 'application/pdf')])
  await expect(oneImage.getByText('이미지 파일만 올릴 수 있습니다.')).toBeVisible()
  await expect(oneImage.getByRole('img')).toHaveCount(0)
})

test('single file rows: invalid type errors, valid file replaces, change chip appears', async ({
  page,
}) => {
  const { oneFile } = await open(page)
  await pick(oneFile, [buf('bad.txt', 'text/plain')])
  await expect(oneFile.getByText('허용하지 않는 파일 형식입니다.')).toBeVisible()
  await pick(oneFile, [buf('good.pdf', 'application/pdf', 3000)])
  const list = oneFile.getByRole('list', { name: '첨부한 파일' })
  await expect(list.getByRole('listitem')).toHaveCount(1)
  await expect(list.getByText('good.pdf', { exact: true })).toBeVisible()
  await expect(list.getByRole('button', { name: '변경' })).toBeVisible()
  await expect(list.locator('[aria-busy="false"]')).toHaveCount(1, { timeout: 8000 })
  await expect(list.getByText('PDF · 3 KB')).toBeVisible()
  await list.getByRole('button', { name: 'good.pdf 제거' }).click()
  await expect(oneFile.getByRole('button', { name: /파일 선택 또는 끌어다 놓기/ })).toBeVisible()
})

test('multiple file list accepts any type and handles hostile and long names', async ({ page }) => {
  const { multiFile } = await open(page)
  const hostile = '<img src=x onerror=alert(1)>.zip'
  const long = `${'가'.repeat(120)}.xlsx`
  await pick(multiFile, [
    buf(hostile, 'application/zip'),
    buf('😀 이모지.txt', 'text/plain'),
    buf(long, ''),
  ])
  const list = multiFile.getByRole('list', { name: '첨부한 파일' })
  await expect(list.getByRole('listitem')).toHaveCount(3)
  await expect(list.getByText(hostile, { exact: true })).toBeVisible()
  await expect(list.locator('img')).toHaveCount(0)
  await expect(list.getByText(long, { exact: true })).toHaveAttribute('title', long)
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
})

test('empty selection and cancelled chooser change nothing', async ({ page }) => {
  const { multiFile } = await open(page)
  await pick(multiFile, [])
  await expect(multiFile.getByRole('list')).toHaveCount(0)
  await expect(multiFile.getByText('0 / 5개')).toBeVisible()
})

test('drop zone opens the file chooser with Enter and Space', async ({ page }) => {
  const { multiFile } = await open(page)
  const zone = multiFile.getByRole('button', { name: /끌어다 놓으세요/ })
  await zone.focus()
  const first = page.waitForEvent('filechooser')
  await page.keyboard.press('Enter')
  expect(await first).toBeTruthy()
  const second = page.waitForEvent('filechooser')
  await page.keyboard.press('Space')
  expect(await second).toBeTruthy()
  await expect(zone).toHaveCSS('border-color', 'rgb(96, 165, 250)')
})

test('file input is hidden from keyboard and assistive tech; status is announced', async ({
  page,
}) => {
  const { multiFile } = await open(page)
  const input = multiFile.locator('input[type=file]')
  await expect(input).toHaveAttribute('tabindex', '-1')
  await expect(input).toHaveAttribute('aria-hidden', 'true')
  await pick(multiFile, [buf('live.pdf', 'application/pdf')])
  await expect(multiFile.locator('[aria-live="polite"]')).toContainText('1개 파일을 추가했습니다.')
})

test('svg images are rejected as error cards', async ({ page }) => {
  const { multiImage } = await open(page)
  await pick(multiImage, [buf('logo.svg', 'image/svg+xml')])
  await expect(multiImage.getByText('이미지 파일만 올릴 수 있습니다.')).toBeVisible()
  await expect(multiImage.getByText('0 / 5장')).toBeVisible()
})

test('uploading name uses the gradient shimmer and completion announces the file name', async ({
  page,
}) => {
  const { multiFile } = await open(page)
  await pick(multiFile, [buf('shim.pdf', 'application/pdf')])
  const name = multiFile.getByText('shim.pdf', { exact: true })
  await expect(name).toHaveCSS('animation-name', 'upload-shimmer')
  await expect(name).toHaveCSS('animation-duration', '1.6s')
  await expect(name).toHaveCSS('animation-timing-function', 'linear')
  await expect(name).toHaveCSS('color', 'rgba(0, 0, 0, 0)')
  await expect(name).toHaveCSS('background-size', /^200% 100%$|^\d+(\.\d+)?px /)
  await expect(multiFile.locator('[aria-live="polite"]')).toContainText(
    'shim.pdf 업로드를 마쳤습니다.',
    { timeout: 8000 },
  )
  await expect(name).toHaveCSS('animation-name', 'none')
})
