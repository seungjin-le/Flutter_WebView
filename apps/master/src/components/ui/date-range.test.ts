import { describe, expect, it } from 'vitest'
import {
  buildMonthGrid,
  focusTarget,
  formatRangeLabel,
  isDisabled,
  moveFocus,
  openView,
  pickDay,
  shiftMonth,
} from './date-range'

describe('buildMonthGrid', () => {
  it('pads a leap February with outside days to full weeks', () => {
    const cells = buildMonthGrid(2028, 1)
    expect(cells).toHaveLength(35)
    expect(cells[0]).toEqual({ iso: '2028-01-30', day: 30, outside: true })
    expect(cells.find((c) => c.iso === '2028-02-29')?.outside).toBe(false)
    expect(cells.at(-1)?.iso).toBe('2028-03-04')
  })

  it('has exactly 28 cells for a Sunday-start non-leap February', () => {
    const cells = buildMonthGrid(2026, 1)
    expect(cells).toHaveLength(28)
    expect(cells.every((c) => !c.outside)).toBe(true)
  })

  it('does not contain 02-29 in a non-leap year', () => {
    expect(buildMonthGrid(2027, 1).some((c) => c.iso === '2027-02-29')).toBe(false)
  })

  it('crosses the year boundary', () => {
    const cells = buildMonthGrid(2028, 11)
    expect(cells.at(-1)?.iso).toBe('2029-01-06')
  })
})

describe('isDisabled', () => {
  it('start calendar blocks days after the end date, end date itself is allowed', () => {
    expect(isDisabled(0, '2028-02-11', '', '2028-02-10')).toBe(true)
    expect(isDisabled(0, '2028-02-10', '', '2028-02-10')).toBe(false)
  })

  it('end calendar blocks days before the start date', () => {
    expect(isDisabled(1, '2028-02-09', '2028-02-10', '')).toBe(true)
    expect(isDisabled(1, '2028-02-10', '2028-02-10', '')).toBe(false)
  })

  it('blocks nothing without a counterpart', () => {
    expect(isDisabled(0, '2099-01-01', '', '')).toBe(false)
    expect(isDisabled(1, '1900-01-01', '', '')).toBe(false)
  })
})

describe('pickDay', () => {
  it('sets start and end independently', () => {
    expect(pickDay(0, '2028-02-01', '', '2028-02-10')).toEqual({
      from: '2028-02-01',
      to: '2028-02-10',
    })
    expect(pickDay(1, '2028-02-10', '2028-02-01', '')).toEqual({
      from: '2028-02-01',
      to: '2028-02-10',
    })
  })

  it('clears the value when the selected day is picked again', () => {
    expect(pickDay(0, '2028-02-01', '2028-02-01', '2028-02-10')).toEqual({
      from: '',
      to: '2028-02-10',
    })
    expect(pickDay(1, '2028-02-10', '2028-02-01', '2028-02-10')).toEqual({
      from: '2028-02-01',
      to: '',
    })
  })

  it('allows a same-day range', () => {
    expect(pickDay(1, '2028-02-01', '2028-02-01', '')).toEqual({
      from: '2028-02-01',
      to: '2028-02-01',
    })
  })
})

describe('moveFocus', () => {
  it('moves across month and leap-day boundaries', () => {
    expect(moveFocus(0, '2028-02-29', 'ArrowRight', false, '', '')).toBe('2028-03-01')
    expect(moveFocus(0, '2028-03-01', 'ArrowLeft', false, '', '')).toBe('2028-02-29')
    expect(moveFocus(0, '2028-02-26', 'ArrowDown', false, '', '')).toBe('2028-03-04')
    expect(moveFocus(0, '2028-03-04', 'ArrowUp', false, '', '')).toBe('2028-02-26')
  })

  it('Home and End go to the week edges (Sunday-Saturday)', () => {
    expect(moveFocus(0, '2028-02-10', 'Home', false, '', '')).toBe('2028-02-06')
    expect(moveFocus(0, '2028-02-10', 'End', false, '', '')).toBe('2028-02-12')
  })

  it('PageUp/PageDown clamp the day to the target month length', () => {
    expect(moveFocus(0, '2028-01-31', 'PageDown', false, '', '')).toBe('2028-02-29')
    expect(moveFocus(0, '2028-03-31', 'PageUp', false, '', '')).toBe('2028-02-29')
    expect(moveFocus(0, '2028-02-29', 'PageDown', true, '', '')).toBe('2029-02-28')
    expect(moveFocus(0, '2028-02-29', 'PageUp', true, '', '')).toBe('2027-02-28')
  })

  it('skips nothing it can reach and refuses disabled targets', () => {
    expect(moveFocus(0, '2028-02-10', 'ArrowRight', false, '', '2028-02-10')).toBeNull()
    expect(moveFocus(1, '2028-02-12', 'ArrowLeft', false, '2028-02-10', '')).toBe('2028-02-11')
    expect(moveFocus(1, '2028-02-10', 'ArrowLeft', false, '2028-02-10', '')).toBeNull()
    expect(moveFocus(0, '2028-02-10', 'PageDown', false, '', '2028-02-20')).toBeNull()
  })
})

describe('shiftMonth / openView / formatRangeLabel / focusTarget', () => {
  it('shiftMonth rolls over years in both directions', () => {
    expect(shiftMonth({ year: 2028, month: 11 }, 1)).toEqual({ year: 2029, month: 0 })
    expect(shiftMonth({ year: 2028, month: 0 }, -1)).toEqual({ year: 2027, month: 11 })
  })

  it('openView defaults to today and the following month', () => {
    expect(openView('', '', new Date(2028, 11, 15))).toEqual([
      { year: 2028, month: 11 },
      { year: 2029, month: 0 },
    ])
  })

  it('openView shows the stored start and end months', () => {
    expect(openView('2028-02-28', '2028-03-02', new Date(2030, 0, 1))).toEqual([
      { year: 2028, month: 1 },
      { year: 2028, month: 2 },
    ])
    expect(openView('2028-02-28', '', new Date(2030, 0, 1))[1]).toEqual({ year: 2028, month: 2 })
  })

  it('formats the label with dots and open ends', () => {
    expect(formatRangeLabel('2028-02-01', '2028-02-29')).toBe('2028.02.01 - 2028.02.29')
    expect(formatRangeLabel('2028-02-01', '')).toBe('2028.02.01 -')
    expect(formatRangeLabel('', '2028-02-29')).toBe('- 2028.02.29')
    expect(formatRangeLabel('', '')).toBe('')
  })

  it('focusTarget prefers focus, then own value, then today, then first enabled day', () => {
    const month = { year: 2028, month: 1 }
    expect(focusTarget(0, month, '2028-02-05', '2028-02-03', '2028-02-02', '2028-02-03', '')).toBe(
      '2028-02-05',
    )
    expect(focusTarget(0, month, '', '2028-02-03', '2028-02-02', '2028-02-03', '')).toBe(
      '2028-02-03',
    )
    expect(focusTarget(0, month, '', '', '2028-02-02', '', '')).toBe('2028-02-02')
    expect(focusTarget(0, month, '', '', '2030-01-01', '', '')).toBe('2028-02-01')
    expect(focusTarget(1, month, '', '', '2030-01-01', '2028-03-01', '')).toBeUndefined()
  })
})
