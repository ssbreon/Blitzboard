import assert from 'node:assert/strict'
import test from 'node:test'
import { applyPlayerLabelOption } from './formations.js'

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