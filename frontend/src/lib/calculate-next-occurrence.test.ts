import { calculateNextOccurrence } from './calculate-next-occurrence'

// Helper: midnight of a given date
function midnight(year: number, month: number, day: number): number {
  return new Date(year, month, day, 0, 0, 0, 0).getTime()
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// ── daily ───────────────────────────────────────────────────────────

describe('daily', () => {
  it('returns tomorrow at midnight', () => {
    // Wednesday June 18, 2025, noon
    vi.setSystemTime(new Date(2025, 5, 18, 12, 0, 0))
    expect(calculateNextOccurrence('daily')).toBe(midnight(2025, 5, 19))
  })
})

// ── weekdays ────────────────────────────────────────────────────────

describe('weekdays', () => {
  it('Tuesday → Wednesday (next day is a weekday)', () => {
    // Tuesday June 17, 2025
    vi.setSystemTime(new Date(2025, 5, 17, 12, 0, 0))
    // tomorrow = Wednesday June 18 → weekday
    expect(calculateNextOccurrence('weekdays')).toBe(midnight(2025, 5, 18))
  })

  it('Friday → Monday (skips weekend)', () => {
    // Friday June 20, 2025
    vi.setSystemTime(new Date(2025, 5, 20, 12, 0, 0))
    // tomorrow = Saturday → skip to Monday June 23
    expect(calculateNextOccurrence('weekdays')).toBe(midnight(2025, 5, 23))
  })

  it('Saturday → Monday (skips Sunday)', () => {
    // Saturday June 21, 2025
    vi.setSystemTime(new Date(2025, 5, 21, 12, 0, 0))
    // tomorrow = Sunday → skip to Monday June 23
    expect(calculateNextOccurrence('weekdays')).toBe(midnight(2025, 5, 23))
  })
})

// ── weekly ──────────────────────────────────────────────────────────

describe('weekly', () => {
  it('falls back to +7 days when no daysOfWeek provided', () => {
    // Wednesday June 18, 2025
    vi.setSystemTime(new Date(2025, 5, 18, 12, 0, 0))
    // tomorrow = Thursday June 19; +7 = Thursday June 26
    expect(calculateNextOccurrence('weekly')).toBe(midnight(2025, 5, 26))
  })

  it('picks the nearest future day from daysOfWeek', () => {
    // Monday June 16, 2025 → tomorrow = Tuesday (day 2)
    vi.setSystemTime(new Date(2025, 5, 16, 12, 0, 0))
    // daysOfWeek [3, 5] = Wed, Fri; nearest >= Tue(2) is Wed(3)
    // Wed is 1 day after Tue → June 18
    expect(calculateNextOccurrence('weekly', [3, 5])).toBe(midnight(2025, 5, 18))
  })

  it('wraps to next week when all daysOfWeek have passed', () => {
    // Thursday June 19, 2025 → tomorrow = Friday (day 5)
    vi.setSystemTime(new Date(2025, 5, 19, 12, 0, 0))
    // daysOfWeek [1, 3] = Mon, Wed; both < Friday(5)
    // Wraps: nextDay = Mon(1); days to add = 7 - 5 + 1 = 3 → Monday June 23
    expect(calculateNextOccurrence('weekly', [1, 3])).toBe(midnight(2025, 5, 23))
  })
})

// ── monthly ─────────────────────────────────────────────────────────

describe('monthly', () => {
  it('returns this month if the day has not passed yet', () => {
    // June 10, 2025 - dayOfMonth = 20
    vi.setSystemTime(new Date(2025, 5, 10, 12, 0, 0))
    expect(calculateNextOccurrence('monthly', undefined, 20)).toBe(
      midnight(2025, 5, 20)
    )
  })

  it('returns next month if the day already passed', () => {
    // June 25, 2025 - dayOfMonth = 10
    vi.setSystemTime(new Date(2025, 5, 25, 12, 0, 0))
    expect(calculateNextOccurrence('monthly', undefined, 10)).toBe(
      midnight(2025, 6, 10)
    )
  })

  it('defaults to current day when dayOfMonth is not provided', () => {
    // June 15, 2025 noon - default day = 15, but date (June 15 midnight) <= now
    vi.setSystemTime(new Date(2025, 5, 15, 12, 0, 0))
    // next = June 15 midnight which is <= now → bumps to July 15
    expect(calculateNextOccurrence('monthly')).toBe(midnight(2025, 6, 15))
  })
})

// ── yearly ──────────────────────────────────────────────────────────

describe('yearly', () => {
  it('returns this year if the date has not passed yet', () => {
    // March 1, 2025 - month 6 (June), dayOfYear 15
    vi.setSystemTime(new Date(2025, 2, 1, 12, 0, 0))
    expect(calculateNextOccurrence('yearly', undefined, undefined, 6, 15)).toBe(
      midnight(2025, 5, 15)
    )
  })

  it('returns next year if the date already passed', () => {
    // Sept 1, 2025 - month 6 (June), dayOfYear 15
    vi.setSystemTime(new Date(2025, 8, 1, 12, 0, 0))
    expect(calculateNextOccurrence('yearly', undefined, undefined, 6, 15)).toBe(
      midnight(2026, 5, 15)
    )
  })
})

// ── unknown frequency ───────────────────────────────────────────────

describe('unknown frequency', () => {
  it('defaults to tomorrow', () => {
    vi.setSystemTime(new Date(2025, 5, 18, 12, 0, 0))
    expect(calculateNextOccurrence('something_else')).toBe(midnight(2025, 5, 19))
  })
})

// ── day-boundary options (start of day / end of day config) ─────────

import { getLogicalDayStart } from './calculate-next-occurrence'

// Helper: local wall-clock instant
function at(year: number, month: number, day: number, hour = 0, minute = 0): number {
  return new Date(year, month, day, hour, minute, 0, 0).getTime()
}

describe('day-boundary options', () => {
  it('daily occurrence lands at the configured spawn time', () => {
    vi.setSystemTime(new Date(2025, 5, 18, 12, 0, 0))
    expect(
      calculateNextOccurrence('daily', undefined, undefined, undefined, undefined, { spawnMinutes: 360 })
    ).toBe(at(2025, 5, 19, 6))
  })

  it('at 1am with a 3am turnover, the occurrence lands later the SAME calendar day', () => {
    // 1am Wednesday is logically still Tuesday, so "tomorrow" = Wednesday 6am.
    vi.setSystemTime(new Date(2025, 5, 18, 1, 0, 0))
    expect(
      calculateNextOccurrence('daily', undefined, undefined, undefined, undefined, { turnoverMinutes: 180, spawnMinutes: 360 })
    ).toBe(at(2025, 5, 18, 6))
  })

  it('after the turnover the occurrence moves to the next calendar day', () => {
    vi.setSystemTime(new Date(2025, 5, 18, 4, 0, 0)) // past the 3am turnover
    expect(
      calculateNextOccurrence('daily', undefined, undefined, undefined, undefined, { turnoverMinutes: 180, spawnMinutes: 360 })
    ).toBe(at(2025, 5, 19, 6))
  })

  it('weekly respects the spawn time too', () => {
    // Wednesday June 18, 2025; routine on Fridays (5); spawn 9:00.
    vi.setSystemTime(new Date(2025, 5, 18, 12, 0, 0))
    expect(
      calculateNextOccurrence('weekly', [5], undefined, undefined, undefined, { spawnMinutes: 540 })
    ).toBe(at(2025, 5, 20, 9))
  })

  it('an explicit utcOffset computes the occurrence in that frame', () => {
    // Frozen at 06:30 UTC = noon IST (+330). Tomorrow IST-midnight = 18:30 UTC today.
    vi.setSystemTime(new Date(Date.UTC(2025, 5, 18, 6, 30)))
    expect(
      calculateNextOccurrence('daily', undefined, undefined, undefined, undefined, { utcOffsetMinutes: 330 })
    ).toBe(Date.UTC(2025, 5, 18, 18, 30))
  })
})

describe('getLogicalDayStart', () => {
  it('is local midnight by default', () => {
    vi.setSystemTime(new Date(2025, 5, 18, 12, 0, 0))
    expect(getLogicalDayStart(Date.now())).toBe(at(2025, 5, 18))
  })

  it('before the turnover the current day still belongs to yesterday', () => {
    vi.setSystemTime(new Date(2025, 5, 18, 1, 0, 0))
    expect(getLogicalDayStart(Date.now(), { turnoverMinutes: 180 })).toBe(at(2025, 5, 17, 3))
  })

  it('after the turnover the day starts today at the turnover instant', () => {
    vi.setSystemTime(new Date(2025, 5, 18, 4, 0, 0))
    expect(getLogicalDayStart(Date.now(), { turnoverMinutes: 180 })).toBe(at(2025, 5, 18, 3))
  })
})
