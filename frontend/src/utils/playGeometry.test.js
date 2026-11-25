import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_FIELD_ZONE, FIELD_ZONES, KICKING_PLAY_CATEGORIES, fieldWindowForPlay, fieldZoneForCategory, fieldZoneOptionDisabled } from './playGeometry.js'

test('special teams categories enforce their field layout', () => {
  for (const category of ['PAT/FG', 'PAT/FG Block']) {
    assert.equal(fieldZoneForCategory(category, 'Red Zone'), 'Gold Zone')
    for (const zone of FIELD_ZONES) assert.equal(fieldZoneOptionDisabled(category, zone), zone !== 'Gold Zone')
    assert.deepEqual(fieldWindowForPlay({ category, fieldZone: 'Red Zone' }), fieldWindowForPlay({ category, fieldZone: 'Gold Zone' }))
  }
  for (const category of KICKING_PLAY_CATEGORIES) {
    assert.equal(fieldZoneForCategory(category, 'Gold Zone'), DEFAULT_FIELD_ZONE)
    for (const zone of FIELD_ZONES) assert.equal(fieldZoneOptionDisabled(category, zone), true)
    assert.deepEqual(fieldWindowForPlay({ category, fieldZone: 'Gold Zone' }), fieldWindowForPlay({ category, fieldZone: DEFAULT_FIELD_ZONE }))
    assert.ok(fieldWindowForPlay({ category, fieldZone: 'Gold Zone' }).yards > 35)
  }
})

test('other categories retain their selected zone', () => {
  assert.equal(fieldZoneForCategory('Run', 'Red Zone'), 'Red Zone')
  for (const zone of FIELD_ZONES) assert.equal(fieldZoneOptionDisabled('Run', zone), false)
})