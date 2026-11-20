import assert from 'node:assert/strict'
import test from 'node:test'
import { appendPrintContentPages, printContentOptions } from './printContent.js'

const sheet = { width: 720, height: 960 }

test('scouting reports expose tendency printing instead of player assignment printing', () => {
  const report = {
    kind: 'scoutPlay',
    unit: 'Offense',
    markers: [{ id: 'player', team: 'offense', assignment: 'Block the edge' }],
    scoutingTendencies: [{ id: 'formation-1', tendency: 'Trips Right', notes: 'Run strength' }],
  }
  assert.deepEqual(printContentOptions([report]), { hasAssignments: false, hasTendencies: true })
  assert.deepEqual(appendPrintContentPages([{ type: 'plays', plays: [report] }], null, {
    includeAssignments: true,
    includeTendencies: true,
    sheet,
  }).map((page) => page.type), ['plays', 'tendencies'])
})

test('normal and practice-script plays expose assignment printing after the graphic', () => {
  const play = {
    kind: 'play',
    parentCategory: 'Offense',
    markers: [{ id: 'player', team: 'offense', label: 'X', assignment: 'Block the edge' }],
  }
  assert.deepEqual(printContentOptions([play]), { hasAssignments: true, hasTendencies: false })
  assert.deepEqual(appendPrintContentPages([{ type: 'plays', plays: [play] }], null, {
    includeAssignments: true,
    includeTendencies: true,
    sheet,
  }).map((page) => page.type), ['plays', 'assignments'])
})

test('scouting report collections are classified even when records omit a kind', () => {
  const report = { entityType: 'scoutPlays', scoutingTendencies: [{ tendency: 'Cover 3', notes: '' }] }
  assert.deepEqual(printContentOptions([report], { kind: 'gamePlan' }), { hasAssignments: false, hasTendencies: true })
})
