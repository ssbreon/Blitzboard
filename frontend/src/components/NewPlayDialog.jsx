import { useState } from 'react'
import { DEFAULT_GAME_TYPE, DEFAULT_PLAY_TEMPLATE, getTemplatesForGameType, PLAY_TEMPLATES } from '../utils/formations'
import { DEFAULT_THEME_ID, PLAY_THEMES } from '../utils/themes'
import { DEFAULT_FIELD_ZONE, FIELD_ZONES } from '../utils/playGeometry'

export const OFFENSE_PLAY_CATEGORIES = ['Formation', 'Shift/Motion', 'Run', 'Pass', 'Play-Action Pass', 'RPO', 'Gadget', 'Generic']
export const PLAY_CATEGORIES = ['Front', 'Stunt', 'Blitz', 'Coverage', 'Play Call']
export const SPECIAL_TEAMS_PLAY_CATEGORIES = ['Kickoff', 'Kick Return', 'Punt', 'Punt Return', 'Field Goal', 'Extra Point', 'Generic']
export function playCategoriesForCollection(category) {
  if (category === 'Offense') return OFFENSE_PLAY_CATEGORIES
  if (category === 'Special Teams') return SPECIAL_TEAMS_PLAY_CATEGORIES
  return PLAY_CATEGORIES
}
export const FIELD_DECORATIONS = ['None', 'Hash Marks', 'Hash Marks and Numbers']
const DEFAULT_FIELD_DECORATION = FIELD_DECORATIONS[2]
const DEFAULT_PLAY_NAME = 'New Play'
export const FIELD_ORIENTATIONS = ['High School', 'NCAA', 'NFL']

function gameTypeLabel(gameType) {
  return gameType.split('_').map((part, index) => index === 0 ? part : `${part[0].toUpperCase()}${part.slice(1)}`).join(' ')
}

export function NewPlayDialog({ open, titleLabel, titleIcon: TitleIcon, onCancel, onCreate, defaultTheme = DEFAULT_THEME_ID, defaultFieldOrientation = FIELD_ORIENTATIONS[0], categoryOptions = PLAY_CATEGORIES }) {
  const [name, setName] = useState(DEFAULT_PLAY_NAME)
  const [gameType, setGameType] = useState(DEFAULT_GAME_TYPE)
  const [templateId, setTemplateId] = useState(DEFAULT_PLAY_TEMPLATE.id)
  const [category, setCategory] = useState(categoryOptions[0])
  const [fieldDecoration, setFieldDecoration] = useState(DEFAULT_FIELD_DECORATION)
  const [fieldZone, setFieldZone] = useState(DEFAULT_FIELD_ZONE)
  const [fieldOrientation, setFieldOrientation] = useState(defaultFieldOrientation)
  const [themeId, setThemeId] = useState(defaultTheme)

  if (!open) return null

  function handleSubmit(event) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate(trimmed, gameType, templateId, themeId, category, fieldDecoration, fieldOrientation, fieldZone)
    setName(DEFAULT_PLAY_NAME)
    setGameType(DEFAULT_GAME_TYPE)
    setTemplateId(DEFAULT_PLAY_TEMPLATE.id)
    setCategory(categoryOptions[0])
    setFieldDecoration(DEFAULT_FIELD_DECORATION)
    setFieldZone(DEFAULT_FIELD_ZONE)
    setFieldOrientation(defaultFieldOrientation)
    setThemeId(defaultTheme)
  }

  function handleCancel() {
    setName(DEFAULT_PLAY_NAME)
    setGameType(DEFAULT_GAME_TYPE)
    setTemplateId(DEFAULT_PLAY_TEMPLATE.id)
    setCategory(categoryOptions[0])
    setFieldDecoration(DEFAULT_FIELD_DECORATION)
    setFieldZone(DEFAULT_FIELD_ZONE)
    setFieldOrientation(defaultFieldOrientation)
    setThemeId(defaultTheme)
    onCancel()
  }

  return (
    <div className="dialog-overlay" onClick={handleCancel}>
      <form className="dialog-panel" onClick={(event) => event.stopPropagation()} onSubmit={handleSubmit}>
        <h2>{TitleIcon && <TitleIcon size={26} strokeWidth={1.8} aria-hidden="true" />}{titleLabel}</h2>
        <label className="dialog-field">
          <span>Name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
            required
          />
        </label>
        <label className="dialog-field">
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="dialog-field">
          <span>Field Decoration</span>
          <select value={fieldDecoration} onChange={(event) => setFieldDecoration(event.target.value)}>
            {FIELD_DECORATIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="dialog-field">
          <span>Field Zone</span>
          <select value={fieldZone} onChange={(event) => setFieldZone(event.target.value)}>
            {FIELD_ZONES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="dialog-field">
          <span>Field Orientation</span>
          <select value={fieldOrientation} onChange={(event) => setFieldOrientation(event.target.value)}>
            {FIELD_ORIENTATIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="dialog-field">
          <span>Game Type</span>
          <select
            value={gameType}
            onChange={(event) => {
              const nextGameType = event.target.value
              setGameType(nextGameType)
              setTemplateId(getTemplatesForGameType(nextGameType)[0].id)
            }}
          >
            {Object.keys(PLAY_TEMPLATES).map((option) => (
              <option key={option} value={option}>
                {gameTypeLabel(option)}
              </option>
            ))}
          </select>
        </label>
        <label className="dialog-field">
          <span>Template</span>
          <select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
            {Object.entries(PLAY_TEMPLATES[gameType] || {}).map(([family, templates]) => (
              <optgroup key={family} label={templates[0].formationFamilyLabel}>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="dialog-field">
          <span>Theme</span>
          <select value={themeId} onChange={(event) => setThemeId(event.target.value)}>
            {PLAY_THEMES.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.label}
              </option>
            ))}
          </select>
        </label>
        <div className="dialog-actions">
          <button type="button" className="dialog-cancel" onClick={handleCancel}>
            Cancel
          </button>
          <button type="submit" className="dialog-create">
            Create
          </button>
        </div>
      </form>
    </div>
  )
}
