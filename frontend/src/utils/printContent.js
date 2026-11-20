import { assignmentPlayers, assignmentPrintPages } from './playerAssignments.js'

export function isScoutingReport(item, collection) {
  return item?.kind === 'scoutPlay' || item?.entityType === 'scoutPlays' || collection?.kind === 'gamePlan'
}

export function scoutingTendenciesForPrint(item) {
  return Array.isArray(item?.scoutingTendencies)
    ? item.scoutingTendencies.filter((row) => row && (
      (typeof row.tendency === 'string' && row.tendency.trim())
      || (typeof row.notes === 'string' && row.notes.trim())
    ))
    : []
}

export function printContentOptions(items, collection) {
  const assignmentsCategory = (item) => item.parentCategory || item.unit || collection?.category
  return {
    hasAssignments: items.some((item) => !isScoutingReport(item, collection)
      && assignmentPlayers(item.markers, assignmentsCategory(item))
        .some((marker) => typeof marker.assignment === 'string' && marker.assignment.trim())),
    hasTendencies: items.some((item) => isScoutingReport(item, collection) && scoutingTendenciesForPrint(item).length > 0),
  }
}

export function appendPrintContentPages(pages, collection, { includeAssignments, includeTendencies, sheet }) {
  const assignmentsCategory = (item) => item.parentCategory || item.unit || collection?.category
  return pages.flatMap((page) => {
    if (page.type !== 'plays') return [page]
    const additionalPages = page.plays.flatMap((item) => [
      ...(!isScoutingReport(item, collection) && includeAssignments
        ? assignmentPrintPages(item.markers, assignmentsCategory(item), sheet).map((rows) => ({ type: 'assignments', play: item, rows }))
        : []),
      ...(isScoutingReport(item, collection) && includeTendencies && scoutingTendenciesForPrint(item).length
        ? [{ type: 'tendencies', play: item, rows: scoutingTendenciesForPrint(item) }]
        : []),
    ])
    return [page, ...additionalPages]
  })
}
