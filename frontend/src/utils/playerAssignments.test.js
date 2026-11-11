import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { assignmentPanelPosition, assignmentPlayers, assignmentPrintPages, assignmentTeam, updatePlayerAlignment, updatePlayerAssignment } from './playerAssignments.js'

const markers = [
  { id: 'receiver', label: 'X', team: 'offense', x: 10, y: 50 },
  { id: 'corner-left', label: 'C', team: 'defense' },
  { id: 'corner-right', label: 'C', team: 'defense' },
  { id: 'legacy', label: 'Q' },
]

test('floating assignment panels stay within the viewport after dragging or resizing', () => {
  const panel = { width: 560, height: 480 }
  const viewport = { width: 1440, height: 900 }
  assert.deepEqual(assignmentPanelPosition({ x: -100, y: -50 }, panel, viewport), { x: 12, y: 12 })
  assert.deepEqual(assignmentPanelPosition({ x: 2000, y: 2000 }, panel, viewport), { x: 868, y: 408 })
  assert.deepEqual(assignmentPanelPosition({ x: 300, y: 100 }, panel, viewport), { x: 300, y: 100 })
  assert.deepEqual(assignmentPanelPosition({ x: 2000, y: 2000 }, { width: 288, height: 400 }, { width: 312, height: 500 }), { x: 12, y: 88 })
})

test('assignment rows follow the parent collection side, including legacy offense markers', () => {
  assert.deepEqual(assignmentPlayers(markers, 'Offense').map((marker) => marker.id), ['receiver', 'legacy'])
  assert.deepEqual(assignmentPlayers(markers, 'Defense').map((marker) => marker.id), ['corner-left', 'corner-right'])
  assert.deepEqual(assignmentPlayers(markers, 'Special Teams'), [])
  assert.deepEqual(assignmentPlayers(markers, undefined), [])
  assert.deepEqual(assignmentPlayers(undefined, 'Offense'), [])
  assert.equal(assignmentTeam('Special Teams'), null)
})

test('assignments follow marker IDs without changing labels, coordinates or other players', () => {
  const updated = updatePlayerAssignment(markers, 'corner-right', 'Deep third\nRead the quarterback')
  assert.equal(updated[1].assignment, undefined)
  assert.equal(updated[2].assignment, 'Deep third\nRead the quarterback')
  assert.equal(markers[2].assignment, undefined)
  assert.equal(updated[0], markers[0])
  assert.equal(updated[2].label, 'C')
  const reloaded = JSON.parse(JSON.stringify({ markers: updated, showAssignments: false }))
  assert.equal(reloaded.markers[2].assignment, updated[2].assignment)
  assert.equal(reloaded.showAssignments, false)
  const cleared = updatePlayerAssignment(updated, 'corner-right', '')
  assert.equal(Object.hasOwn(cleared[2], 'assignment'), false)
})

test('alignment notes follow marker IDs and clear without changing other marker data', () => {
  const updated = updatePlayerAlignment(markers, 'corner-right', 'Outside shade')
  assert.equal(updated[1].alignment, undefined)
  assert.equal(updated[2].alignment, 'Outside shade')
  assert.equal(markers[2].alignment, undefined)
  assert.equal(updated[0], markers[0])
  assert.equal(updated[2].assignment, undefined)
  const cleared = updatePlayerAlignment(updated, 'corner-right', '')
  assert.equal(Object.hasOwn(cleared[2], 'alignment'), false)
})

test('print pages omit blank and opposing assignments and split long entries without losing text', () => {
  const assigned = markers.map((marker) => ({ ...marker, assignment: marker.team === 'defense' ? 'Defend' : ' ' }))
  assert.deepEqual(assignmentPrintPages(assigned, 'Offense', { width: 720, height: 960 }), [])
  assert.deepEqual(assignmentPrintPages(assigned, 'Special Teams', { width: 720, height: 960 }), [])
  assert.equal(assignmentPrintPages(assigned, 'Defense', { width: 720, height: 960 })[0].length, 2)
  const text = `${'Read the quarterback. '.repeat(60)}\n${'Deep third\n'.repeat(60)}`
  const pages = assignmentPrintPages(updatePlayerAssignment(markers, 'receiver', text), 'Offense', { width: 720, height: 600 })
  assert.ok(pages.length > 1)
  assert.ok(pages[1][0].continued)
  assert.equal(pages.flat().map((row) => row.text).join('').replace(/\n/g, ''), text.replace(/\n/g, ''))
  for (const rows of pages) {
    assert.ok(rows.reduce((total, row) => total + row.text.split('\n').length + 1, 0) <= Math.floor((600 - 110) / 18))
    assert.ok(rows.every((row) => row.text.split('\n').every((line) => Array.from(line).length <= 70)))
  }
})

test('designer renders only its unit assignments, respects visibility and prevents read-only edits', async () => {
  const server = await createServer({
    root: fileURLToPath(new URL('../../', import.meta.url)),
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false },
    appType: 'custom',
  })
  try {
    const { PlayDesigner } = await server.ssrLoadModule('/src/components/PlayDesigner.jsx')
    const render = (overrides = {}, props = {}) => renderToStaticMarkup(createElement(PlayDesigner, {
      record: { kind: 'play', name: 'Assignments test', parentCategory: 'Offense', initialMarkers: markers, showAssignments: true, ...overrides },
      ...props,
    }))
    const offense = render()
    assert.ok(offense.includes('Player Assignments'))
    assert.ok(offense.includes('aria-label="Open player assignments"'))
    assert.ok(offense.includes('aria-expanded="false"'))
    assert.ok(offense.includes('aria-label="Docked" title="Docked" aria-pressed="true"'))
    assert.ok(offense.includes('aria-label="Undocked" title="Undocked" aria-pressed="false"'))
    assert.equal((offense.match(/<textarea/g) || []).length, 4)
    assert.ok(offense.includes('scope="col">Alignment</th>'))
    assert.ok(offense.includes('>X</label>'))
    assert.ok(offense.includes('>Q</label>'))
    assert.ok(!offense.includes('>C</label>'))
    const defense = render({ parentCategory: 'Defense' })
    assert.equal((defense.match(/<textarea/g) || []).length, 4)
    assert.ok(!defense.includes('>X</label>'))
    assert.ok(!render({ parentCategory: 'Special Teams' }).includes('Player Assignments'))
    assert.ok(render({ showAssignments: false }).includes('Player Assignments'))
    assert.ok(render({ showAssignments: false }).includes('Open player assignments'))
    assert.ok(!render({ parentCategory: 'Special Teams' }).includes('Open player assignments'))
    const readOnly = render({}, { readOnly: true })
    assert.equal((readOnly.match(/readOnly=""/g) || []).length, 4)
    const assigned = render({ initialMarkers: updatePlayerAssignment(markers, 'receiver', '<script>not executable</script>') })
    assert.ok(assigned.includes('&lt;script&gt;not executable&lt;/script&gt;'))
    const aligned = render({ initialMarkers: updatePlayerAlignment(markers, 'receiver', 'Slot left') })
    assert.ok(aligned.includes('Slot left</textarea>'))
  } finally {
    await server.close()
  }
})