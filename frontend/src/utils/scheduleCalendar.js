export const ScheduleView = Object.freeze({ WEEK: 'week', MONTH: 'month', QUARTER: 'quarter', YEAR: 'year' })
const pad = (value) => String(value).padStart(2, '0')
const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export function buildCalendarDays(date, mode) {
  if (mode === ScheduleView.WEEK) {
    const first = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay())
    return Array.from({ length: 7 }, (_, index) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + index))
  }
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const start = new Date(first.getFullYear(), first.getMonth(), -first.getDay() + 1)
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const weekCount = Math.ceil((first.getDay() + daysInMonth) / 7)
  return Array.from({ length: weekCount * 7 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
}

export function scheduleMonths(date, mode) {
  const year = date.getFullYear()
  const month = date.getMonth()
  return mode === ScheduleView.YEAR
    ? Array.from({ length: 12 }, (_, index) => new Date(year, index, 1))
    : (mode === ScheduleView.QUARTER ? [-1, 0, 1] : [0]).map((offset) => new Date(year, month + offset, 1))
}

export function schedulePeriod(date, mode) {
  if (mode === ScheduleView.WEEK) {
    const days = buildCalendarDays(date, mode)
    return { start: dateKey(days[0]), end: dateKey(days[6]) }
  }
  const months = scheduleMonths(date, mode)
  const last = months[months.length - 1]
  return { start: dateKey(months[0]), end: dateKey(new Date(last.getFullYear(), last.getMonth() + 1, 0)) }
}

export function scheduleLoadPeriod(date, mode, displayMode) {
  if (displayMode !== 'calendar' || mode === ScheduleView.WEEK || mode === ScheduleView.YEAR) return schedulePeriod(date, mode)
  const months = scheduleMonths(date, mode)
  const firstDays = buildCalendarDays(months[0], 'month')
  const lastDays = buildCalendarDays(months[months.length - 1], 'month')
  return { start: dateKey(firstDays[0]), end: dateKey(lastDays[lastDays.length - 1]) }
}

export function shiftScheduleDate(date, mode, direction) {
  if (mode === ScheduleView.WEEK) return new Date(date.getFullYear(), date.getMonth(), date.getDate() + direction * 7)
  if (mode === ScheduleView.YEAR) return new Date(date.getFullYear() + direction, date.getMonth(), 1)
  return new Date(date.getFullYear(), date.getMonth() + direction, 1)
}