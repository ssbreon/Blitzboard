import { useEffect, useState } from 'react'
import { SlidersHorizontal, UserRound } from 'lucide-react'
import { DEFAULT_GAME_TYPE } from '../../utils/formations'
import { AccountDialog } from './AccountDialog'
import { AccountTabs } from './AccountTabs'
import { DefaultsFields } from './DefaultsFields'

const PROFILE_TABS = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'defaults', label: 'My Defaults', icon: SlidersHorizontal },
]

export function ProfileView({ user, workspace, api, onUserUpdated, onGuardChange, onDismiss, onSaved }) {
  const [form, setForm] = useState(() => ({ name: user.name || '', coachingTitle: user.coachingTitle || '' }))
  const [savedForm, setSavedForm] = useState(form)
  const [defaults, setDefaults] = useState(() => ({ theme: 'color', fieldOrientation: 'High School', gameType: DEFAULT_GAME_TYPE, ...user.preferences }))
  const [savedDefaults, setSavedDefaults] = useState(defaults)
  const [tab, setTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState('')
  const formDirty = JSON.stringify(form) !== JSON.stringify(savedForm)
  const defaultsDirty = JSON.stringify(defaults) !== JSON.stringify(savedDefaults)
  const dirty = formDirty || defaultsDirty

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
      const updatedUser = { ...user }
      if (formDirty) Object.assign(updatedUser, await api.updateProfile(form))
      if (defaultsDirty) updatedUser.preferences = await api.updatePreferences(defaults)
      onUserUpdated(updatedUser)
      if (defaultsDirty) setSavedDefaults(defaults)
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

  return <AccountDialog view="profile" workspace={workspace} onDismiss={onDismiss} saving={saving} error={error} notice={notice}>
    <AccountTabs tabs={PROFILE_TABS} activeTab={tab} onChange={setTab} idPrefix="account-profile" label="Profile sections" className="account-settings-tabs" />
    <form className="account-form" onSubmit={save}>
      <fieldset disabled={saving}>
        <div id="account-profile-panel-profile" role="tabpanel" aria-labelledby="account-profile-tab-profile" hidden={tab !== 'profile'}>
          <label className="dialog-field"><span>Display name</span><input required maxLength={120} value={form.name} onChange={(event) => change('name', event.target.value)} /></label>
          <label className="dialog-field"><span>Coaching title</span><input maxLength={120} value={form.coachingTitle} onChange={(event) => change('coachingTitle', event.target.value)} /></label>
          <label className="dialog-field"><span>Email</span><input value={user.email || ''} placeholder="Not configured" readOnly /></label>
          <label className="dialog-field"><span>Email verification</span><input value={user.email ? (user.emailVerified ? 'Verified' : 'Not verified') : 'Unavailable'} readOnly /></label>
        </div>
        <div id="account-profile-panel-defaults" role="tabpanel" aria-labelledby="account-profile-tab-defaults" hidden={tab !== 'defaults'}>
          <DefaultsFields values={defaults} onChange={(key, value) => setDefaults((current) => ({ ...current, [key]: value }))} />
        </div>
      </fieldset>
      <div className="account-form-actions">
        <button type="button" className="dialog-cancel secondary-button" disabled={saving} onClick={() => onDismiss?.()}>Cancel</button>
        <button type="submit" className="dialog-create primary-button" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  </AccountDialog>
}