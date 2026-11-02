const listPath = /^\/(?:playbooks|game-plans|schedule-events)(?:\/[^/]+\/(?:plays|rows|groupings|scout-plays)(?:\/[^/]+\/slides)?)?$/

export function createBreadcrumbCache() {
  const lists = new Map()
  const pending = new Map()
  const owners = new Map()
  const listeners = new Set()
  let version = 0

  function notify() {
    version += 1
    listeners.forEach((listener) => listener())
  }

  function apply(path, method, payload, record) {
    const parts = path.split('/').filter(Boolean)
    const creating = method === 'POST' && listPath.test(path)
    const collection = creating ? path : `/${parts.slice(0, -1).join('/')}`
    const id = creating ? record?.id : parts.at(-1)
    if (!id || (!creating && !listPath.test(collection))) return
    if (method === 'POST' && id === 'reorder') {
      for (const [key, result] of lists) {
        const pathname = new URL(key, 'http://cache.local').pathname
        if (pathname !== collection && pathname !== collection.replace(/\/plays$/, '/rows')) continue
        const rows = new Map(result.items.map((row) => [row.id, row]))
        result.items = payload.ids.filter((rowId) => rows.has(rowId)).map((rowId, index) => ({ ...rows.get(rowId), page: index + 1 }))
      }
      notify()
      return
    }
    for (const [key, result] of lists) {
      const url = new URL(key, 'http://cache.local')
      const rowCollection = collection.endsWith('/plays') || collection.endsWith('/groupings')
        ? collection.replace(/\/(plays|groupings)$/, '/rows') : collection
      if (url.pathname !== collection && url.pathname !== rowCollection) continue
      const index = result.items.findIndex((row) => row.id === id)
      const previous = result.items[index]
      const next = { ...previous, ...payload, ...record, id, _gridDirty: true,
        ...(collection.endsWith('/groupings') && { rowType: 'grouping' }),
        ...(method === 'DELETE' && { _gridDeleted: true }) }
      if (!next.ownerName && owners.has(next.ownerId)) next.ownerName = owners.get(next.ownerId)
      if (index >= 0) {
        result.items = result.items.map((row, rowIndex) => rowIndex === index ? next : row)
      } else if (creating) {
        const category = url.searchParams.get('category')
        const prefix = url.searchParams.get('namePrefix')
        if ((!category || next.category === category) && (!prefix || next.name?.toLowerCase().startsWith(prefix.toLowerCase()))) {
          result.items = [...result.items, next]
        }
      }
    }
    if (creating || method === 'DELETE') {
      const parentCollection = parts[0]
      const parentId = parts[1]
      if (parentId && ['plays', 'scout-plays'].includes(parts[2]) && parts.length <= 4) {
        for (const [key, result] of lists) {
          if (new URL(key, 'http://cache.local').pathname !== `/${parentCollection}`) continue
          result.items = result.items.map((row) => row.id === parentId
            ? { ...row, playCount: Math.max(0, (row.playCount || 0) + (creating ? 1 : -1)), _gridDirty: true }
            : row)
        }
      }
    }
    if (parts[4] === 'slides') {
      for (const [key, result] of lists) {
        const pathname = new URL(key, 'http://cache.local').pathname
        if (pathname !== `/playbooks/${parts[1]}/rows` && pathname !== `/playbooks/${parts[1]}/plays`) continue
        result.items = result.items.map((row) => {
          if (row.id !== parts[3]) return row
          const slideList = [...lists].find(([slideKey]) => new URL(slideKey, 'http://cache.local').pathname === `/playbooks/${parts[1]}/plays/${parts[3]}/slides`)?.[1]
          const next = { ...row, _gridDirty: true }
          if (slideList) next.adjustments = slideList.items.filter((slide) => !slide._gridDeleted).map((slide) => slide.title || 'Adjustment')
          else delete next.adjustments
          return next
        })
      }
    }
    notify()
  }

  return {
    async read(path, load) {
      if (!listPath.test(path.split('?')[0])) return load()
      if (lists.has(path)) return { ...lists.get(path) }
      if (!pending.has(path)) {
        const loadList = async () => {
          const startedAt = version
          const result = await load()
          if (startedAt !== version) return loadList()
          if (Array.isArray(result?.items)) {
            lists.set(path, { ...result })
            result.items.forEach((row) => { if (row.ownerId && row.ownerName) owners.set(row.ownerId, row.ownerName) })
          }
          return result
        }
        pending.set(path, loadList().finally(() => pending.delete(path)))
      }
      return { ...await pending.get(path) }
    },
    apply,
    setOwner(id, name) { if (id && name) owners.set(id, name) },
    clear() { lists.clear(); notify() },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    getSnapshot() { return version },
  }
}