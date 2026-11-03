import assert from 'node:assert/strict'
import test from 'node:test'
import { loadSlideshowDetails, loadSlideshowRows } from './slideshow.js'

test('practice scripts use saved playbook order and load adjustments', async () => {
  const rows = [{ id: 'second' }, { id: 'first' }]
  const api = {
    listPlaybookRows: async (id) => { assert.equal(id, 'script'); return { items: rows } },
    getPlay: async (bookId, id) => { assert.equal(bookId, 'script'); return { id } },
    listSlides: async (bookId, id) => { assert.equal(bookId, 'script'); assert.equal(id, 'second'); return { items: [{ id: 'adjustment' }] } },
  }
  const collection = { id: 'script', gameCardId: 'offense-scout' }
  assert.deepEqual(await loadSlideshowRows(api, collection), rows)
  assert.deepEqual(await loadSlideshowDetails(api, collection, rows[0]), { play: { id: 'second' }, adjustments: [{ id: 'adjustment' }] })
})

test('installs follow grouping order and resolve source playbooks for adjustments', async () => {
  const collection = {
    id: 'install', category: 'Defense', gameCardId: 'defense-installs',
    installPlays: [{ playbookId: 'source', playId: 'ungrouped' }, { playbookId: 'source', playId: 'grouped', groupingId: 'group' }, { playbookId: 'source', playId: 'deleted' }],
  }
  const api = {
    listPlaybookRows: async () => ({ items: [{ id: 'group', rowType: 'grouping' }] }),
    getPlaybook: async () => ({ category: 'Defense' }),
    listPlays: async () => ({ items: [{ id: 'ungrouped' }, { id: 'grouped' }] }),
    getPlay: async (bookId, id) => { assert.equal(bookId, 'source'); return { id } },
    listSlides: async (bookId) => { assert.equal(bookId, 'source'); return { items: [{ id: 'adjustment' }] } },
  }
  const rows = await loadSlideshowRows(api, collection)
  assert.deepEqual(rows.map((row) => row.id), ['grouped', 'ungrouped'])
  assert.equal((await loadSlideshowDetails(api, collection, rows[0])).adjustments.length, 1)
  api.getPlaybook = async () => ({ category: 'Defense', recordStatus: 'Archived' })
  assert.deepEqual(await loadSlideshowRows(api, collection), [])
})

test('scouting reports load a single scout play without playbook or adjustment requests', async () => {
  const collection = { kind: 'scoutPlay', parentId: 'game', id: 'report' }
  const report = { id: 'report', name: 'Report', markers: [] }
  const api = { getScoutPlay: async (gameId, id) => { assert.equal(gameId, 'game'); assert.equal(id, 'report'); return report } }
  const rows = await loadSlideshowRows(api, collection)
  assert.deepEqual(rows, [report])
  assert.deepEqual(await loadSlideshowDetails(api, collection, rows[0]), { play: report, adjustments: [] })
})