import { useEffect, useState } from 'react'
import { List, SlidersHorizontal, Target } from 'lucide-react'
import { SCOUTING_TEMPLATE_GROUPS } from '../../utils/scoutingTemplates'
import { AccountDialog } from './AccountDialog'
import { AccountTabs } from './AccountTabs'
import { DefaultsFields } from './DefaultsFields'

const SETTINGS_TABS = [
  { id: 'defaults', label: 'Defaults', icon: SlidersHorizontal },
  { id: 'suggestions', label: 'Suggestion Lists', icon: List },
  { id: 'scouting', label: 'Scouting', icon: Target },
]
const SUGGESTION_FIELDS = [
  { id: 'location', label: 'Location' },
  { id: 'period', label: 'Period' },
  { id: 'offFormation', label: 'OFF Formation' },
  { id: 'offPlay', label: 'OFF Play' },
  { id: 'defFront', label: 'DEF Front' },
  { id: 'defStunt', label: 'DEF Stunt' },
  { id: 'defCoverage', label: 'DEF Coverage' },
]
const SCOUTING_TEMPLATE_COUNT = SCOUTING_TEMPLATE_GROUPS.reduce((count, group) => count + group.templates.length, 0)
const DEFAULT_SCOUTING_TEMPLATE = SCOUTING_TEMPLATE_GROUPS[0].templates[0].id
const normalizeScoutingTendencies = (value) => typeof value === 'string'
  ? { [DEFAULT_SCOUTING_TEMPLATE]: value }
  : value && typeof value === 'object' && !Array.isArray(value) ? value : {}

export function SettingsView({ workspace, api, onWorkspaceUpdated, onGuardChange, onDismiss, onSaved }) {
  const [form, setForm] = useState(() => ({ ...workspace.defaults }))
  const [savedForm, setSavedForm] = useState(form)
  const [tab, setTab] = useState(workspace.kind === 'team' ? 'defaults' : 'suggestions')
  const [suggestionField, setSuggestionField] = useState('location')
  const [scoutingTemplate, setScoutingTemplate] = useState(DEFAULT_SCOUTING_TEMPLATE)
  const [suggestionTexts, setSuggestionTexts] = useState(() => Object.fromEntries(SUGGESTION_FIELDS.map(({ id }) => [id, (workspace.suggestionLists?.[id] || []).join('\n')])))
  const [savedSuggestionTexts, setSavedSuggestionTexts] = useState(suggestionTexts)
  const [scoutingTendencies, setScoutingTendencies] = useState(() => normalizeScoutingTendencies(workspace.scoutingTendencies))
  const [savedScoutingTendencies, setSavedScoutingTendencies] = useState(scoutingTendencies)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState('')
  const formDirty = JSON.stringify(form) !== JSON.stringify(savedForm)
  const suggestionDirty = JSON.stringify(suggestionTexts) !== JSON.stringify(savedSuggestionTexts)
  const scoutingDirty = JSON.stringify(scoutingTendencies) !== JSON.stringify(savedScoutingTendencies)
  const dirty = formDirty || suggestionDirty || scoutingDirty
  const canManage = Boolean(workspace.permissions?.includes('workspace.settings'))
  const tabs = workspace.kind === 'team' ? SETTINGS_TABS : SETTINGS_TABS.filter((item) => item.id !== 'defaults')
  const selectedField = SUGGESTION_FIELDS.find(({ id }) => id === suggestionField)?.label || 'Field'

  async function save(event) {
    event?.preventDefault()
    if (!dirty) {
      onSaved?.()
      return true
    }
    setSaving(true)
    setError(null)
    setNotice('')
    try {
      const updates = {}
      if (suggestionDirty) updates.suggestionLists = Object.fromEntries(SUGGESTION_FIELDS.map(({ id }) => [
        id, [...new Set((suggestionTexts[id] || '').split(/\r?\n/).map((value) => value.trim()).filter(Boolean))],
      ]))
      if (scoutingDirty) updates.scoutingTendencies = scoutingTendencies
      if (formDirty) updates.defaults = form
      const updated = await api.updateWorkspace(updates)
      onWorkspaceUpdated(updated)
      if (suggestionDirty) {
        const normalized = Object.fromEntries(SUGGESTION_FIELDS.map(({ id }) => [id, updates.suggestionLists[id].join('\n')]))
        setSuggestionTexts(normalized)
        setSavedSuggestionTexts(normalized)
      }
      if (scoutingDirty) setSavedScoutingTendencies(scoutingTendencies)
      setSavedForm(form)
      setNotice('Saved')
      onSaved?.()
      return true
    } catch (failure) {
      setError(failure)
      return false
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    onGuardChange({ dirty, saving, canSave: true, save })
    return () => onGuardChange(null)
  })

  function change(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
    setNotice('')
  }

  return <AccountDialog view="settings" workspace={workspace} onDismiss={onDismiss} saving={saving} error={error} notice={notice} className={tab === 'defaults' ? 'account-preferences-dialog' : tab === 'suggestions' ? 'account-suggestions-dialog' : 'account-scouting-dialog'}>
    <AccountTabs tabs={tabs} activeTab={tab} onChange={setTab} idPrefix="account-settings" label="Settings sections" className="account-settings-tabs" />
    <form className="account-form" onSubmit={save}>
      <fieldset disabled={saving || !canManage}>
        {workspace.kind === 'team' && <div id="account-settings-panel-defaults" role="tabpanel" aria-labelledby="account-settings-tab-defaults" hidden={tab !== 'defaults'}>
          <DefaultsFields values={form} onChange={change} />
        </div>}
        <div id="account-settings-panel-suggestions" className="account-settings-suggestions" role="tabpanel" aria-labelledby="account-settings-tab-suggestions" hidden={tab !== 'suggestions'}>
          <label className="dialog-field account-settings-suggestion-fields"><span>Field</span>
            <select className="account-settings-suggestion-select" size={SUGGESTION_FIELDS.length} value={suggestionField} onChange={(event) => setSuggestionField(event.target.value)} disabled={!canManage}>
              {SUGGESTION_FIELDS.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          <label className="dialog-field account-settings-suggestion-editor"><span>Suggestions for {selectedField}</span>
            <textarea rows="8" value={suggestionTexts[suggestionField] || ''} onChange={(event) => {
              setSuggestionTexts((current) => ({ ...current, [suggestionField]: event.target.value }))
              setNotice('')
            }} disabled={!canManage} />
          </label>
        </div>
        <div id="account-settings-panel-scouting" className="account-settings-suggestions" role="tabpanel" aria-labelledby="account-settings-tab-scouting" hidden={tab !== 'scouting'}>
          <label className="dialog-field account-settings-suggestion-fields"><span>Scouting Template</span>
            <select className="account-settings-suggestion-select" size={SCOUTING_TEMPLATE_COUNT} value={scoutingTemplate} onChange={(event) => setScoutingTemplate(event.target.value)} disabled={!canManage}>
              {SCOUTING_TEMPLATE_GROUPS.map(({ id, label, templates }) => <optgroup key={id} label={label}>
                {templates.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}
              </optgroup>)}
            </select>
          </label>
          <label className="dialog-field account-settings-suggestion-editor"><span>Scouting Tendencies</span>
            <textarea rows="8" value={scoutingTendencies[scoutingTemplate] || ''} onChange={(event) => {
              setScoutingTendencies((current) => ({ ...current, [scoutingTemplate]: event.target.value }))
              setNotice('')
            }} disabled={!canManage} />
          </label>
        </div>
      </fieldset>
      <div className="account-form-actions">
        <button type="button" className="dialog-cancel secondary-button" disabled={saving} onClick={() => onDismiss?.()}>Cancel</button>
        <button type="submit" className="dialog-create primary-button" disabled={saving || !canManage}>{saving ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  </AccountDialog>
}