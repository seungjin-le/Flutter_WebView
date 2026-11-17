import { describe, expect, it } from 'vitest'
import { buildBadges, initialPostSearch, postSearchSchema, validateKeyword } from './post-search'

describe('validateKeyword', () => {
  it.each([
    ['', ''],
    ['   ', ''],
    ['a', '검색어는 2자 이상 입력하세요.'],
    [' a ', '검색어는 2자 이상 입력하세요.'],
    ['ab', ''],
    ['가나', ''],
  ])('%j -> %j', (kw, expected) => {
    expect(validateKeyword(kw)).toBe(expected)
  })
})

describe('buildBadges', () => {
  it('returns no badges for the defaults', () => {
    expect(buildBadges(initialPostSearch)).toEqual([])
  })

  it('builds labels in design order', () => {
    const labels = buildBadges({
      ...initialPostSearch,
      kw: ' hello ',
      category: 'cat2',
      author: 'b',
      from: '2024-01-02',
      to: '2024-01-09',
      status: ['draft', 'private'],
      showOn: ['main'],
      pinned: true,
      sort: 'views',
      size: '50',
    }).map((b) => b.label)
    expect(labels).toEqual([
      '제목+내용: hello',
      '카테고리: [카테고리 2]',
      '작성자: [작성자 B]',
      '등록일: 2024.01.02 - 2024.01.09',
      '상태: 임시저장, 비공개',
      '노출: 메인 화면',
      '상단 고정 글만',
      '정렬: 조회수순',
      '목록: 50개씩',
    ])
  })

  it('formats half-open ranges', () => {
    expect(buildBadges({ ...initialPostSearch, from: '2024-01-02' })[0]?.label).toBe(
      '등록일: 2024.01.02 -',
    )
    expect(buildBadges({ ...initialPostSearch, to: '2024-01-09' })[0]?.label).toBe(
      '등록일: - 2024.01.09',
    )
  })

  it('ignores whitespace-only keyword and clears back to defaults', () => {
    expect(buildBadges({ ...initialPostSearch, kw: '  ' })).toEqual([])
    const [badge] = buildBadges({ ...initialPostSearch, from: '2024-01-02', to: '2024-01-03' })
    expect(badge?.clear).toEqual({ from: '', to: '' })
  })
})

describe('postSearchSchema', () => {
  const defaults = { ...initialPostSearch, page: 1 }

  it('parses an empty search to the defaults', () => {
    expect(postSearchSchema.parse({})).toEqual(defaults)
  })
  it('keeps valid values, including numeric-looking strings sent as numbers', () => {
    const parsed = postSearchSchema.parse({
      field: 'tag',
      kw: 2024,
      category: 'cat2',
      author: 'b',
      from: '2026-01-02',
      status: ['draft'],
      showOn: ['main'],
      sort: 'views',
      size: 50,
      pinned: true,
      page: '3',
    })
    expect(parsed).toMatchObject({
      field: 'tag',
      kw: '2024',
      category: 'cat2',
      author: 'b',
      from: '2026-01-02',
      status: ['draft'],
      showOn: ['main'],
      sort: 'views',
      size: '50',
      pinned: true,
      page: 3,
    })
  })
  it.each([
    [{ field: 'nope' }],
    [{ kw: 'a' }],
    [{ kw: { x: 1 } }],
    [{ category: 7 }],
    [{ author: 'zz' }],
    [{ from: 'yesterday' }],
    [{ to: '2026-13-99x' }],
    [{ status: ['draft', 'bogus'] }],
    [{ status: 'draft' }],
    [{ showOn: [1] }],
    [{ sort: null }],
    [{ size: 7 }],
    [{ pinned: 'yes' }],
    [{ page: 0 }],
    [{ page: -3 }],
    [{ page: 1.5 }],
    [{ page: 'abc' }],
    [{ page: null }],
  ])('falls back to the defaults for invalid %j', (input) => {
    expect(postSearchSchema.parse(input)).toEqual(defaults)
  })
  it('does not let one bad field discard the others', () => {
    expect(postSearchSchema.parse({ sort: 'bogus', category: 'cat3' })).toMatchObject({
      sort: 'latest',
      category: 'cat3',
    })
  })
})
