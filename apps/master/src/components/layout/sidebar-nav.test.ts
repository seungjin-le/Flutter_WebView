import { describe, expect, it } from 'vitest'
import { filterNavGroups, navGroups } from './sidebar-nav'

const count = (query: string) =>
  filterNavGroups(navGroups, query).reduce((sum, group) => sum + group.items.length, 0)

describe('filterNavGroups', () => {
  it('returns every group for an empty or whitespace-only query', () => {
    expect(filterNavGroups(navGroups, '')).toEqual(navGroups)
    expect(count('   ')).toBe(12)
  })

  it('matches by label substring and trims the query', () => {
    expect(filterNavGroups(navGroups, '  회원 ').map((group) => group.label)).toEqual(['회원'])
    expect(count('회원')).toBe(1)
  })

  it('is case-insensitive', () => {
    const groups = [{ label: 'A', items: [{ id: 'posts' as const, label: 'Posts', icon: '' }] }]
    expect(filterNavGroups(groups, 'POST')).toEqual(groups)
  })

  it('drops groups without matches and returns an empty list for no match', () => {
    expect(filterNavGroups(navGroups, 'zzz')).toEqual([])
  })

  it('treats regex characters literally', () => {
    expect(count('.*')).toBe(0)
    expect(count('(')).toBe(0)
  })
})
