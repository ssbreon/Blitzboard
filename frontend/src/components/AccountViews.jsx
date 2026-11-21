/*
 * Blitzboard Studio
 * Copyright (c) 2027 Breon Technologies LLC
 * All Rights Reserved
 */
import { useEffect, useRef, useState } from 'react'
import { ArrowRightLeft, Building2, Copy, CreditCard, Gauge, List, LoaderCircle, Mail, SlidersHorizontal, Target, Trash2, Upload, Users, UserRound, Settings } from 'lucide-react'
import { DataGrid } from './DataGrid'
import { DialogCloseButton } from './DialogCloseButton'
import { ErrorDialog } from './ErrorDialog'
import { PLAY_THEMES } from '../utils/themes'
import { DEFAULT_GAME_TYPE, gameTypeLabel, PLAY_TEMPLATES } from '../utils/formations'
import { SCOUTING_TEMPLATE_GROUPS } from '../utils/scoutingTemplates'

const TITLES = { profile: 'Profile', settings: 'Settings', team: 'Team', billing: 'Membership & Billing' }
const ICONS = { profile: UserRound, settings: Settings, team: Users, billing: CreditCard }
const BILLING_TABS = [{ id: 'membership', label: 'Membership', icon: CreditCard }, { id: 'usage', label: 'Workspace Usage', icon: Gauge }]
const SETTINGS_TABS = [
  { id: 'defaults', label: 'Defaults', icon: SlidersHorizontal },
  { id: 'suggestions', label: 'Suggestion Lists', icon: List },
  { id: 'scouting', label: 'Scouting', icon: Target },
]
const PROFILE_TABS = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'defaults', label: 'My Defaults', icon: SlidersHorizontal },
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
const TEAM_TABS = [
  { id: 'workspace', label: 'Workspace', icon: Building2 },
  { id: 'staff', label: 'Staff', icon: UserRound },
  { id: 'invitations', label: 'Invitations', icon: Mail },
]
const LABELS = { playbooks: 'Playbooks', gamePlans: 'Games', plays: 'Plays', scoutPlays: 'Scouting plays' }
const PLAN_LABELS = { free: 'Free', individual: 'Personal', team: 'Team' }
const money = (cents) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
const date = (value, timeZone) => value ? new Date(value).toLocaleDateString(undefined, timeZone ? { timeZone } : undefined) : 'Not started'

export function AccountViews({ view, user, workspace, api, onUserUpdated, onWorkspaceUpdated, onGuardChange, onDismiss, onSaved }) {
  const [form, setForm] = useState(() => view === 'profile'
    ? { name: user.name || '', coachingTitle: user.coachingTitle || '' }
    : view === 'team' ? { name: workspace.name }
      : view === 'settings' ? { ...workspace.defaults }
        : { theme: 'color', fieldOrientation: 'High School', timezone: 'UTC', ...user.preferences })
  const [savedForm, setSavedForm] = useState(form)
  const [myDefaults, setMyDefaults] = useState(() => ({ theme: 'color', fieldOrientation: 'High School', gameType: DEFAULT_GAME_TYPE, ...user.preferences }))
  const [savedMyDefaults, setSavedMyDefaults] = useState(myDefaults)
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitationCopyFeedback, setInvitationCopyFeedback] = useState(null)
  const [deliveryMode, setDeliveryMode] = useState(null)
  const [billing, setBilling] = useState(null)
  const [billingTab, setBillingTab] = useState('membership')
  const [settingsTab, setSettingsTab] = useState(workspace.kind === 'team' ? 'defaults' : 'suggestions')
  const [profileTab, setProfileTab] = useState('profile')
  const [suggestionField, setSuggestionField] = useState('location')
  const [scoutingTemplate, setScoutingTemplate] = useState(DEFAULT_SCOUTING_TEMPLATE)
  const [teamTab, setTeamTab] = useState('workspace')
  const [suggestionTexts, setSuggestionTexts] = useState(() => Object.fromEntries(SUGGESTION_FIELDS.map(({ id }) => [id, (workspace.suggestionLists?.[id] || []).join('\n')])))
  const [savedSuggestionTexts, setSavedSuggestionTexts] = useState(suggestionTexts)
  const [scoutingTendencies, setScoutingTendencies] = useState(() => normalizeScoutingTendencies(workspace.scoutingTendencies))
  const [savedScoutingTendencies, setSavedScoutingTendencies] = useState(scoutingTendencies)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [hasStoredLogo, setHasStoredLogo] = useState(false)
  const [logoRemoved, setLogoRemoved] = useState(false)
  const logoPreviewUrl = useRef(null)
  const logoInput = useRef(null)
  const [loading, setLoading] = useState(view === 'team' || view === 'billing')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState('')
  const formDirty = JSON.stringify(form) !== JSON.stringify(savedForm)
  const selectedSuggestionField = SUGGESTION_FIELDS.find(({ id }) => id === suggestionField)?.label || 'Field'
  const myDefaultsDirty = view === 'profile' && JSON.stringify(myDefaults) !== JSON.stringify(savedMyDefaults)
  const suggestionDirty = view === 'settings' && JSON.stringify(suggestionTexts) !== JSON.stringify(savedSuggestionTexts)
  const scoutingDirty = view === 'settings' && JSON.stringify(scoutingTendencies) !== JSON.stringify(savedScoutingTendencies)
  const dirty = formDirty || myDefaultsDirty || suggestionDirty || scoutingDirty || (view === 'team' && Boolean(logoFile || logoRemoved))
  const isAccountDialog = ['settings', 'profile', 'billing', 'team'].includes(view)
  const HeadingIcon = ICONS[view]
  const canManageWorkspaceSettings = Boolean(workspace.permissions?.includes('workspace.settings'))
  const teamEditable = workspace.kind === 'team' && canManageWorkspaceSettings
  const canManageSuggestions = canManageWorkspaceSettings
  const canInvite = workspace.kind === 'team' && Boolean(workspace.permissions?.includes('member.invite'))
  const canRemove = workspace.kind === 'team' && Boolean(workspace.permissions?.includes('member.remove'))
  const canTransfer = workspace.kind === 'team' && Boolean(workspace.permissions?.includes('workspace.transfer_ownership'))
  const settingsTabs = workspace.kind === 'team' ? SETTINGS_TABS : SETTINGS_TABS.filter((tab) => tab.id !== 'defaults')
  const ownerCount = members.filter((member) => member.role === 'owner').length
  const subscriptionPlan = workspace.subscription.kind || workspace.kind

  function replaceLogoPreview(file) {
    if (logoPreviewUrl.current) URL.revokeObjectURL(logoPreviewUrl.current)
    logoPreviewUrl.current = file ? URL.createObjectURL(file) : null
    setLogoPreview(logoPreviewUrl.current)
  }

  useEffect(() => () => {
    if (logoPreviewUrl.current) URL.revokeObjectURL(logoPreviewUrl.current)
  }, [])

  useEffect(() => {
    let active = true
    async function load() {
      try {
        if (view === 'team') {
          const memberResult = await api.members()
          if (!active) return
          const invitationResult = canInvite ? await api.invitations() : { items: [] }
          if (!active) return
          const logo = await api.workspaceLogo()
          if (!active) return
          setMembers(memberResult.items)
          setInvitations(invitationResult.items)
          setDeliveryMode(invitationResult.deliveryMode)
          setHasStoredLogo(Boolean(logo))
          setLogoFile(null)
          setLogoRemoved(false)
          replaceLogoPreview(logo)
        } else if (view === 'billing') {
          const result = await api.billing()
          if (active) setBilling(result)
        }
      } catch (failure) {
        if (active) setError(failure)
      } finally {
        if (active) setLoading(false)
      }
    }
    if (view === 'team' || view === 'billing') load()
    return () => { active = false }
  }, [api, view, canInvite])

  function buildWorkspaceSettingsUpdates() {
    const updates = {}
    if (suggestionDirty) {
      updates.suggestionLists = Object.fromEntries(SUGGESTION_FIELDS.map(({ id }) => [
        id,
        [...new Set((suggestionTexts[id] || '').split(/\r?\n/).map((value) => value.trim()).filter(Boolean))],
      ]))
    }
    if (scoutingDirty) updates.scoutingTendencies = scoutingTendencies
    return updates
  }

  function markWorkspaceSettingsSaved(updates) {
    if (suggestionDirty) {
      const normalizedTexts = Object.fromEntries(SUGGESTION_FIELDS.map(({ id }) => [id, updates.suggestionLists[id].join('\n')]))
      setSuggestionTexts(normalizedTexts)
      setSavedSuggestionTexts(normalizedTexts)
    }
    if (scoutingDirty) setSavedScoutingTendencies(scoutingTendencies)
  }

  async function save(event) {
    event?.preventDefault()
    if (isAccountDialog && view === 'team' && inviteEmail) return false
    if (isAccountDialog && !dirty) {
      onSaved?.()
      return true
    }
    setSaving(true)
    setError(null)
    setNotice('')
    try {
      if (view === 'profile') {
        const updatedUser = { ...user }
        if (formDirty) Object.assign(updatedUser, await api.updateProfile(form))
        if (myDefaultsDirty) updatedUser.preferences = await api.updatePreferences(myDefaults)
        if (formDirty || myDefaultsDirty) onUserUpdated(updatedUser)
        if (myDefaultsDirty) setSavedMyDefaults(myDefaults)
      } else if (view === 'settings') {
        const workspaceUpdates = buildWorkspaceSettingsUpdates()
        if (formDirty) workspaceUpdates.defaults = form
        if (Object.keys(workspaceUpdates).length) {
          const updated = await api.updateWorkspace(workspaceUpdates)
          onWorkspaceUpdated(updated)
          if (formDirty) setSavedForm(form)
          markWorkspaceSettingsSaved(workspaceUpdates)
        }
      } else if (view === 'team') {
        onWorkspaceUpdated(await api.updateWorkspace({ name: form.name }))
        if (logoFile) {
          await api.uploadWorkspaceLogo(logoFile)
          setHasStoredLogo(true)
        } else if (logoRemoved) {
          await api.deleteWorkspaceLogo()
          setHasStoredLogo(false)
          replaceLogoPreview(null)
        }
        setLogoFile(null)
        setLogoRemoved(false)
      }
      setSavedForm(form)
      setNotice('Saved')
      if (isAccountDialog) onSaved?.()
      return true
    } catch (failure) {
      setError(failure)
      return false
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    onGuardChange({ dirty: dirty || Boolean(inviteEmail), saving, canSave: !inviteEmail, save })
    return () => onGuardChange(null)
  })

  function change(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
    setNotice('')
  }

  function selectTeamLogo(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError(new Error('Choose a PNG, JPEG, or WebP image'))
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError(new Error('Team logos must be 2 MB or smaller'))
      return
    }
    setError(null)
    setNotice('')
    setLogoFile(file)
    setLogoRemoved(false)
    replaceLogoPreview(file)
  }

  function removeTeamLogo() {
    setError(null)
    setNotice('')
    setLogoFile(null)
    setLogoRemoved(hasStoredLogo)
    replaceLogoPreview(null)
  }

  function handleBillingTabKeyDown(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const currentIndex = BILLING_TABS.findIndex((tab) => tab.id === billingTab)
    const nextIndex = event.key === 'Home' ? 0
      : event.key === 'End' ? BILLING_TABS.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + BILLING_TABS.length) % BILLING_TABS.length
    setBillingTab(BILLING_TABS[nextIndex].id)
    event.currentTarget.querySelectorAll('[role="tab"]')[nextIndex]?.focus()
  }

  function handleSettingsTabKeyDown(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const currentIndex = settingsTabs.findIndex((tab) => tab.id === settingsTab)
    const nextIndex = event.key === 'Home' ? 0
      : event.key === 'End' ? settingsTabs.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + settingsTabs.length) % settingsTabs.length
    setSettingsTab(settingsTabs[nextIndex].id)
    event.currentTarget.querySelectorAll('[role="tab"]')[nextIndex]?.focus()
  }

  function handleProfileTabKeyDown(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const currentIndex = PROFILE_TABS.findIndex((tab) => tab.id === profileTab)
    const nextIndex = event.key === 'Home' ? 0
      : event.key === 'End' ? PROFILE_TABS.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + PROFILE_TABS.length) % PROFILE_TABS.length
    setProfileTab(PROFILE_TABS[nextIndex].id)
    event.currentTarget.querySelectorAll('[role="tab"]')[nextIndex]?.focus()
  }

  function handleTeamTabKeyDown(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const tabs = TEAM_TABS.filter((tab) => tab.id !== 'invitations' || canInvite)
    const currentIndex = tabs.findIndex((tab) => tab.id === teamTab)
    const nextIndex = event.key === 'Home' ? 0
      : event.key === 'End' ? tabs.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
    setTeamTab(tabs[nextIndex].id)
    event.currentTarget.querySelectorAll('[role="tab"]')[nextIndex]?.focus()
  }

  async function memberAction(member, action, role) {
    if (action === 'remove' && !window.confirm(`Remove ${member.name} from ${workspace.name}?`)) return
    if (action === 'transfer' && !window.confirm(`Transfer ownership of ${workspace.name} to ${member.name}? You will remain an Owner until you demote yourself.`)) return
    if (action === 'role' && member.role === 'owner' && role === 'coach' && !window.confirm('Demote yourself to Coach? You will lose workspace management access.')) return
    setSaving(true)
    setError(null)
    try {
      if (action === 'remove') await api.removeMember(member.userId)
      else if (action === 'transfer') await api.transferOwnership(member.userId)
      else await api.updateMember(member.userId, role)
      setMembers((await api.members()).items)
      onWorkspaceUpdated(await api.workspace())
    } catch (failure) {
      setError(failure)
    } finally {
      setSaving(false)
    }
  }

  async function inviteAction(action, invite) {
    if (action === 'revoke' && !window.confirm(`Revoke invitation to ${invite.email}?`)) return
    setSaving(true)
    setError(null)
    try {
      if (action === 'send') {
        await api.invite({ email: inviteEmail, role: 'coach' })
        setInviteEmail('')
      } else if (action === 'revoke') await api.revokeInvitation(invite.id)
      else await api.resendInvitation(invite.id)
      const result = await api.invitations()
      setInvitations(result.items)
      setDeliveryMode(result.deliveryMode)
      onWorkspaceUpdated(await api.workspace())
    } catch (failure) {
      setError(failure)
    } finally {
      setSaving(false)
    }
  }

  async function copyInvitation(invite) {
    setInvitationCopyFeedback(null)
    setError(null)
    try {
      const url = invite.capturedUrl || (await api.invitationLink(invite.id)).url
      await navigator.clipboard.writeText(url)
      setInvitationCopyFeedback({ id: invite.id, message: 'Invitation link copied' })
    } catch (failure) {
      setError({ ...failure, message: `Unable to copy the invitation link: ${failure.message}` })
    }
  }

  const workspaceDefaultsFields = <>
    <label className="dialog-field"><span>Default Game Type</span>
      <select value={form.gameType || DEFAULT_GAME_TYPE} onChange={(event) => change('gameType', event.target.value)}>
        {Object.keys(PLAY_TEMPLATES).map((gameType) => <option key={gameType} value={gameType}>{gameTypeLabel(gameType)}</option>)}
      </select>
    </label>
    <label className="dialog-field"><span>Default field standard</span>
      <select value={form.fieldOrientation || 'High School'} onChange={(event) => change('fieldOrientation', event.target.value)}>
        <option value="High School">High School</option><option value="NCAA">NCAA</option><option value="NFL">NFL</option>
      </select>
    </label>
    <label className="dialog-field"><span>Default diagram theme</span>
      <select value={form.theme || 'color'} onChange={(event) => change('theme', event.target.value)}>
        {PLAY_THEMES.map((theme) => <option key={theme.id} value={theme.id}>{theme.label}</option>)}
      </select>
    </label>
  </>

  const myDefaultsFields = <>
    <label className="dialog-field"><span>Default Game Type</span>
      <select value={myDefaults.gameType || DEFAULT_GAME_TYPE} onChange={(event) => setMyDefaults((current) => ({ ...current, gameType: event.target.value }))}>
        {Object.keys(PLAY_TEMPLATES).map((gameType) => <option key={gameType} value={gameType}>{gameTypeLabel(gameType)}</option>)}
      </select>
    </label>
    <label className="dialog-field"><span>Default field standard</span>
      <select value={myDefaults.fieldOrientation || 'High School'} onChange={(event) => setMyDefaults((current) => ({ ...current, fieldOrientation: event.target.value }))}>
        <option value="High School">High School</option><option value="NCAA">NCAA</option><option value="NFL">NFL</option>
      </select>
    </label>
    <label className="dialog-field"><span>Default diagram theme</span>
      <select value={myDefaults.theme || 'color'} onChange={(event) => setMyDefaults((current) => ({ ...current, theme: event.target.value }))}>
        {PLAY_THEMES.map((theme) => <option key={theme.id} value={theme.id}>{theme.label}</option>)}
      </select>
    </label>
  </>

  const suggestionFields = <>
    <label className="dialog-field account-settings-suggestion-fields"><span>Field</span>
      <select className="account-settings-suggestion-select" size={SUGGESTION_FIELDS.length} value={suggestionField} onChange={(event) => setSuggestionField(event.target.value)} disabled={!canManageSuggestions}>
        {SUGGESTION_FIELDS.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
      </select>
    </label>
    <label className="dialog-field account-settings-suggestion-editor"><span>Suggestions for {selectedSuggestionField}</span>
      <textarea rows="8" value={suggestionTexts[suggestionField] || ''} onChange={(event) => {
        setSuggestionTexts((current) => ({ ...current, [suggestionField]: event.target.value }))
        setNotice('')
      }} disabled={!canManageSuggestions} />
    </label>
  </>

  const scoutingFields = <>
    <label className="dialog-field account-settings-suggestion-fields"><span>Scouting Template</span>
      <select className="account-settings-suggestion-select" size={SCOUTING_TEMPLATE_COUNT} value={scoutingTemplate} onChange={(event) => setScoutingTemplate(event.target.value)} disabled={!canManageSuggestions}>
        {SCOUTING_TEMPLATE_GROUPS.map(({ id, label, templates }) => <optgroup key={id} label={label}>
          {templates.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}
        </optgroup>)}
      </select>
    </label>
    <label className="dialog-field account-settings-suggestion-editor"><span>Scouting Tendencies</span>
      <textarea rows="8" value={scoutingTendencies[scoutingTemplate] || ''} onChange={(event) => {
        setScoutingTendencies((current) => ({ ...current, [scoutingTemplate]: event.target.value }))
        setNotice('')
      }} disabled={!canManageSuggestions} />
    </label>
  </>

  const content = <main
    className={`account-view${isAccountDialog ? ' account-form-dialog dialog-panel' : ''}${view === 'billing' ? ' account-billing-dialog' : ''}${view === 'settings' && settingsTab === 'defaults' ? ' account-preferences-dialog' : ''}${view === 'settings' && settingsTab === 'suggestions' ? ' account-suggestions-dialog' : ''}${view === 'settings' && settingsTab === 'scouting' ? ' account-scouting-dialog' : ''}${view === 'team' ? ' account-team-dialog' : ''}`}
    role={isAccountDialog ? 'dialog' : undefined}
    aria-modal={isAccountDialog ? 'true' : undefined}
    aria-labelledby={isAccountDialog ? 'account-view-title' : undefined}
    onClick={isAccountDialog ? (event) => event.stopPropagation() : undefined}
  >
    {isAccountDialog
      ? <>
          <h2 id="account-view-title" aria-label={TITLES[view]}>
            <HeadingIcon size={26} strokeWidth={1.8} aria-hidden="true" />{TITLES[view]}
            {['team', 'billing'].includes(view) && <span className="account-title-loading" role="status" title={loading ? `Loading ${TITLES[view].toLowerCase()}...` : undefined}>
              {loading && <><LoaderCircle size={18} aria-hidden="true" /><span className="sr-only">Loading {TITLES[view].toLowerCase()}...</span></>}
            </span>}
          </h2>
          <DialogCloseButton onClick={() => onDismiss?.()} disabled={saving} />
        </>
      : <header className="account-view-heading"><HeadingIcon size={24} aria-hidden="true" /><h1 id="account-view-title">{TITLES[view]}</h1></header>}
    {isAccountDialog
      ? <dl className="account-view-context account-dialog-context">
          <div><dt>Current workspace</dt><dd>{workspace.kind === 'individual' ? 'Personal' : workspace.name}</dd></div>
          <div><dt>Your role</dt><dd className="account-role account-dialog-role">{workspace.role}</dd></div>
        </dl>
      : <div className="account-view-context"><span>{workspace.name}</span><span className="account-role">{workspace.role}</span></div>}
    <ErrorDialog error={error} message="We couldn't complete the account request. Please try again." />
    {notice && <p className="account-notice" role="status">{notice}</p>}

    {['profile', 'settings'].includes(view) && <>
      {view === 'profile' && <div className="account-billing-tabs account-settings-tabs" role="tablist" aria-label="Profile sections" onKeyDown={handleProfileTabKeyDown}>
        {PROFILE_TABS.map(({ id, label, icon: Icon }) => <button
          key={id}
          id={`account-profile-tab-${id}`}
          type="button"
          role="tab"
          aria-selected={profileTab === id}
          aria-controls={`account-profile-panel-${id}`}
          tabIndex={profileTab === id ? 0 : -1}
          onClick={() => setProfileTab(id)}
        ><Icon size={16} aria-hidden="true" />{label}</button>)}
      </div>}
      {view === 'settings' && <div className="account-billing-tabs account-settings-tabs" role="tablist" aria-label="Settings sections" onKeyDown={handleSettingsTabKeyDown}>
        {settingsTabs.map(({ id, label, icon: Icon }) => <button
          key={id}
          id={`account-settings-tab-${id}`}
          type="button"
          role="tab"
          aria-selected={settingsTab === id}
          aria-controls={`account-settings-panel-${id}`}
          tabIndex={settingsTab === id ? 0 : -1}
          onClick={() => setSettingsTab(id)}
        ><Icon size={16} aria-hidden="true" />{label}</button>)}
      </div>}
      <form className="account-form" onSubmit={save}>
        <fieldset disabled={saving || (view === 'settings' && !canManageWorkspaceSettings)}>
          {view === 'profile' && <>
            <div id="account-profile-panel-profile" role="tabpanel" aria-labelledby="account-profile-tab-profile" hidden={profileTab !== 'profile'}>
            <label className="dialog-field"><span>Display name</span><input required maxLength={120} value={form.name} onChange={(event) => change('name', event.target.value)} /></label>
            <label className="dialog-field"><span>Coaching title</span><input maxLength={120} value={form.coachingTitle} onChange={(event) => change('coachingTitle', event.target.value)} /></label>
            <label className="dialog-field"><span>Email</span><input value={user.email || ''} placeholder="Not configured" readOnly /></label>
            <label className="dialog-field"><span>Email verification</span><input value={user.email ? (user.emailVerified ? 'Verified' : 'Not verified') : 'Unavailable'} readOnly /></label>
            </div>
            <div id="account-profile-panel-defaults" role="tabpanel" aria-labelledby="account-profile-tab-defaults" hidden={profileTab !== 'defaults'}>
              {myDefaultsFields}
            </div>
          </>}
          {view === 'settings' && <>
            {workspace.kind === 'team' && <div id="account-settings-panel-defaults" role="tabpanel" aria-labelledby="account-settings-tab-defaults" hidden={settingsTab !== 'defaults'}>
              {workspaceDefaultsFields}
            </div>}
            <div id="account-settings-panel-suggestions" className="account-settings-suggestions" role="tabpanel" aria-labelledby="account-settings-tab-suggestions" hidden={settingsTab !== 'suggestions'}>
              {suggestionFields}
            </div>
            <div id="account-settings-panel-scouting" className="account-settings-suggestions" role="tabpanel" aria-labelledby="account-settings-tab-scouting" hidden={settingsTab !== 'scouting'}>
              {scoutingFields}
            </div>
          </>}
        </fieldset>
        <div className="account-form-actions">
          <button type="button" className="dialog-cancel secondary-button" disabled={saving} onClick={() => onDismiss?.()}>Cancel</button>
          <button type="submit" className="dialog-create primary-button" disabled={saving || (view === 'settings' && !canManageWorkspaceSettings)}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </>}

    {view === 'team' && <div className="account-billing-tabs account-team-tabs" role="tablist" aria-label="Team sections" onKeyDown={handleTeamTabKeyDown}>
      {TEAM_TABS.filter((tab) => tab.id !== 'invitations' || canInvite).map(({ id, label, icon: Icon }) => <button
        key={id}
        id={`account-team-tab-${id}`}
        type="button"
        role="tab"
        aria-selected={teamTab === id}
        aria-controls={`account-team-panel-${id}`}
        tabIndex={teamTab === id ? 0 : -1}
        onClick={() => setTeamTab(id)}
      ><Icon size={16} aria-hidden="true" />{label}</button>)}
    </div>}
    {view === 'team' && <div className="account-team-panels">
      <div id="account-team-panel-workspace" className={`account-team-panel${teamTab === 'workspace' ? ' active' : ''}`} role="tabpanel" aria-labelledby="account-team-tab-workspace" aria-hidden={teamTab !== 'workspace'} inert={teamTab !== 'workspace'} tabIndex={teamTab === 'workspace' ? 0 : -1}>
        <form className="account-form" onSubmit={save}>
          <fieldset disabled={saving || !teamEditable}>
            <label className="dialog-field"><span>Team name</span><input required maxLength={120} value={form.name} onChange={(event) => change('name', event.target.value)} /></label>
            <div className="dialog-field team-logo-upload">
              <span>Team logo</span>
              <div className="team-logo-picker">
                <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={selectTeamLogo} hidden />
                <button type="button" className="dialog-cancel" disabled={saving || !teamEditable} onClick={() => logoInput.current?.click()}>
                  <Upload size={16} aria-hidden="true" />{hasStoredLogo && !logoRemoved ? 'Replace logo' : 'Choose logo'}
                </button>
              </div>
            </div>
            <div className="team-logo-controls">
              <div className="team-logo-preview" aria-live="polite">
                {logoPreview
                  ? <img src={logoPreview} alt={`${workspace.name} logo preview`} />
                  : <span>{loading ? 'Loading logo...' : 'No logo uploaded'}</span>}
              </div>
              {(logoPreview || hasStoredLogo) && <button type="button" className="dialog-cancel" disabled={saving || !teamEditable} onClick={removeTeamLogo}><Trash2 size={16} aria-hidden="true" />Remove logo</button>}
            </div>
            <p className="team-logo-help">PNG, JPEG, or WebP. Maximum 2 MB; images are optimized to 2048 pixels.</p>
          </fieldset>
        </form>
      </div>
      <div id="account-team-panel-staff" className={`account-team-panel${teamTab === 'staff' ? ' active' : ''}`} role="tabpanel" aria-labelledby="account-team-tab-staff" aria-hidden={teamTab !== 'staff'} inert={teamTab !== 'staff'} tabIndex={teamTab === 'staff' ? 0 : -1}>
        <section className="account-section" aria-label="Team staff">
          <p className="account-team-summary">{workspace.seatsUsed} / {workspace.seatLimit} seats reserved or active</p>
          {!loading && <DataGrid
            title="Staff"
            rowIcon={UserRound}
            rowType="Staff member"
            compact
            className="account-team-data-grid"
            items={members.map((member) => ({ ...member, id: member.userId }))}
            busy={saving}
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'coachingTitle', header: 'Title', render: (title) => title || '' },
              { key: 'role', header: 'Role', render: (role, member) => canTransfer && member.role === 'owner' && member.userId === user.userId && ownerCount > 1
                ? <select aria-label={`Role for ${member.name}`} value="owner" disabled={saving} onChange={(event) => memberAction(member, 'role', event.target.value)}>
                  <option value="owner">Owner</option><option value="coach">Coach</option>
                </select>
                : <span className="account-role">{role}</span> },
            ]}
            rowActionLabel={(member) => `Staff actions for ${member.name}`}
            rowActions={(member) => [
              ...(canTransfer && member.role === 'coach' ? [{ key: 'transfer', label: 'Transfer', icon: ArrowRightLeft, onClick: (row) => memberAction(row, 'transfer') }] : []),
              ...(canRemove && member.role !== 'owner' ? [{ key: 'remove', label: 'Remove', icon: Trash2, destructive: true, onClick: (row) => memberAction(row, 'remove') }] : []),
            ]}
          />}
        </section>
      </div>
      {canInvite && <div id="account-team-panel-invitations" className={`account-team-panel${teamTab === 'invitations' ? ' active' : ''}`} role="tabpanel" aria-labelledby="account-team-tab-invitations" aria-hidden={teamTab !== 'invitations'} inert={teamTab !== 'invitations'} tabIndex={teamTab === 'invitations' ? 0 : -1}>
        <section className="account-section" aria-label="Team invitations">
          {canInvite && <form className="account-invite-form" onSubmit={(event) => { event.preventDefault(); inviteAction('send') }}>
            <label className="dialog-field"><span>Email</span><input type="email" required maxLength={254} value={inviteEmail} disabled={saving} onChange={(event) => setInviteEmail(event.target.value)} /></label>
            <button type="submit" className="dialog-create primary-button" disabled={saving || workspace.seatsUsed >= workspace.seatLimit}><Mail size={16} aria-hidden="true" />Invite</button>
          </form>}
          {deliveryMode === 'capture' && <p className="account-team-summary">Captured locally</p>}
          {deliveryMode === 'manual' && <p className="account-team-summary">Manual delivery</p>}
          {!loading && <div className="account-invitations account-team-data-grid-wrap"><DataGrid
            title="Invitations"
            rowIcon={Mail}
            rowType="Email invitation"
            compact
            className="account-team-data-grid"
            items={invitations}
            busy={saving}
            columns={[
              { key: 'email', header: 'Email', render: (email, invite) => <>
                <span>{email}</span>
                {invitationCopyFeedback?.id === invite.id && <span className="account-invitation-copy-feedback" role="status">{invitationCopyFeedback.message}</span>}
              </> },
              { key: 'role', header: 'Role', render: (role) => <span className="account-role">{role}</span> },
              { key: 'status', header: 'Status', render: (status) => <span className="account-invitation-status" data-status={status}>{status}</span> },
              { key: 'expiresAt', header: 'Expires', render: (expiresAt) => date(expiresAt, user.preferences?.timezone) },
            ]}
            rowActionLabel={(invite) => `Invitation actions for ${invite.email}`}
            rowActions={(invite) => [
              { key: 'copy', label: 'Copy Invitation Link', icon: Copy, disabled: invite.status !== 'pending' || (deliveryMode === 'capture' && !invite.capturedUrl), onClick: copyInvitation },
              { key: 'resend', label: 'Resend Invitation', icon: Mail, disabled: !canInvite || invite.status !== 'pending', onClick: (row) => inviteAction('resend', row) },
              { key: 'revoke', label: 'Revoke Invitation', icon: Trash2, destructive: true, disabled: !canInvite || invite.status !== 'pending', onClick: (row) => inviteAction('revoke', row) },
            ]}
          /></div>}
        </section>
      </div>}
    </div>}

    {view === 'billing' && <div className="account-billing-tabs" role="tablist" aria-label="Membership and billing" onKeyDown={handleBillingTabKeyDown}>
      {BILLING_TABS.map((tab) => {
        const TabIcon = tab.icon
        return <button
          key={tab.id}
          id={`account-billing-tab-${tab.id}`}
          type="button"
          role="tab"
          aria-selected={billingTab === tab.id}
          aria-controls={`account-billing-panel-${tab.id}`}
          tabIndex={billingTab === tab.id ? 0 : -1}
          onClick={() => setBillingTab(tab.id)}
        ><TabIcon size={16} strokeWidth={1.8} aria-hidden="true" /><span>{tab.label}</span></button>
      })}
    </div>}
    {view === 'billing' && !loading && billing && <div className="account-billing-panels">
      <div
        id="account-billing-panel-membership"
        className={`account-billing-panel${billingTab === 'membership' ? ' active' : ''}`}
        role="tabpanel"
        aria-labelledby="account-billing-tab-membership"
        aria-hidden={billingTab !== 'membership'}
        inert={billingTab !== 'membership'}
        tabIndex={billingTab === 'membership' ? 0 : -1}
      >
        <section className="account-section account-membership-section">
          <dl className="account-details account-membership-details">
            <dt>Membership type</dt><dd>{PLAN_LABELS[subscriptionPlan] || subscriptionPlan}</dd>
            <dt>Status</dt><dd><span className="account-membership-status">{workspace.subscription.status}</span></dd>
            <dt>Billing interval</dt><dd>{subscriptionPlan === 'free' ? 'No recurring charge' : workspace.subscription.interval === 'year' ? 'Annual' : workspace.subscription.interval === 'month' ? 'Monthly' : 'Trial'}</dd>
            <dt>{workspace.subscription.status === 'trialing' ? 'Trial ends' : subscriptionPlan === 'free' ? 'Plan duration' : 'Paid through'}</dt><dd>{subscriptionPlan === 'free' ? 'Ongoing' : date(workspace.subscription.trialEndsAt || workspace.subscription.periodEndsAt, user.preferences?.timezone)}</dd>
            {workspace.deletionDueAt && <><dt>Content retained until</dt><dd>{date(workspace.deletionDueAt, user.preferences?.timezone)}</dd></>}
            {workspace.subscription.source === 'development_fixture' && <><dt>Billing source</dt><dd>Test subscription</dd></>}
            {workspace.kind === 'team' && <><dt>Seats</dt><dd>{workspace.seatsUsed} / {workspace.seatLimit}</dd></>}
          </dl>
          {billing.managedByTeam ? <div className="account-managed-membership"><strong>Managed by the Team Owner</strong><p>Only the Team Owner can change this workspace's membership.</p></div> : subscriptionPlan === 'free' ? <>
            <div className="account-membership-upgrade">
              <div className="account-current-plan"><div><span>Current plan</span><strong>Free</strong></div><span className="account-current-plan-meta">No recurring charge</span></div>
              <div className="account-plan-picker">
                <div className="account-plan-picker-heading"><h3>Choose a plan</h3><p>Upgrade to add more coaching capacity.</p></div>
                <div className="account-plan-options">
                  {['team', 'individual'].map((planId) => {
                    const PlanIcon = planId === 'team' ? Users : UserRound
                    return <div key={planId} className="account-plan-option">
                    <strong><PlanIcon size={18} strokeWidth={1.8} aria-hidden="true" /><span>{PLAN_LABELS[planId]}</span></strong>
                    <div className="account-plan-prices"><span><b>{money(billing.plans[planId].month)}</b> / month</span><span><b>{money(billing.plans[planId].year)}</b> / year</span></div>
                  </div>
                  })}
                </div>
              </div>
            </div>
            <button type="button" className="dialog-create account-billing-action" disabled={!billing.connected} title={billing.provider === 'mock' ? 'Billing is simulated locally' : 'Paddle is not connected'}><CreditCard size={16} aria-hidden="true" />Upgrade Plan</button>
          </> : <>
            <div className="account-active-plan"><div><span>Current plan</span><strong>{PLAN_LABELS[subscriptionPlan] || subscriptionPlan}</strong></div><div className="account-price-row"><div><strong>{money(billing.prices.month)}</strong><span>Monthly, tax included</span></div><div><strong>{money(billing.prices.year)}</strong><span>Annual, paid upfront, tax included</span></div></div></div>
            <button type="button" className="dialog-create account-billing-action" disabled={!billing.connected} title={billing.provider === 'mock' ? 'Billing is simulated locally' : 'Paddle is not connected'}><CreditCard size={16} aria-hidden="true" />Manage Billing</button>
          </>}
        </section>
      </div>
      <div
        id="account-billing-panel-usage"
        className={`account-billing-panel${billingTab === 'usage' ? ' active' : ''}`}
        role="tabpanel"
        aria-labelledby="account-billing-tab-usage"
        aria-hidden={billingTab !== 'usage'}
        inert={billingTab !== 'usage'}
        tabIndex={billingTab === 'usage' ? 0 : -1}
      >
        <section className="account-section" aria-label="Workspace Usage">
          <div className="account-usage">{Object.entries(workspace.limits).map(([type, limit]) => <div key={type}>
            <div><span>{LABELS[type]}</span><span>{workspace.usage[type].toLocaleString()} / {limit.toLocaleString()}</span></div>
            <meter min={0} max={limit} value={Math.min(workspace.usage[type], limit)} aria-label={`${LABELS[type]} usage`} />
          </div>)}</div>
        </section>
      </div>
    </div>}
    {view === 'team' && isAccountDialog && <div className="account-form-actions">
      <button type="button" className="dialog-cancel secondary-button" disabled={saving} onClick={() => onDismiss?.()}>Cancel</button>
      <button type="button" className="dialog-create primary-button" disabled={saving || Boolean(inviteEmail)} onClick={() => save()}>{saving ? 'Saving...' : 'Save'}</button>
    </div>}
    {view === 'billing' && isAccountDialog && <div className="account-form-actions">
      <button type="button" className="dialog-create primary-button" onClick={() => onDismiss?.()}>Close</button>
    </div>}
  </main>

  return isAccountDialog
    ? <div
        className="dialog-overlay account-dialog-overlay"
        role="presentation"
        onClick={() => onDismiss?.()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            onDismiss?.()
          }
        }}
      >{content}</div>
    : content
}