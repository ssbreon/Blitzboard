import assert from 'node:assert/strict'
import test from 'node:test'
import { scoutingTendencyRows, scoutingTemplatesForUnit } from './scoutingTemplates.js'

test('scouting templates are filtered by unit', () => {
  assert.deepEqual(scoutingTemplatesForUnit('Offense').map(({ label }) => label), [
    'Formation', 'Down & Distance', 'Field Position', 'Game Situation', 'Concepts',
  ])
  assert.deepEqual(scoutingTemplatesForUnit('Defense').map(({ label }) => label), [
    'Fronts', 'Down & Distance', 'Field Position', 'Game Situation', 'Coverages & Pressures',
  ])
  assert.deepEqual(scoutingTemplatesForUnit('Special Teams').map(({ label }) => label), [
    'Situations', 'Formations', 'Direction & Placement', 'Returns', 'Fakes & Specials',
  ])
})

test('configured lines become tendency rows with empty notes', () => {
  assert.deepEqual(scoutingTendencyRows('offense.formation', {
    'offense.formation': '  Trips Right  \n\nPin and pull\r\n',
  }), [
    { id: 'offense.formation-1', tendency: 'Trips Right', notes: '' },
    { id: 'offense.formation-3', tendency: 'Pin and pull', notes: '' },
  ])
})

test('legacy scouting text maps to the Formation template', () => {
  assert.deepEqual(scoutingTendencyRows('offense.formation', 'Run strength'), [
    { id: 'offense.formation-1', tendency: 'Run strength', notes: '' },
  ])
})