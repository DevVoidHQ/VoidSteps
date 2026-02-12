import {
  getDueDateStatus,
  formatRelativeDate,
  formatDateForInput,
  parseDateInput,
  parseStartDateInput,
  isOverdue,
  isUpcoming,
  getStartOfToday,
} from './date-utils'

// Pin "now" to 2025-06-15 12:00:00 local time for all tests
const NOW = new Date(2025, 5, 15, 12, 0, 0, 0) // June 15 2025, noon

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

// ── getDueDateStatus ────────────────────────────────────────────────

describe('getDueDateStatus', () => {
  it('returns "none" for undefined', () => {
    expect(getDueDateStatus(undefined)).toBe('none')
  })

  it('returns "overdue" when due date is in the past', () => {
    const yesterday = new Date(2025, 5, 14, 12, 0, 0).getTime()
    expect(getDueDateStatus(yesterday)).toBe('overdue')
  })

  it('returns "due-soon" when due date is within 24 hours', () => {
    const in12Hours = NOW.getTime() + 12 * 60 * 60 * 1000
    expect(getDueDateStatus(in12Hours)).toBe('due-soon')
  })

  it('returns "upcoming" when due date is beyond 24 hours', () => {
    const in3Days = NOW.getTime() + 3 * 24 * 60 * 60 * 1000
    expect(getDueDateStatus(in3Days)).toBe('upcoming')
  })
})

// ── formatRelativeDate ──────────────────────────────────────────────

describe('formatRelativeDate', () => {
  it('returns empty string for undefined', () => {
    expect(formatRelativeDate(undefined)).toBe('')
  })

  it('returns "Today" when date is today', () => {
    expect(formatRelativeDate(NOW.getTime())).toBe('Today')
  })

  it('returns "Tomorrow" when date is tomorrow', () => {
    const tomorrow = new Date(2025, 5, 16, 10, 0, 0).getTime()
    expect(formatRelativeDate(tomorrow)).toBe('Tomorrow')
  })

  it('returns "N days overdue" for past dates (due date mode)', () => {
    const threeDaysAgo = new Date(2025, 5, 12, 10, 0, 0).getTime()
    expect(formatRelativeDate(threeDaysAgo)).toBe('3 days overdue')
  })

  it('returns "1 day overdue" for yesterday (due date mode)', () => {
    const yesterday = new Date(2025, 5, 14, 10, 0, 0).getTime()
    expect(formatRelativeDate(yesterday)).toBe('1 day overdue')
  })

  it('returns "Yesterday" for yesterday (start date mode)', () => {
    const yesterday = new Date(2025, 5, 14, 10, 0, 0).getTime()
    expect(formatRelativeDate(yesterday, true)).toBe('Yesterday')
  })

  it('returns "N days ago" for past dates (start date mode)', () => {
    const threeDaysAgo = new Date(2025, 5, 12, 10, 0, 0).getTime()
    expect(formatRelativeDate(threeDaysAgo, true)).toBe('3 days ago')
  })

  it('returns "In N days" for future dates within 7 days (due date mode)', () => {
    const in5Days = new Date(2025, 5, 20, 10, 0, 0).getTime()
    expect(formatRelativeDate(in5Days)).toBe('In 5 days')
  })

  it('returns "Starts in N days" for future dates within 7 days (start date mode)', () => {
    const in5Days = new Date(2025, 5, 20, 10, 0, 0).getTime()
    expect(formatRelativeDate(in5Days, true)).toBe('Starts in 5 days')
  })

  it('returns formatted date for dates beyond 7 days', () => {
    const farFuture = new Date(2025, 6, 10, 10, 0, 0).getTime() // Jul 10
    const result = formatRelativeDate(farFuture)
    // Should contain "Jul" and "10" in some locale format
    expect(result).toContain('Jul')
    expect(result).toContain('10')
  })
})

// ── formatDateForInput ──────────────────────────────────────────────

describe('formatDateForInput', () => {
  it('returns empty string for undefined', () => {
    expect(formatDateForInput(undefined)).toBe('')
  })

  it('formats to YYYY-MM-DD with zero-padding', () => {
    const date = new Date(2025, 0, 5, 12, 0, 0).getTime() // Jan 5
    expect(formatDateForInput(date)).toBe('2025-01-05')
  })

  it('formats double-digit month and day correctly', () => {
    const date = new Date(2025, 11, 25, 12, 0, 0).getTime() // Dec 25
    expect(formatDateForInput(date)).toBe('2025-12-25')
  })
})

// ── parseDateInput ──────────────────────────────────────────────────

describe('parseDateInput', () => {
  it('returns undefined for empty string', () => {
    expect(parseDateInput('')).toBeUndefined()
  })

  it('parses to end-of-day (23:59:59.999)', () => {
    const ts = parseDateInput('2025-06-15')!
    const date = new Date(ts)
    expect(date.getHours()).toBe(23)
    expect(date.getMinutes()).toBe(59)
    expect(date.getSeconds()).toBe(59)
    expect(date.getMilliseconds()).toBe(999)
  })

  it('parses the correct date', () => {
    const ts = parseDateInput('2025-01-05')!
    const date = new Date(ts)
    expect(date.getFullYear()).toBe(2025)
    expect(date.getMonth()).toBe(0) // January
    expect(date.getDate()).toBe(5)
  })
})

// ── parseStartDateInput ─────────────────────────────────────────────

describe('parseStartDateInput', () => {
  it('returns undefined for empty string', () => {
    expect(parseStartDateInput('')).toBeUndefined()
  })

  it('parses to start-of-day (00:00:00.000)', () => {
    const ts = parseStartDateInput('2025-06-15')!
    const date = new Date(ts)
    expect(date.getHours()).toBe(0)
    expect(date.getMinutes()).toBe(0)
    expect(date.getSeconds()).toBe(0)
    expect(date.getMilliseconds()).toBe(0)
  })
})

// ── isOverdue ───────────────────────────────────────────────────────

describe('isOverdue', () => {
  it('returns false for undefined', () => {
    expect(isOverdue(undefined)).toBe(false)
  })

  it('returns true when due date is in the past', () => {
    const yesterday = new Date(2025, 5, 14, 12, 0, 0).getTime()
    expect(isOverdue(yesterday)).toBe(true)
  })

  it('returns false when due date is in the future', () => {
    const tomorrow = new Date(2025, 5, 16, 12, 0, 0).getTime()
    expect(isOverdue(tomorrow)).toBe(false)
  })
})

// ── isUpcoming ──────────────────────────────────────────────────────

describe('isUpcoming', () => {
  it('returns false for undefined', () => {
    expect(isUpcoming(undefined)).toBe(false)
  })

  it('returns true when start date is in the future', () => {
    const future = new Date(2025, 5, 20, 10, 0, 0).getTime()
    expect(isUpcoming(future)).toBe(true)
  })

  it('returns false when start date is in the past', () => {
    const past = new Date(2025, 5, 10, 10, 0, 0).getTime()
    expect(isUpcoming(past)).toBe(false)
  })
})

// ── getStartOfToday ─────────────────────────────────────────────────

describe('getStartOfToday', () => {
  it('returns midnight of the current day', () => {
    const result = getStartOfToday()
    const date = new Date(result)
    expect(date.getFullYear()).toBe(2025)
    expect(date.getMonth()).toBe(5) // June
    expect(date.getDate()).toBe(15)
    expect(date.getHours()).toBe(0)
    expect(date.getMinutes()).toBe(0)
    expect(date.getSeconds()).toBe(0)
    expect(date.getMilliseconds()).toBe(0)
  })
})
