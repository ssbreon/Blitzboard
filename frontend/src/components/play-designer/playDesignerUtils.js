import { normalizeDrawings, normalizeTextAnnotations, normalizeZones } from '../../utils/playGeometry.js'
import { normalizeThemeId } from '../../utils/themes.js'

// Convert a game-type identifier into a readable label.
export function gameTypeLabel(gameType) {
  return gameType.split('_').map((part, index) => index === 0 ? part : `${part[0].toUpperCase()}${part.slice(1)}`).join(' ')
}

// Resolve an adjustment's design fields against its base-play defaults.
export function adjustmentDesign(slide, fallback) {
  return {
    markers: Array.isArray(slide.markers) ? slide.markers : fallback.markers,
    drawings: normalizeDrawings(slide.drawings || fallback.drawings),
    textAnnotations: normalizeTextAnnotations(slide.textAnnotations || fallback.textAnnotations),
    zones: normalizeZones(slide.zones || fallback.zones),
    templateId: slide.template || fallback.templateId,
    category: slide.category || fallback.category,
    fieldDecoration: slide.fieldDecoration || fallback.fieldDecoration,
    fieldOrientation: slide.fieldOrientation || fallback.fieldOrientation,
    fieldZone: slide.fieldZone || fallback.fieldZone,
    perspective: slide.perspective || fallback.perspective,
    theme: normalizeThemeId(slide.theme || fallback.theme),
    showAssignments: true,
  }
}
