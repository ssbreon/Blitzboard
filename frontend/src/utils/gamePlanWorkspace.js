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
    practiceEventId: event.id,
  }
}

export function gamePreparation(gameId, books, events, reports) {
  const activities = events.filter((event) => event.gamePlanIds?.includes(gameId))
    .sort((left, right) => `${left.eventDate}T${left.startTime || '23:59'}`.localeCompare(`${right.eventDate}T${right.startTime || '23:59'}`))
  const practiceIds = new Set(activities.filter((event) => event.eventType === 'Practice').map((event) => event.id))
  return {
    activities,
    installs: books.filter((book) => book.gamePlanId === gameId && book.gameCardId?.endsWith('-installs')),
    scripts: books.filter((book) => book.gameCardId?.endsWith('-scout') && (book.practiceEventId
      ? practiceIds.has(book.practiceEventId) : book.gamePlanId === gameId)),
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
  return [row.offFormation, row.offPlay, row.defFront, row.defCoverage]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(' ') || 'New Scout Play'
}