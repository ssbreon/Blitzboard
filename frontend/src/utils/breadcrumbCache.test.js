import assert from 'node:assert/strict'
import test from 'node:test'
import { createBreadcrumbCache } from './breadcrumbCache.js'

test('breadcrumb lists reuse rows and patch edits, append additions, and retain deleted slots', async () => {
  const cache = createBreadcrumbCache()
  let requests = 0
  const load = async () => { requests += 1; return { items: [{ id: 'one', name: 'Original', page: 1 }] } }
  await cache.read('/playbooks/book/rows?summary=true', load)
  cache.apply('/playbooks/book/plays/one', 'PATCH', { name: 'Edited' }, { id: 'one', name: 'Edited' })
  cache.apply('/playbooks/book/plays', 'POST', { name: 'Added' }, { id: 'two', name: 'Added' })
  cache.apply('/playbooks/book/plays/one', 'DELETE', {}, null)
  const result = await cache.read('/playbooks/book/rows?summary=true', load)
  assert.equal(requests, 1)
  assert.deepEqual(result.items.map((row) => row.id), ['one', 'two'])
  assert.equal(result.items[0].name, 'Edited')
  assert.equal(result.items[0].page, 1)
  assert.equal(result.items[0]._gridDeleted, true)
  assert.equal(result.items[1]._gridDirty, true)
  cache.clear()
  assert.equal((await cache.read('/playbooks/book/rows?summary=true', load)).items[0]._gridDirty, undefined)
  assert.equal(requests, 2)
})

test('mutations stay within their collection and update cached ancestor counts', async () => {
  const cache = createBreadcrumbCache()
  await cache.read('/playbooks', async () => ({ items: [{ id: 'book', playCount: 1 }] }))
  await cache.read('/playbooks/other/rows', async () => ({ items: [] }))
  cache.apply('/playbooks/book/plays', 'POST', {}, { id: 'new', name: 'New' })
  assert.equal((await cache.read('/playbooks', assert.fail)).items[0].playCount, 2)
  assert.equal((await cache.read('/playbooks/other/rows', assert.fail)).items.length, 0)
})

test('deleted slots preserve paging and new records append after all existing rows', async () => {
  const cache = createBreadcrumbCache()
  const rows = Array.from({ length: 101 }, (_, index) => ({ id: String(index), page: index + 1 }))
  await cache.read('/playbooks/book/rows', async () => ({ items: rows }))
  cache.apply('/playbooks/book/plays/0', 'DELETE', {}, null)
  cache.apply('/playbooks/book/plays', 'POST', {}, { id: 'new' })
  const { items } = await cache.read('/playbooks/book/rows', assert.fail)
  assert.equal(items.length, 102)
  assert.equal(items[0]._gridDeleted, true)
  assert.equal(items[50], rows[50])
  assert.equal(items.at(-1).id, 'new')
})

test('filtered caches do not gain unrelated additions and keep edits in place', async () => {
  const cache = createBreadcrumbCache()
  const path = '/playbooks?category=Defense&namePrefix=A'
  await cache.read(path, async () => ({ items: [{ id: 'one', name: 'Alpha', category: 'Defense', year: 2026 }] }))
  cache.apply('/playbooks', 'POST', {}, { id: 'offense', name: 'Alpha', category: 'Offense' })
  cache.apply('/playbooks', 'POST', {}, { id: 'beta', name: 'Beta', category: 'Defense' })
  cache.apply('/playbooks/one', 'PATCH', { name: 'Renamed' }, { id: 'one', name: 'Renamed' })
  const { items } = await cache.read(path, assert.fail)
  assert.equal(items.length, 1)
  assert.equal(items[0].name, 'Renamed')
  assert.equal(items[0].year, 2026)
})

test('groupings and adjustment titles propagate without changing unrelated rows', async () => {
  const cache = createBreadcrumbCache()
  const original = { id: 'play', adjustments: ['Original'] }
  await cache.read('/playbooks/book/rows', async () => ({ items: [original] }))
  await cache.read('/playbooks/book/plays/play/slides?summary=true', async () => ({ items: [{ id: 'slide', title: 'Original' }] }))
  cache.apply('/playbooks/book/groupings', 'POST', { name: 'Group' }, { id: 'group', name: 'Group' })
  assert.equal((await cache.read('/playbooks/book/rows', assert.fail)).items[1].rowType, 'grouping')
  cache.apply('/playbooks/book/plays/play/slides/slide', 'PATCH', { title: 'Renamed' }, { id: 'slide', title: 'Renamed' })
  assert.deepEqual((await cache.read('/playbooks/book/rows', assert.fail)).items[0].adjustments, ['Renamed'])
  cache.apply('/playbooks/book/plays/play/slides/slide', 'DELETE', {}, null)
  assert.deepEqual((await cache.read('/playbooks/book/rows', assert.fail)).items[0].adjustments, [])
})

test('explicit reorders update cached pages', async () => {
  const cache = createBreadcrumbCache()
  await cache.read('/playbooks/book/rows', async () => ({ items: [{ id: 'first', page: 1 }, { id: 'second', page: 2 }] }))
  cache.apply('/playbooks/book/plays/reorder', 'POST', { ids: ['second', 'first'] }, {})
  assert.deepEqual((await cache.read('/playbooks/book/rows', assert.fail)).items.map(({ id, page }) => [id, page]), [['second', 1], ['first', 2]])
})

test('concurrent reads share a request and do not cache a response predating a mutation', async () => {
  const cache = createBreadcrumbCache()
  let resolve
  let requests = 0
  const load = () => {
    requests += 1
    return requests === 1 ? new Promise((done) => { resolve = done }) : Promise.resolve({ items: [{ id: 'one', name: 'Fresh' }] })
  }
  const first = cache.read('/playbooks', load)
  const second = cache.read('/playbooks', load)
  assert.equal(requests, 1)
  cache.apply('/playbooks/one', 'PATCH', { name: 'Fresh' }, { id: 'one', name: 'Fresh' })
  resolve({ items: [{ id: 'one', name: 'Stale' }] })
  assert.equal((await first).items[0].name, 'Fresh')
  assert.equal((await second).items[0].name, 'Fresh')
  assert.equal(requests, 2)
})

test('owner labels survive appending mutation responses and caches stay workspace-scoped', async () => {
  const cache = createBreadcrumbCache()
  const otherWorkspace = createBreadcrumbCache()
  cache.setOwner('coach', 'Coach Name')
  await cache.read('/playbooks', async () => ({ items: [] }))
  await otherWorkspace.read('/playbooks', async () => ({ items: [] }))
  cache.apply('/playbooks', 'POST', {}, { id: 'new', ownerId: 'coach' })
  assert.equal((await cache.read('/playbooks', assert.fail)).items[0].ownerName, 'Coach Name')
  assert.equal((await otherWorkspace.read('/playbooks', assert.fail)).items.length, 0)
})