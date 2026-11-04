export function assignmentTeam(parentCategory) {
  if (parentCategory === 'Offense') return 'offense'
  if (parentCategory === 'Defense') return 'defense'
  return null
}

export function assignmentPlayers(markers, parentCategory) {
  const team = assignmentTeam(parentCategory)
  if (!team) return []
  return (markers || []).filter((marker) => (marker.team || 'offense') === team)
}

export function updatePlayerAssignment(markers, markerId, assignment) {
  return markers.map((marker) => {
    if (marker.id !== markerId) return marker
    const updated = { ...marker }
    if (assignment) updated.assignment = assignment
    else delete updated.assignment
    return updated
  })
}

export function assignmentPrintPages(markers, parentCategory, { width, height }) {
  const charactersPerLine = Math.max(12, Math.floor((width - 160) / 8))
  const linesPerPage = Math.max(4, Math.floor((height - 110) / 18))
  const pages = []
  let rows = []
  let remaining = linesPerPage
  for (const [index, marker] of assignmentPlayers(markers, parentCategory).entries()) {
    if (typeof marker.assignment !== 'string' || !marker.assignment.trim()) continue
    const lines = marker.assignment.replace(/\r\n?/g, '\n').split('\n').flatMap((line) => {
      const characters = Array.from(line)
      if (characters.length === 0) return ['']
      const wrapped = []
      for (let offset = 0; offset < characters.length; offset += charactersPerLine) {
        wrapped.push(characters.slice(offset, offset + charactersPerLine).join(''))
      }
      return wrapped
    })
    let offset = 0
    while (offset < lines.length) {
      if (remaining < 2) {
        pages.push(rows)
        rows = []
        remaining = linesPerPage
      }
      const count = Math.min(lines.length - offset, remaining - 1)
      rows.push({ id: `${marker.id}-${offset}`, label: marker.label || `Player ${index + 1}`, text: lines.slice(offset, offset + count).join('\n'), continued: offset > 0 })
      offset += count
      remaining -= count + 1
    }
  }
  if (rows.length) pages.push(rows)
  return pages
}

export function assignmentPanelPosition(position, panel, viewport) {
  return {
    x: Math.max(12, Math.min(position.x, viewport.width - panel.width - 12)),
    y: Math.max(12, Math.min(position.y, viewport.height - panel.height - 12)),
  }
}