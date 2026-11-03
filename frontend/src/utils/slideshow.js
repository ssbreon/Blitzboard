export async function loadSlideshowRows(api, collection) {
  if (collection.kind === 'scoutPlay') {
    return [await api.getScoutPlay(collection.parentId, collection.id)]
  }
  const { items } = await api.listPlaybookRows(collection.id)
  if (!collection.gameCardId?.endsWith('-installs')) return items

  const selections = collection.installPlays || []
  const sources = await Promise.all([...new Set(selections.map((selection) => selection.playbookId))].map(async (id) => {
    const [book, result] = await Promise.all([api.getPlaybook(id), api.listPlays(id)])
    return [id, book.recordStatus !== 'Archived' && book.category === collection.category ? result.items : []]
  }))
  const books = new Map(sources)
  const plays = selections.flatMap((selection) => {
    const play = books.get(selection.playbookId)?.find((item) => item.id === selection.playId)
    return play ? [{ ...play, sourcePlaybookId: selection.playbookId, installGroupingId: selection.groupingId }] : []
  })
  const groupings = items.filter((item) => item.rowType === 'grouping')
  const groupingIds = new Set(groupings.map((item) => item.id))
  return [
    ...groupings.flatMap((grouping) => plays.filter((play) => play.installGroupingId === grouping.id)),
    ...plays.filter((play) => !groupingIds.has(play.installGroupingId)),
  ]
}

export async function loadSlideshowDetails(api, collection, row) {
  if (collection.kind === 'scoutPlay') {
    return { play: row, adjustments: [] }
  }
  const bookId = row.sourcePlaybookId || collection.id
  const [play, { items }] = await Promise.all([api.getPlay(bookId, row.id), api.listSlides(bookId, row.id)])
  return { play, adjustments: items || [] }
}