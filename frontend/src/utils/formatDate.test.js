import assert from 'node:assert/strict'
import test from 'node:test'
import { formatDate } from './formatDate.js'

test('grid timestamps use local time even when the account timezone is UTC', () => {
  const previousTimezone = process.env.TZ
  process.env.TZ = 'America/New_York'
  try {
    for (const timestamp of ['2026-01-15T02:30:00+00:00', '2026-07-15T02:30:00Z']) {
      const date = new Date(timestamp)
      const local = date.toLocaleString()
      assert.notEqual(local, date.toLocaleString(undefined, { timeZone: 'UTC' }))
      assert.equal(formatDate(timestamp, 'UTC'), local)
      assert.equal(formatDate(timestamp, { updatedAt: timestamp }), local)
    }
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ
    else process.env.TZ = previousTimezone
  }
})

test('missing grid timestamps keep the empty placeholder', () => {
  assert.equal(formatDate(undefined), '—')
  assert.equal(formatDate(null), '—')
  assert.equal(formatDate(''), '—')
})