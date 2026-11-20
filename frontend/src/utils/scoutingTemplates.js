export const SCOUTING_TEMPLATE_GROUPS = [
  { id: 'offense', label: 'OFFENSE', unit: 'Offense', templates: [
    { id: 'offense.formation', label: 'Formation' },
    { id: 'offense.down-distance', label: 'Down & Distance' },
    { id: 'offense.field-position', label: 'Field Position' },
    { id: 'offense.game-situation', label: 'Game Situation' },
    { id: 'offense.concepts', label: 'Concepts' },
  ] },
  { id: 'defense', label: 'DEFENSE', unit: 'Defense', templates: [
    { id: 'defense.fronts', label: 'Fronts' },
    { id: 'defense.down-distance', label: 'Down & Distance' },
    { id: 'defense.field-position', label: 'Field Position' },
    { id: 'defense.game-situation', label: 'Game Situation' },
    { id: 'defense.coverages-pressures', label: 'Coverages & Pressures' },
  ] },
  { id: 'special-teams', label: 'SPECIAL TEAMS', unit: 'Special Teams', templates: [
    { id: 'special-teams.situations', label: 'Situations' },
    { id: 'special-teams.formations', label: 'Formations' },
    { id: 'special-teams.direction-placement', label: 'Direction & Placement' },
    { id: 'special-teams.returns', label: 'Returns' },
    { id: 'special-teams.fakes-specials', label: 'Fakes & Specials' },
  ] },
]

export function scoutingTemplatesForUnit(unit) {
  return SCOUTING_TEMPLATE_GROUPS.find((group) => group.unit === unit)?.templates || []
}

export function scoutingTendencyRows(templateId, tendencies) {
  const savedTendencies = typeof tendencies === 'string'
    ? { 'offense.formation': tendencies }
    : tendencies || {}
  const text = typeof savedTendencies[templateId] === 'string' ? savedTendencies[templateId] : ''
  return text.split(/\r?\n/).map((tendency, index) => ({
    id: `${templateId}-${index + 1}`,
    tendency: tendency.trim(),
    notes: '',
  })).filter((row) => row.tendency)
}