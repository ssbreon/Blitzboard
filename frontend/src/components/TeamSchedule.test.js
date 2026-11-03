import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { ScheduleView, scheduleMonths, schedulePeriod, scheduleLoadPeriod, shiftScheduleDate, buildCalendarDays } from '../utils/scheduleCalendar.js'

test('schedule periods, navigation and shared calendar rendering', async () => {
  const server = await createServer({ root: fileURLToPath(new URL('../../', import.meta.url)), optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' })
  try {
    const { MonthCalendar, YearCalendar } = await server.ssrLoadModule('/src/components/TeamSchedule.jsx')
    assert.deepEqual(Object.values(ScheduleView), ['week', 'month', 'quarter', 'year'])
    const january = new Date(2026, 0, 31)
    assert.deepEqual(scheduleMonths(january, 'quarter').map((date) => [date.getFullYear(), date.getMonth()]), [[2025, 11], [2026, 0], [2026, 1]])
    assert.deepEqual(schedulePeriod(january, 'quarter'), { start: '2025-12-01', end: '2026-02-28' })
    assert.deepEqual(schedulePeriod(new Date(2028, 1, 15), 'month'), { start: '2028-02-01', end: '2028-02-29' })
    assert.deepEqual(schedulePeriod(january, 'year'), { start: '2026-01-01', end: '2026-12-31' })
    assert.deepEqual(schedulePeriod(new Date(2026, 0, 1), 'week'), { start: '2025-12-28', end: '2026-01-03' })
    assert.deepEqual(scheduleLoadPeriod(january, 'month', 'calendar'), { start: '2025-12-28', end: '2026-01-31' })
    assert.deepEqual(scheduleLoadPeriod(january, 'quarter', 'calendar'), { start: '2025-11-30', end: '2026-02-28' })
    assert.deepEqual(scheduleLoadPeriod(january, 'quarter', 'grid'), { start: '2025-12-01', end: '2026-02-28' })
    assert.deepEqual(scheduleLoadPeriod(january, 'year', 'calendar'), { start: '2026-01-01', end: '2026-12-31' })
    assert.equal(shiftScheduleDate(january, 'quarter', 1).getMonth(), 1)
    assert.equal(shiftScheduleDate(january, 'quarter', -1).getFullYear(), 2025)
    assert.equal(shiftScheduleDate(january, 'year', 1).getFullYear(), 2027)
    assert.equal(shiftScheduleDate(january, 'week', 1).getDate(), 7)
    assert.equal(buildCalendarDays(new Date(2026, 1, 1), 'month').length, 28)
    const eventsByDate = new Map([['2026-01-15', [
      { id: 'practice', kind: 'event', eventType: 'Practice', name: 'Practice <test>', startTime: '16:30' },
      { id: 'game', kind: 'game', eventType: 'Game', opponent: 'Northern York', name: 'Game vs. Northern York', startTime: '19:00' },
    ]]])
    const month = renderToStaticMarkup(createElement(MonthCalendar, { month: january, eventsByDate, showHeading: true, highlightCurrent: true, canEdit: true }))
    assert.ok(month.includes('schedule-centered-month'))
    assert.ok(month.includes('Practice &lt;test&gt;'))
    assert.ok(month.includes('vs. Northern York'))
    assert.ok(month.includes('Drag Northern York'))
    assert.ok(month.includes('Add event 2026-01-15'))
    const year = renderToStaticMarkup(createElement(YearCalendar, { date: january, eventsByDate }))
    assert.equal((year.match(/class="schedule-mini-month"/g) || []).length, 12)
    assert.ok(year.includes('Open January 2026'))
    assert.ok(year.includes('aria-label="1 Practice"'))
    assert.ok(year.includes('aria-label="1 Game"'))
    assert.ok(!year.includes('schedule-event-content'))
    const { createApi } = await server.ssrLoadModule('/src/api/client.js')
    const originalFetch = globalThis.fetch
    const paths = []
    globalThis.fetch = async (path) => {
      paths.push(path)
      return { ok: true, status: 200, json: async () => ({ items: [] }) }
    }
    try {
      const api = createApi()
      await api.listScheduleEvents({ start: '2026-01-01', end: '2026-12-31', summary: true })
      await api.listGamePlans('Offense', 'Falcons', true, { start: '2026-01-01', end: '2026-12-31', summary: true })
      await api.listGamePlans()
      const eventQuery = new URL(paths[0], 'http://localhost').searchParams
      assert.equal(eventQuery.get('start'), '2026-01-01')
      assert.equal(eventQuery.get('end'), '2026-12-31')
      assert.equal(eventQuery.get('scheduleSummary'), 'true')
      const gameQuery = new URL(paths[1], 'http://localhost').searchParams
      assert.equal(gameQuery.get('category'), 'Offense')
      assert.equal(gameQuery.get('namePrefix'), 'Falcons')
      assert.equal(gameQuery.get('summary'), 'true')
      assert.equal(gameQuery.get('scheduleSummary'), 'true')
      assert.equal(new URL(paths[2], 'http://localhost').search, '')
    } finally {
      globalThis.fetch = originalFetch
    }
  } finally {
    await server.close()
  }
})