import { describe, expect, it } from 'vitest'
import type { Post, PostSearchQuery } from './post-types'
import { createSamplePosts } from './posts-data'
import { filterPosts, pageNumbers, paginate, sortFromQuery, sortPosts } from './posts-table'

const rows: Post[] = createSamplePosts(new Date(2026, 5, 30))
const q = (patch: Partial<PostSearchQuery>) => patch
const ids = (list: Post[]) => list.map((r) => r.id)

describe('createSamplePosts', () => {
  it('makes 24 rows two days apart with every 7th pinned', () => {
    expect(rows).toHaveLength(24)
    expect(rows[0]).toMatchObject({ id: 'POST-1024', date: '2026-06-30', pinned: true })
    expect(rows[1].date).toBe('2026-06-28')
    expect(rows.filter((r) => r.pinned)).toHaveLength(4)
  })
  it('never updates a post before it was created and gives every post a distinct view count', () => {
    expect(rows.every((r) => r.updated >= r.date)).toBe(true)
    expect(new Set(rows.map((r) => r.views)).size).toBe(24)
  })
})

describe('filterPosts', () => {
  it('returns everything for a null query', () => {
    expect(filterPosts(rows, null)).toHaveLength(24)
  })
  it('matches keyword case-insensitively and trims', () => {
    expect(ids(filterPosts(rows, q({ kw: '  제목 05 ', field: 'title' })))).toEqual(['POST-1020'])
  })
  it('treats category "all" as no filter', () => {
    expect(filterPosts(rows, q({ category: 'all' }))).toHaveLength(24)
    expect(filterPosts(rows, q({ category: 'cat1' }))).toHaveLength(8)
  })
  it('filters by author, status list, pinned', () => {
    expect(filterPosts(rows, q({ author: 'a' }))).toHaveLength(5)
    const hidden = filterPosts(rows, q({ status: ['draft', 'archived'] }))
    expect(hidden).toHaveLength(7)
    expect(hidden.every((r) => r.status === 'draft' || r.status === 'archived')).toBe(true)
    expect(filterPosts(rows, q({ status: [] }))).toHaveLength(24)
    const pinned = filterPosts(rows, q({ pinned: true }))
    expect(pinned).toHaveLength(4)
    expect(pinned.every((r) => r.pinned)).toBe(true)
  })
  it('date range is inclusive on both ends', () => {
    const out = filterPosts(rows, q({ from: '2026-06-28', to: '2026-06-30' }))
    expect(out.map((r) => r.date).sort()).toEqual(['2026-06-28', '2026-06-30'])
  })
  it('handles special characters as plain text', () => {
    expect(filterPosts(rows, q({ kw: '<script>' }))).toEqual([])
    expect(filterPosts(rows, q({ kw: '%' }))).toEqual([])
  })

  describe('search field', () => {
    it.each([
      ['title_body', '본문', 24],
      ['title_body', '제목 05', 1],
      ['title_body', '공지', 6],
      ['title', '본문', 0],
      ['title', '제목', 24],
      ['title', '공지', 0],
      ['body', '본문', 24],
      ['body', '공지', 6],
      ['body', '제목', 0],
      ['tag', '가이드', 8],
      ['tag', '중요', 6],
      ['tag', '제목', 0],
    ])('field %s with %j finds %i posts', (field, kw, count) => {
      expect(filterPosts(rows, q({ field, kw }))).toHaveLength(count)
    })
    it('falls back to title+body for an unknown field', () => {
      expect(filterPosts(rows, q({ field: 'constructor', kw: '공지' }))).toHaveLength(6)
    })
    it('tag search matches only posts that carry the tag', () => {
      const out = filterPosts(rows, q({ field: 'tag', kw: '가이드' }))
      expect(out.every((r) => r.tags.includes('가이드'))).toBe(true)
    })
  })

  describe('show position', () => {
    it.each([
      [['main'], 12],
      [['notice'], 6],
      [['list', 'notice'], 12],
      [['main', 'list', 'notice'], 18],
      [[], 24],
    ])('showOn %j finds %i posts', (showOn, count) => {
      expect(filterPosts(rows, q({ showOn }))).toHaveLength(count)
    })
    it('combines with other filters', () => {
      const out = filterPosts(rows, q({ showOn: ['main'], pinned: true }))
      expect(ids(out)).toEqual(['POST-1024', 'POST-1010'])
    })
  })
})

describe('sortPosts', () => {
  const unpinned = (list: Post[]) => list.filter((r) => !r.pinned)

  it('keeps pinned first, then date desc', () => {
    const out = sortPosts(rows, sortFromQuery('latest'))
    expect(ids(out.slice(0, 4))).toEqual(['POST-1024', 'POST-1017', 'POST-1010', 'POST-1003'])
    expect(out[4].id).toBe('POST-1023')
    const dates = unpinned(out).map((r) => r.date)
    expect(dates).toEqual([...dates].sort().reverse())
  })
  it('sorts by title ascending and does not mutate input', () => {
    const copy = [...rows].reverse()
    const out = sortPosts(copy, sortFromQuery('title'))
    expect(out[4].title).toBe('[게시글 제목 02]')
    expect(copy[0].id).toBe('POST-1001')
  })
  it('sorts by views descending behind the pinned posts', () => {
    const out = sortPosts(rows, sortFromQuery('views'))
    expect(out.slice(0, 4).every((r) => r.pinned)).toBe(true)
    expect(out[4].title).toBe('[게시글 제목 18]')
    const views = unpinned(out).map((r) => r.views)
    expect(views).toEqual([...views].sort((a, b) => b - a))
  })
  it('sorts by last update descending and differs from the registration order', () => {
    const out = sortPosts(rows, sortFromQuery('updated'))
    const updated = unpinned(out).map((r) => r.updated)
    expect(updated).toEqual([...updated].sort().reverse())
    expect(ids(out)).not.toEqual(ids(sortPosts(rows, sortFromQuery('latest'))))
  })
})

describe('sortFromQuery', () => {
  it.each([
    ['latest', { id: 'date', desc: true }],
    ['updated', { id: 'updated', desc: true }],
    ['views', { id: 'views', desc: true }],
    ['title', { id: 'title', desc: false }],
    ['unknown', { id: 'date', desc: true }],
    ['constructor', { id: 'date', desc: true }],
    [undefined, { id: 'date', desc: true }],
  ])('%s -> %j', (sort, expected) => {
    expect(sortFromQuery(sort)).toEqual(expected)
  })
})

describe('paginate', () => {
  it('clamps page into range and never returns zero pages', () => {
    expect(paginate(0, 10, 3)).toEqual({ pages: 1, page: 0 })
    expect(paginate(24, 10, 99)).toEqual({ pages: 3, page: 2 })
    expect(paginate(20, 10, 1)).toEqual({ pages: 2, page: 1 })
    expect(paginate(24, 10, -5)).toEqual({ pages: 3, page: 0 })
  })
})

describe('pageNumbers', () => {
  it('shows a 5-wide window clamped to the ends', () => {
    expect(pageNumbers(0, 3)).toEqual([0, 1, 2])
    expect(pageNumbers(0, 10)).toEqual([0, 1, 2, 3, 4])
    expect(pageNumbers(5, 10)).toEqual([3, 4, 5, 6, 7])
    expect(pageNumbers(9, 10)).toEqual([5, 6, 7, 8, 9])
  })
})
