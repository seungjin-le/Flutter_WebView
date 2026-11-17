import { describe, expect, it } from 'vitest'
import { fileExt, formatSize, validateFile } from './upload-utils'

const MB = 1024 * 1024

describe('formatSize', () => {
  it('formats bytes, kilobytes and megabytes at the boundaries', () => {
    expect(formatSize(0)).toBe('0 B')
    expect(formatSize(1023)).toBe('1023 B')
    expect(formatSize(1024)).toBe('1 KB')
    expect(formatSize(1536)).toBe('2 KB')
    expect(formatSize(MB)).toBe('1.0 MB')
    expect(formatSize(5.25 * MB)).toBe('5.3 MB')
  })
})

describe('fileExt', () => {
  it('uses the upper-cased extension', () => {
    expect(fileExt({ name: 'a.png', type: 'image/png' })).toBe('PNG')
  })
  it('falls back to the mime subtype, then FILE', () => {
    expect(fileExt({ name: 'noext', type: 'application/pdf' })).toBe('PDF')
    expect(fileExt({ name: 'a.', type: 'image/webp' })).toBe('WEBP')
    expect(fileExt({ name: 'a.verylongext', type: 'text/plain' })).toBe('PLAIN')
    expect(fileExt({ name: 'x', type: '' })).toBe('FILE')
  })
})

describe('validateFile', () => {
  const img = { kind: 'image' as const, maxSizeMB: 5 }
  it('accepts only images for the image kind', () => {
    expect(validateFile(img, { name: 'a.png', type: 'image/png', size: 1 })).toBeNull()
    expect(validateFile(img, { name: 'a.txt', type: 'text/plain', size: 1 })).toBe(
      '이미지 파일만 올릴 수 있습니다.',
    )
  })
  it('rejects svg and other non-listed image formats by mime or extension', () => {
    const msg = '이미지 파일만 올릴 수 있습니다.'
    expect(validateFile(img, { name: 'a.svg', type: 'image/svg+xml', size: 1 })).toBe(msg)
    expect(validateFile(img, { name: 'a.png', type: 'image/svg+xml', size: 1 })).toBe(msg)
    expect(validateFile(img, { name: 'a.svg', type: 'image/png', size: 1 })).toBe(msg)
    expect(validateFile(img, { name: 'a.bmp', type: 'image/bmp', size: 1 })).toBe(msg)
    expect(validateFile(img, { name: 'noext', type: 'image/png', size: 1 })).toBe(msg)
  })
  it('accepts every listed image format case-insensitively', () => {
    for (const [name, type] of [
      ['a.PNG', 'image/png'],
      ['a.jpg', 'image/jpeg'],
      ['a.jpeg', 'image/jpeg'],
      ['a.gif', 'image/gif'],
      ['a.webp', 'image/webp'],
    ])
      expect(validateFile(img, { name, type, size: 1 })).toBeNull()
  })
  it('allows exactly max size and rejects one byte more', () => {
    expect(validateFile(img, { name: 'a.png', type: 'image/png', size: 5 * MB })).toBeNull()
    expect(validateFile(img, { name: 'a.png', type: 'image/png', size: 5 * MB + 1 })).toBe(
      '5MB를 넘는 파일입니다.',
    )
  })
  it('matches file accept by extension, wildcard and mime, case-insensitively', () => {
    const file = { kind: 'file' as const, maxSizeMB: 10, accept: '.pdf, image/*,text/csv' }
    expect(validateFile(file, { name: 'A.PDF', type: '', size: 1 })).toBeNull()
    expect(validateFile(file, { name: 'x.gif', type: 'image/gif', size: 1 })).toBeNull()
    expect(validateFile(file, { name: 'x.dat', type: 'text/csv', size: 1 })).toBeNull()
    expect(validateFile(file, { name: 'x.exe', type: 'application/x-msdownload', size: 1 })).toBe(
      '허용하지 않는 파일 형식입니다.',
    )
  })
  it('accepts anything when accept is empty', () => {
    expect(
      validateFile({ kind: 'file', maxSizeMB: 10 }, { name: 'x', type: '', size: 0 }),
    ).toBeNull()
  })
})
