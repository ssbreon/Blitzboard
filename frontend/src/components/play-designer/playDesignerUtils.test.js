import test from 'node:test'
import assert from 'node:assert/strict'
import { adjustmentDesign, gameTypeLabel } from './playDesignerUtils.js'

test('gameTypeLabel formats game type identifiers', () => {
  assert.equal(gameTypeLabel('red_zone'), 'red Zone')
  assert.equal(gameTypeLabel('specialteams'), 'specialteams')
})

test('adjustmentDesign fills missing fields from fallback design', () => {
  const fallback = {
    markers: [{ id: 'a' }],
    drawings: { line: [{ id: 'line' }] },
    textAnnotations: [{ id: 'text' }],
    zones: [{ id: 'zone' }],
    templateId: 'template-a',
    category: 'Offense',
    fieldDecoration: 'Hash Marks',
    fieldOrientation: 'Upfield',
    fieldZone: 'Full Field',
    perspective: 'Coach',
    theme: 'classic',
  }

  const resolved = adjustmentDesign({}, fallback)

  assert.deepEqual(resolved.markers, fallback.markers)
  assert.equal(resolved.templateId, fallback.templateId)
  assert.equal(resolved.category, fallback.category)
  assert.equal(resolved.showAssignments, true)
})

test('adjustmentDesign uses adjustment fields when present', () => {
  const fallback = {
    markers: [{ id: 'base' }],
    drawings: {},
    textAnnotations: [],
    zones: [],
    templateId: 'base-template',
    category: 'Offense',
    fieldDecoration: 'Hash Marks',
    fieldOrientation: 'Upfield',
    fieldZone: 'Full Field',
    perspective: 'Coach',
    theme: 'classic',
  }

  const resolved = adjustmentDesign({
    markers: [{ id: 'adjustment' }],
    template: 'adjustment-template',
    category: 'Defense',
  }, fallback)

  assert.deepEqual(resolved.markers, [{ id: 'adjustment' }])
  assert.equal(resolved.templateId, 'adjustment-template')
  assert.equal(resolved.category, 'Defense')
})
