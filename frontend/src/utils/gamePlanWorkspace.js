export const GAME_UNITS = ['Offense', 'Defense', 'Special Teams']

const PRACTICE_SCRIPT_CARD_IDS = {
  Offense: 'offense-scout',
  Defense: 'defense-scout',
  'Special Teams': 'special-teams-scout',
}

export function generatedPracticeScriptPayload(event, unit) {
  const gameCardId = PRACTICE_SCRIPT_CARD_IDS[unit]
  if (!event?.id || !gameCardId) return null
  return {
    name: `${event.name} - ${unit} Script`,
    category: unit,
    year: Number(event.eventDate.slice(0, 4)),
    gameCardId,
    practiceEventIds: [event.id],
  }
}

export function linkedPracticeEventIds(record) {
  if (Array.isArray(record?.practiceEventIds)) return record.practiceEventIds
  return record?.practiceEventId ? [record.practiceEventId] : []
}

export function linkableGamePlanActivities(gameId, gameDate, events) {
  const [year, month, day] = (gameDate || '').split('-').map(Number)
  const cutoff = gameDate ? new Date(year, month - 1, day - 14) : null
  const cutoffDate = cutoff ? `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}` : ''
  return events
    .filter((event) => (!gameDate || event.eventDate <= gameDate) && (!cutoffDate || event.eventDate >= cutoffDate) && !event.gamePlanIds?.includes(gameId))
    .sort((left, right) => {
      const leftDateTime = `${left.eventDate}T${left.startTime || ''}`
      const rightDateTime = `${right.eventDate}T${right.startTime || ''}`
      return rightDateTime.localeCompare(leftDateTime) || (left.name || '').localeCompare(right.name || '')
    })
}

export function gamePreparation(gameId, books, events, reports) {
  const activities = events.filter((event) => event.gamePlanIds?.includes(gameId))
    .sort((left, right) => `${left.eventDate}T${left.startTime || '23:59'}`.localeCompare(`${right.eventDate}T${right.startTime || '23:59'}`))
  const practiceIds = new Set(activities.filter((event) => event.eventType === 'Practice').map((event) => event.id))
  return {
    activities,
    installs: books.filter((book) => book.gamePlanId === gameId && book.gameCardId?.endsWith('-installs')),
    scripts: books.filter((book) => book.gameCardId?.endsWith('-scout') && (linkedPracticeEventIds(book).length
      ? linkedPracticeEventIds(book).some((eventId) => practiceIds.has(eventId)) : book.gamePlanId === gameId)),
    reports,
  }
}

export function nextPreparationActivity(activities, now = new Date()) {
  return activities.find((event) => new Date(`${event.eventDate}T${event.startTime || '23:59'}`) >= now) || null
}

export function playEntryCount(record) {
  return record.gameCardId?.endsWith('-installs') ? record.installPlays?.length || 0 : record.playCount || 0
}

export function scoutPlayName(row) {
  const offense = [row.offFormation, row.offPlay]
    .map((value) => value?.trim())
    .filter(Boolean)
  const defense = [row.defFront, row.defCoverage]
    .map((value) => value?.trim())
    .filter(Boolean)
  const nameParts = [...offense]
  if (offense.length && defense.length) nameParts.push('vs')
  nameParts.push(...defense)
  return nameParts.join(' ') || 'New Scout Play'
}