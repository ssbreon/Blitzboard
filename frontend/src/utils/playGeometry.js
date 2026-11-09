/*
 * Blitzboard Studio
 * Copyright (c) 2027 Breon Technologies LLC
 * All Rights Reserved
 */
// Shared field geometry used by both the interactive designer and the read-only print renderer.

// Fixed on-screen size (px) for the block tool's perpendicular endcap, independent of field scaling.
export const TBAR_LENGTH_PX = 14
export const TBAR_THICKNESS_PX = 3

// Fixed on-screen size (px) for route/blitz/coverage arrowheads, independent of field scaling.
export const ARROW_LENGTH_PX = 13
export const ARROW_WIDTH_PX = 11
export const BLITZ_FIRST_SEGMENT_DASH = '6 4'
export const MOTION_ZIGZAG_STEP_PX = 8
export const MOTION_ZIGZAG_AMPLITUDE_PX = 3

const FIELD_WIDTH_FEET = 160
const SIDELINE_HASH_MARK_PERCENT = 0
const HASH_MARK_DISTANCE_FEET = {
  'High School': 53 + 4 / 12,
  NCAA: 60,
  NFL: 70 + 9 / 12,
}
const YARD_NUMBER_HEIGHT_FEET = 6
// Distance from the sideline to the bottom edge of the painted yard numbers. NFL numbers sit
// further from the sideline (bottom edge 36ft out) than NCAA/NFHS numbers (bottom edge 21ft out).
const YARD_NUMBER_BOTTOM_EDGE_FEET = {
  'High School': 21,
  NCAA: 21,
  NFL: 36,
}

export function hashMarkXPositions(fieldOrientation) {
  const feet = HASH_MARK_DISTANCE_FEET[fieldOrientation] || HASH_MARK_DISTANCE_FEET['High School']
  const percent = (feet / FIELD_WIDTH_FEET) * 100
  return [SIDELINE_HASH_MARK_PERCENT, percent, 100 - percent, 100 - SIDELINE_HASH_MARK_PERCENT]
}

// Horizontal position (percent from each sideline) of the yard numbers, centered on the painted
// number's footprint for the given field orientation (NFL numbers sit closer to midfield).
export function yardNumberXPositions(fieldOrientation) {
  const bottomEdgeFeet = YARD_NUMBER_BOTTOM_EDGE_FEET[fieldOrientation] ?? YARD_NUMBER_BOTTOM_EDGE_FEET['High School']
  const centerFeet = bottomEdgeFeet + YARD_NUMBER_HEIGHT_FEET / 2
  const percent = (centerFeet / FIELD_WIDTH_FEET) * 100
  return [percent, 100 - percent]
}

// Field Zone determines where the line of scrimmage sits on the full field (yards measured from
// the defense's goal line at 0 to the offense's goal line at 100) when yard numbers are shown.
export const FIELD_ZONES = ['Green Zone', 'Yellow Zone', 'Red Zone', 'Gold Zone']
export const DEFAULT_FIELD_ZONE = FIELD_ZONES[0]
export const PLAY_PERSPECTIVES = ['Offense on Top', 'Offense on bottom']
export const DEFAULT_PLAY_PERSPECTIVE = PLAY_PERSPECTIVES[0]

export function defaultPlayPerspective(category) {
  return ['Offense', 'Kickoff', 'Punt', 'PAT/FG', 'Onside Kick'].includes(category)
    ? PLAY_PERSPECTIVES[1]
    : PLAY_PERSPECTIVES[0]
}

function screenFieldPercent(percent, perspective) {
  return perspective === PLAY_PERSPECTIVES[0] ? 100 - percent : percent
}

const FIELD_LENGTH_YARDS = 100
const END_ZONE_YARDS = 10
const WINDOW_YARDS = 40 // standard window; the field background paints one band per 5 yards
const YARD_BAND_YARDS = 5

// Kicking plays show from just behind the kicking spot to the receiving team's goal line.
export const KICKING_PLAY_CATEGORIES = ['Kickoff', 'Kickoff Return', 'Punt', 'Punt Return', 'Onside Kick', 'Hands Team']
const KICKOFF_PLAY_CATEGORIES = new Set(['Kickoff', 'Kickoff Return', 'Onside Kick', 'Hands Team'])
// Kicking team's own yard line for the kickoff spot, by level (Field Orientation).
const KICKOFF_SPOT_YARD_LINE = {
  'High School': 40,
  NCAA: 35,
  NFL: 35,
}
const KICKING_WINDOW_BEHIND_LOS_YARDS = 15
const KICKING_WINDOW_END_ZONE_YARDS = 5

const FIELD_ZONE_LOS_YARDS = {
  'Green Zone': 60, // offense's own 40 yard line
  'Yellow Zone': FIELD_LENGTH_YARDS - 5, // offense's own 5 yard line
  'Red Zone': 15, // defense's 15 yard line
  'Gold Zone': 5, // defense's 5 yard line
}

const FIELD_ZONE_WINDOW_YARDS = {
  'Green Zone': { defenseSide: 25, offenseSide: 15 },
  'Red Zone': { defenseSide: 25, offenseSide: 15 },
}

export function fieldZoneLosYards(fieldZone) {
  return FIELD_ZONE_LOS_YARDS[fieldZone] ?? FIELD_ZONE_LOS_YARDS[DEFAULT_FIELD_ZONE]
}

// Computes the visible 40-yard window (absolute field yards, defense goal line = 0) for a Field
// Zone. The line of scrimmage stays centered unless that would reveal space beyond the end
// zones, in which case the window shifts just enough to stay within the playable field.
export function fieldWindowForZone(fieldZone, perspective = DEFAULT_PLAY_PERSPECTIVE) {
  const los = fieldZoneLosYards(fieldZone)
  const minTop = -END_ZONE_YARDS
  const maxBottom = FIELD_LENGTH_YARDS + END_ZONE_YARDS
  const zoneWindow = FIELD_ZONE_WINDOW_YARDS[fieldZone]
  let top = los - (zoneWindow?.defenseSide ?? WINDOW_YARDS / 2)
  let bottom = los + (zoneWindow?.offenseSide ?? WINDOW_YARDS / 2)
  if (top < minTop) {
    bottom += minTop - top
    top = minTop
  } else if (bottom > maxBottom) {
    top -= bottom - maxBottom
    bottom = maxBottom
  }
  return buildFieldWindow(top, bottom, los, perspective)
}

function buildFieldWindow(top, bottom, los, perspective) {
  const yards = bottom - top
  return { top, bottom, los, yards, losPercent: screenFieldPercent(((los - top) / yards) * 100, perspective) }
}

// Kicking categories extend the window from behind the kicking spot to the receiving end zone;
// kickoffs use the level's kickoff spot while punts use the Field Zone line of scrimmage.
export function fieldWindowForPlay(play = {}, perspective = DEFAULT_PLAY_PERSPECTIVE) {
  if (!KICKING_PLAY_CATEGORIES.includes(play.category)) return fieldWindowForZone(play.fieldZone, perspective)
  const los = KICKOFF_PLAY_CATEGORIES.has(play.category)
    ? FIELD_LENGTH_YARDS - (KICKOFF_SPOT_YARD_LINE[play.fieldOrientation] ?? KICKOFF_SPOT_YARD_LINE['High School'])
    : fieldZoneLosYards(play.fieldZone)
  const top = -KICKING_WINDOW_END_ZONE_YARDS
  const bottom = Math.min(los + KICKING_WINDOW_BEHIND_LOS_YARDS, FIELD_LENGTH_YARDS + END_ZONE_YARDS)
  if (bottom - top <= WINDOW_YARDS) return fieldWindowForZone(play.fieldZone, perspective)
  return buildFieldWindow(top, bottom, los, perspective)
}

export function isExtendedFieldWindow(window) {
  return window.yards > WINDOW_YARDS
}

// Narrows the field so a longer window keeps the standard window's yards-per-pixel proportions.
export function fieldWindowStyle(window) {
  if (!isExtendedFieldWindow(window)) return {}
  return {
    '--field-width-scale': WINDOW_YARDS / window.yards,
    '--field-band-size': `${(YARD_BAND_YARDS / window.yards) * 100}%`,
  }
}

export function fieldWidthScale(window) {
  return isExtendedFieldWindow(window) ? WINDOW_YARDS / window.yards : 1
}

// Re-positions markers laid out for the standard Green Zone window (top-perspective percents)
// so they keep the same yardage from the line of scrimmage inside another window.
export function fitMarkersToWindow(markers, window) {
  if (!isExtendedFieldWindow(window)) return markers
  const reference = fieldWindowForZone(DEFAULT_FIELD_ZONE, PLAY_PERSPECTIVES[0])
  return markers.map((marker) => {
    const yardsFromLos = reference.top + ((100 - marker.y) / 100) * reference.yards - reference.los
    const yard = window.los + yardsFromLos
    return { ...marker, y: 100 - ((yard - window.top) / window.yards) * 100 }
  })
}

// Yard-line markers (0..100 in 10-yard steps) visible within the window, using standard football
// numbering counted from the nearer goal line. Goal lines are labeled "G"; every other marker
// points an arrow toward its nearer goal line (none at midfield, where both are equidistant).
export function yardNumbersForWindow(window, perspective = DEFAULT_PLAY_PERSPECTIVE) {
  const numbers = []
  for (let yard = 0; yard <= FIELD_LENGTH_YARDS; yard += 10) {
    if (yard < window.top || yard > window.bottom) continue
    const isGoalLine = yard === 0 || yard === FIELD_LENGTH_YARDS
    const label = isGoalLine ? 'G' : yard <= 50 ? yard : FIELD_LENGTH_YARDS - yard
    let arrow = isGoalLine || yard === 50 ? null : yard < 50 ? 'up' : 'down'
    if (perspective === PLAY_PERSPECTIVES[0] && arrow) arrow = arrow === 'up' ? 'down' : 'up'
    const percent = ((yard - window.top) / window.yards) * 100
    numbers.push({ yard, percent: screenFieldPercent(percent, perspective), label, arrow })
  }
  return numbers
}

// Un-hashed, un-numbered end zone bands visible within the window, as top/height percentages.
export function endZoneBandsForWindow(window, perspective = DEFAULT_PLAY_PERSPECTIVE) {
  const bands = []
  const candidates = [
    { start: -END_ZONE_YARDS, end: 0 },
    { start: FIELD_LENGTH_YARDS, end: FIELD_LENGTH_YARDS + END_ZONE_YARDS },
  ]
  for (const band of candidates) {
    const start = Math.max(band.start, window.top)
    const end = Math.min(band.end, window.bottom)
    if (end > start) {
      const top = ((start - window.top) / window.yards) * 100
      const height = ((end - start) / window.yards) * 100
      bands.push({ top: perspective === PLAY_PERSPECTIVES[0] ? 100 - top - height : top, height })
    }
  }
  return bands
}

export function goalLinePositionsForWindow(window, perspective = DEFAULT_PLAY_PERSPECTIVE) {
  return [0, FIELD_LENGTH_YARDS]
    .filter((yard) => yard >= window.top && yard <= window.bottom)
    .map((yard) => screenFieldPercent(((yard - window.top) / window.yards) * 100, perspective))
}

// One hash-mark tick per yard on the playable field (excludes end zones and 5-yard lines).
export function hashMarkYPositionsForWindow(window, perspective = DEFAULT_PLAY_PERSPECTIVE) {
  const positions = []
  const first = Math.ceil(Math.max(window.top, 0))
  const last = Math.min(window.bottom, FIELD_LENGTH_YARDS)
  for (let yard = first; yard <= last; yard += 1) {
    if (yard % YARD_BAND_YARDS === 0) continue
    positions.push(screenFieldPercent(((yard - window.top) / window.yards) * 100, perspective))
  }
  return positions
}

export const DRAWING_TOOLS = [
  { id: 'select', label: 'Select' },
  { id: 'block', label: 'Block', color: '#ef9a00', dash: null, arrow: false, endCap: 'tbar' },
  { id: 'dtb', label: 'DTB', color: '#ef9a00', dash: '2 4', arrow: false, endCap: 'tbar' },
  { id: 'route', label: 'Route', color: '#1d4ed8', dash: null, arrow: true },
  { id: 'blitz', label: 'Blitz', color: '#b91c1c', dash: null, arrow: true },
  { id: 'coverage', label: 'Coverage', color: '#7c3aed', dash: '2 10', arrow: true },
  { id: 'motion', label: 'Motion', color: '#374151', dash: null, arrow: false, endCap: 'motion' },
  { id: 'line', label: 'Line', color: '#ffffff', dash: null, arrow: false },
]

export const EMPTY_DRAWINGS = { block: [], dtb: [], route: [], blitz: [], coverage: [], motion: [], line: [] }

export function normalizeDrawings(source) {
  return { ...EMPTY_DRAWINGS, ...(source || {}) }
}

export function normalizeTextAnnotations(source) {
  return Array.isArray(source) ? source : []
}

export const ZONE_FILLS = [
  { id: 'red', label: 'Light red', color: 'rgba(248, 113, 113, 0.35)' },
  { id: 'green', label: 'Light green', color: 'rgba(134, 239, 172, 0.4)' },
  { id: 'blue', label: 'Light blue', color: 'rgba(96, 165, 250, 0.4)' },
  { id: 'transparent', label: 'Transparent', color: 'transparent' },
]

export const ZONE_SHAPES = [
  { id: 'oval', label: 'Oval' },
  { id: 'rectangle', label: 'Rectangle' },
]

export const DEFAULT_ZONE_FILL = 'transparent'
export const MIN_ZONE_SIZE = 4

export function normalizeZones(source) {
  return Array.isArray(source) ? source : []
}

export function zoneFillColor(zone) {
  return (ZONE_FILLS.find((fill) => fill.id === zone.fill) || ZONE_FILLS.find((fill) => fill.id === DEFAULT_ZONE_FILL)).color
}

// Zones are stored as a center point plus width/height, all in field percent coordinates.
export function zoneBoxStyle(zone) {
  return {
    left: `${zone.x - zone.width / 2}%`,
    top: `${zone.y - zone.height / 2}%`,
    width: `${zone.width}%`,
    height: `${zone.height}%`,
  }
}

export function toolColor(tool, theme) {
  return theme.strokeColor || tool.color
}

export function toolDash(tool, theme, drawing) {
  if (tool.id === 'line') {
    const spacing = Number.isFinite(drawing?.dashSpacing) ? Math.min(20, Math.max(2, drawing.dashSpacing)) : 4
    if (drawing?.lineStyle === 'dashed') return `6 ${spacing}`
    if (drawing?.lineStyle === 'dotted') return `0 ${spacing}`
    return null
  }
  return theme.toolDash && tool.id in theme.toolDash ? theme.toolDash[tool.id] : tool.dash
}

export function pathData(points) {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

export function drawingAnchor(drawing, drawings, markers, ancestors = new Set()) {
  if (!drawing) return null
  const identity = `${drawing.type}:${drawing.id}`
  if (ancestors.has(identity)) return null
  const nextAncestors = new Set(ancestors)
  nextAncestors.add(identity)

  if (drawing.motionId) {
    const motion = drawings.motion.find((item) => item.id === drawing.motionId)
    const motionAnchor = drawingAnchor(motion, drawings, markers, nextAncestors)
    const end = motion?.points.at(-1)
    return motionAnchor && end ? { x: motionAnchor.x + end.dx, y: motionAnchor.y + end.dy } : null
  }
  if (drawing.blockId) {
    const block = drawings.block.find((item) => item.id === drawing.blockId)
    const blockAnchor = drawingAnchor(block, drawings, markers, nextAncestors)
    const end = block?.points.at(-1)
    return blockAnchor && end ? { x: blockAnchor.x + end.dx, y: blockAnchor.y + end.dy } : null
  }
  if (drawing.type === 'line' || drawing.origin) return drawing.origin || null
  return markers.find((marker) => marker.id === drawing.anchorId)
}

export function drawingPoints(drawing, drawings, markers) {
  const anchor = drawingAnchor(drawing, drawings, markers)
  if (!anchor) return null
  return [
    { x: anchor.x, y: anchor.y },
    ...drawing.points.map((p) => ({ x: anchor.x + p.dx, y: anchor.y + p.dy })),
  ]
}

export function flattenDrawings(drawings) {
  return Object.entries(drawings).flatMap(([type, list]) => list.map((drawing) => ({ ...drawing, type })))
}

export function drawingIdsWithDependents(drawings, rootIds) {
  const removedIds = new Set(rootIds)
  let changed
  do {
    changed = false
    for (const drawing of flattenDrawings(drawings)) {
      if (!removedIds.has(drawing.id) && (removedIds.has(drawing.blockId) || removedIds.has(drawing.motionId))) {
        removedIds.add(drawing.id)
        changed = true
      }
    }
  } while (changed)
  return removedIds
}

export function removeDrawingDependents(drawings, rootIds) {
  const removedIds = drawingIdsWithDependents(drawings, rootIds)
  return Object.fromEntries(Object.entries(drawings).map(([type, list]) => [
    type,
    list.filter((drawing) => !removedIds.has(drawing.id)),
  ]))
}

export function motionPathPoints(points, fieldPxSize) {
  if (points.length < 2 || fieldPxSize.width <= 0 || fieldPxSize.height <= 0) return points
  const scaleX = fieldPxSize.width / 100
  const scaleY = fieldPxSize.height / 100
  const pixelPoints = points.map((point) => ({ x: point.x * scaleX, y: point.y * scaleY }))
  const zigzagPoints = [pixelPoints[0]]

  for (let segment = 1; segment < pixelPoints.length; segment += 1) {
    const start = pixelPoints[segment - 1]
    const end = pixelPoints[segment]
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.hypot(dx, dy)
    if (length === 0) continue
    const count = Math.max(2, Math.ceil(length / MOTION_ZIGZAG_STEP_PX))
    const normalX = -dy / length
    const normalY = dx / length

    for (let step = 1; step <= count; step += 1) {
      const progress = step / count
      const offset = step === count ? 0 : step % 2 === 1 ? MOTION_ZIGZAG_AMPLITUDE_PX : -MOTION_ZIGZAG_AMPLITUDE_PX
      zigzagPoints.push({
        x: start.x + dx * progress + normalX * offset,
        y: start.y + dy * progress + normalY * offset,
      })
    }
  }

  return zigzagPoints.map((point) => ({ x: point.x / scaleX, y: point.y / scaleY }))
}

export function fixedSizeEllipse(point, fieldPxSize, radiusPx) {
  if (!point || fieldPxSize.width <= 0 || fieldPxSize.height <= 0) return null
  return {
    cx: point.x,
    cy: point.y,
    rx: radiusPx / (fieldPxSize.width / 100),
    ry: radiusPx / (fieldPxSize.height / 100),
  }
}

// Computes a perpendicular cap segment (in field percent coordinates) that renders as a
// fixed-length, fixed-thickness line on screen regardless of the field's aspect ratio.
export function tbarCapPoints(points, fieldPxSize, sizeScale = 1) {
  if (points.length < 2) return null
  const end = points[points.length - 1]
  const prev = points[points.length - 2]
  const scaleX = fieldPxSize.width / 100
  const scaleY = fieldPxSize.height / 100
  const dxPx = (end.x - prev.x) * scaleX
  const dyPx = (end.y - prev.y) * scaleY
  const len = Math.hypot(dxPx, dyPx)
  if (len === 0) return null
  const perpXPx = (-dyPx / len) * (TBAR_LENGTH_PX * sizeScale / 2)
  const perpYPx = (dxPx / len) * (TBAR_LENGTH_PX * sizeScale / 2)
  return {
    x1: end.x + perpXPx / scaleX,
    y1: end.y + perpYPx / scaleY,
    x2: end.x - perpXPx / scaleX,
    y2: end.y - perpYPx / scaleY,
  }
}

// Computes an arrowhead triangle (in field percent coordinates) that renders at a fixed
// on-screen size regardless of the field's aspect ratio.
export function arrowCapPoints(points, fieldPxSize, sizeScale = 1) {
  if (points.length < 2) return null
  const end = points[points.length - 1]
  const prev = points[points.length - 2]
  const scaleX = fieldPxSize.width / 100
  const scaleY = fieldPxSize.height / 100
  const endPx = { x: end.x * scaleX, y: end.y * scaleY }
  const prevPx = { x: prev.x * scaleX, y: prev.y * scaleY }
  const dxPx = endPx.x - prevPx.x
  const dyPx = endPx.y - prevPx.y
  const len = Math.hypot(dxPx, dyPx)
  if (len === 0) return null
  const dirX = dxPx / len
  const dirY = dyPx / len
  const backX = endPx.x - dirX * ARROW_LENGTH_PX * sizeScale
  const backY = endPx.y - dirY * ARROW_LENGTH_PX * sizeScale
  const perpX = -dirY * (ARROW_WIDTH_PX * sizeScale / 2)
  const perpY = dirX * (ARROW_WIDTH_PX * sizeScale / 2)
  const toPercent = (px, py) => `${px / scaleX},${py / scaleY}`
  return [
    toPercent(endPx.x, endPx.y),
    toPercent(backX + perpX, backY + perpY),
    toPercent(backX - perpX, backY - perpY),
  ].join(' ')
}

export function textAnnotationStyle(annotation) {
  return {
    color: annotation.color,
    fontSize: annotation.fontSize ? `${annotation.fontSize}px` : undefined,
    fontWeight: annotation.bold ? 700 : undefined,
    fontStyle: annotation.italic ? 'italic' : undefined,
    textDecoration: annotation.underline ? 'underline' : undefined,
  }
}

let measureCanvas = null

export function textAnnotationWidth(annotation, fieldEl) {
  if (!measureCanvas) measureCanvas = document.createElement('canvas')
  const context = measureCanvas.getContext('2d')
  if (!context || !fieldEl) return 150
  const style = window.getComputedStyle(fieldEl)
  const fontSize = annotation.fontSize ? `${annotation.fontSize}px` : style.fontSize
  context.font = `${annotation.italic ? 'italic ' : ''}${annotation.bold ? '700 ' : ''}${fontSize} ${style.fontFamily}`
  if (!annotation.text) return 134
  const lineWidths = annotation.text.split('\n').map((line) => context.measureText(line).width)
  return Math.ceil(Math.max(...lineWidths))
}

// White and charcoal are handled as special guideline colors (white maps its decoration to
// charcoal for visibility) and are left out of the light-tint treatment below.
const SPECIAL_GUIDELINE_COLORS = new Set(['#ffffff', '#374151'])

// Mixes a hex color toward white to produce the lighter tint used for the non-solid portion of
// half-fill and vertical-line player decorations.
function lightenHexColor(hex, amount = 0.65) {
  const match = /^#([0-9a-f]{6})$/i.exec(hex || '')
  if (!match) return undefined
  const num = parseInt(match[1], 16)
  const mix = (channel) => Math.round(channel + (255 - channel) * amount)
  return `#${[num >> 16, num >> 8, num]
    .map((shifted) => mix(shifted & 0xff).toString(16).padStart(2, '0'))
    .join('')}`
}

// Shared by marker rendering and the decoration-option previews so both pick the same
// solid/light pairing for a given player color.
function decorationColors(color) {
  const normalized = color?.toLowerCase()
  const isSpecial = SPECIAL_GUIDELINE_COLORS.has(normalized)
  return {
    decorationColor: normalized === '#ffffff' ? '#374151' : color,
    lightColor: color && !isSpecial ? lightenHexColor(color) : undefined,
  }
}

export function markerStyleVars(marker, themeId) {
  const color = marker.color
  const { decorationColor, lightColor } = decorationColors(color)
  const usePrinterFriendlyNeutralColors = themeId === 'printerFriendly'
    && (marker.team || 'offense') === 'offense'
    && SPECIAL_GUIDELINE_COLORS.has(color?.toLowerCase())
  return {
    left: `${marker.x}%`,
    top: `${marker.y}%`,
    '--marker-color': color,
    ...(themeId === 'printerFriendly' && color
      ? { '--marker-override-border': '#000' }
      : {}),
    '--marker-decoration-color': usePrinterFriendlyNeutralColors ? '#374151' : decorationColor,
    '--marker-override-text': color?.toLowerCase() === '#ffffff' ? '#111' : '#fff',
    ...(usePrinterFriendlyNeutralColors
      ? { '--marker-decoration-light-color': '#fff' }
      : lightColor ? { '--marker-decoration-light-color': lightColor } : {}),
  }
}

// Style vars for the small decoration-option preview buttons, so they reflect the same
// solid/light color pairing a player's marker would render with.
export function decorationPreviewVars(color, themeId) {
  const { decorationColor, lightColor } = decorationColors(color)
  const usePrinterFriendlyNeutralColors = themeId === 'printerFriendly'
    && SPECIAL_GUIDELINE_COLORS.has(color?.toLowerCase())
  return {
    '--preview-color': usePrinterFriendlyNeutralColors ? '#374151' : decorationColor,
    ...(usePrinterFriendlyNeutralColors
      ? { '--preview-light-color': '#fff' }
      : lightColor ? { '--preview-light-color': lightColor } : {}),
  }
}
