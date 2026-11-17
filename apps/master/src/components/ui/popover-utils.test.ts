import { describe, expect, it } from 'vitest'
import { filterOptions, nextIndex, typeaheadIndex } from './popover-utils'

const options = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'banana' },
  { value: 'k', label: '가나다' },
]

describe('filterOptions', () => {
  it('returns every option for an empty or whitespace query', () => {
    expect(filterOptions(options, '')).toEqual(options)
    expect(filterOptions(options, '   ')).toEqual(options)
  })
  it('matches case-insensitively on a substring of the label', () => {
    expect(filterOptions(options, ' ANA ').map((o) => o.value)).toEqual(['b'])
    expect(filterOptions(options, '나').map((o) => o.value)).toEqual(['k'])
  })
  it('returns an empty list when nothing matches, including regex-like input', () => {
    expect(filterOptions(options, '.*')).toEqual([])
  })
})

describe('nextIndex', () => {
  it('moves down and clamps at the end', () => {
    expect(nextIndex('ArrowDown', 0, 3)).toBe(1)
    expect(nextIndex('ArrowDown', 2, 3)).toBe(2)
  })
  it('moves up and clamps at the start', () => {
    expect(nextIndex('ArrowUp', 2, 3)).toBe(1)
    expect(nextIndex('ArrowUp', 0, 3)).toBe(0)
  })
  it('starts from the edges when nothing is focused (-1)', () => {
    expect(nextIndex('ArrowDown', -1, 3)).toBe(0)
    expect(nextIndex('ArrowUp', -1, 3)).toBe(2)
  })
  it('supports Home and End', () => {
    expect(nextIndex('Home', 2, 3)).toBe(0)
    expect(nextIndex('End', 0, 3)).toBe(2)
  })
  it('returns null for unrelated keys and for an empty list', () => {
    expect(nextIndex('a', 0, 3)).toBeNull()
    expect(nextIndex('ArrowDown', -1, 0)).toBeNull()
  })
})

describe('typeaheadIndex', () => {
  const labels = ['Alpha', 'Beta', 'avocado', 'Gamma']
  it('finds the next label starting with the key, wrapping around', () => {
    expect(typeaheadIndex(labels, 0, 'a')).toBe(2)
    expect(typeaheadIndex(labels, 2, 'a')).toBe(0)
  })
  it('can land on the current item when it is the only match', () => {
    expect(typeaheadIndex(labels, 3, 'g')).toBe(3)
  })
  it('returns -1 for no match, whitespace, multi-char keys and empty lists', () => {
    expect(typeaheadIndex(labels, 0, 'z')).toBe(-1)
    expect(typeaheadIndex(labels, 0, ' ')).toBe(-1)
    expect(typeaheadIndex(labels, 0, 'Enter')).toBe(-1)
    expect(typeaheadIndex([], -1, 'a')).toBe(-1)
  })
})
