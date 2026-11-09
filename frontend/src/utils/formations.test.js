import assert from 'node:assert/strict'
import test from 'node:test'
import { applyPlayerLabelOption, getTemplatesForGameType } from './formations.js'

const markers = [
  { id: 'offense-0', label: 'RT', team: 'offense' },
  { id: 'offense-1', label: 'RG', team: 'offense' },
  { id: 'offense-2', label: 'C', team: 'offense' },
  { id: 'offense-3', label: 'LG', team: 'offense' },
  { id: 'offense-4', label: 'LT', team: 'offense' },
  { id: 'offense-5', label: 'X', team: 'offense' },
  { id: 'defense-0', label: 'C', team: 'defense' },
]

test('player label options preserve all, suppress offensive line, or suppress every label', () => {
  assert.equal(applyPlayerLabelOption(markers, 'Show All Player Labels'), markers)
  assert.equal(applyPlayerLabelOption(markers), markers)

  const withoutOffensiveLine = applyPlayerLabelOption(markers, 'No offensive line Labels')
  assert.deepEqual(withoutOffensiveLine.map((marker) => marker.label), ['', '', '', '', '', 'X', 'C'])
  assert.equal(withoutOffensiveLine[5], markers[5])
  assert.equal(withoutOffensiveLine[6], markers[6])

  const withoutLabels = applyPlayerLabelOption(markers, 'No labels')
  assert.deepEqual(withoutLabels.map((marker) => marker.label), ['', '', '', '', '', '', ''])
  assert.notEqual(withoutLabels[5], markers[5])
  assert.equal(markers[0].label, 'RT')
})

const expectedTemplatesByCategory = {
  Kickoff: [
    'Balanced Kickoff vs 5-2-2-2 Return',
    'Balanced Kickoff vs 5-3-2-1 Return',
  ],
  'Kickoff Return': [
    'Balanced Kickoff vs 5-2-2-2 Return',
    'Balanced Kickoff vs 5-3-2-1 Return',
  ],
  Punt: [
    'Shield Punt vs Base Return',
    'Shield Punt vs Punt Block',
    'Spread Punt vs Base Return',
    'Spread Punt vs Punt Block',
  ],
  'Punt Return': [
    'Shield Punt vs Base Return',
    'Shield Punt vs Punt Block',
    'Spread Punt vs Base Return',
    'Spread Punt vs Punt Block',
  ],
  'PAT/FG': [
    'PAT-FG Protection vs Base Block',
    'PAT-FG Protection vs Heavy Block',
  ],
  'PAT/FG Block': [
    'PAT-FG Protection vs Base Block',
    'PAT-FG Protection vs Heavy Block',
  ],
  'Onside Kick': ['Onside Kick vs Hands Team'],
  'Hands Team': ['Onside Kick vs Hands Team'],
}

test('11v11 Special Teams templates are filtered by category', () => {
  for (const [category, expectedLabels] of Object.entries(expectedTemplatesByCategory)) {
    const templates = getTemplatesForGameType('11v11', category)
    assert.deepEqual(templates.map((template) => template.label), expectedLabels)
    for (const template of templates) {
      assert.equal(template.gameType, '11v11')
      assert.equal(template.offense.length, 11)
      assert.equal(template.defense.length, 11)
      assert.equal(template.position_labels.offense.length, 11)
      assert.equal(template.position_labels.defense.length, 11)
    }
  }
})

test('template lookup stays empty until game type and category are selected', () => {
  assert.deepEqual(getTemplatesForGameType('', ''), [])
  assert.deepEqual(getTemplatesForGameType('11v11', ''), [])
  assert.deepEqual(getTemplatesForGameType('', 'Kickoff'), [])
})

test('11v11 Offense and Defense categories exclude the Special Teams template group', () => {
  const categories = ['Formation', 'Shift/Motion', 'Run', 'Pass', 'Play-Action Pass', 'RPO', 'Gadget', 'Generic', 'Front', 'Stunt', 'Blitz', 'Coverage', 'Play Call']
  for (const category of categories) {
    const templates = getTemplatesForGameType('11v11', category)
    assert.ok(templates.length > 0)
    assert.ok(templates.every((template) => template.formationFamily !== 'special_teams'))
  }
})