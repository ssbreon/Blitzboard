import { useEffect, useRef, useState } from 'react'
import { ArrowRightLeft, Building2, Copy, Mail, Trash2, Upload, UserRound } from 'lucide-react'
import { DataGrid } from '../DataGrid'
import { AccountDialog } from './AccountDialog'
import { AccountTabs } from './AccountTabs'

const TEAM_TABS = [
  { id: 'workspace', label: 'Workspace', icon: Building2 },
  { id: 'staff', label: 'Staff', icon: UserRound },
  { id: 'invitations', label: 'Invitations', icon: Mail },
]
const date = (value, timeZone) => value ? new Date(value).toLocaleDateString(undefined, timeZone ? { timeZone } : undefined) : 'Not started'

export function TeamView({ user, workspace, api, onWorkspaceUpdated, onGuardChange, onDismiss, onSaved }) {
  const [form, setForm] = useState(() => ({ name: workspace.name }))
  const [savedForm, setSavedForm] = useState(form)
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitationCopyFeedback, setInvitationCopyFeedback] = useState(null)
  const [deliveryMode, setDeliveryMode] = useState(null)
  const [teamTab, setTeamTab] = useState('workspace')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [hasStoredLogo, setHasStoredLogo] = useState(false)
  const [logoRemoved, setLogoRemoved] = useState(false)
  const logoPreviewUrl = useRef(null)
  const logoInput = useRef(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState('')
  const dirty = JSON.stringify(form) !== JSON.stringify(savedForm) || Boolean(logoFile || logoRemoved)
  const teamEditable = workspace.kind === 'team' && Boolean(workspace.permissions?.includes('workspace.settings'))
  const canInvite = workspace.kind === 'team' && Boolean(workspace.permissions?.includes('member.invite'))
  const canRemove = workspace.kind === 'team' && Boolean(workspace.permissions?.includes('member.remove'))
  const canTransfer = workspace.kind === 'team' && Boolean(workspace.permissions?.includes('workspace.transfer_ownership'))
  const ownerCount = members.filter((member) => member.role === 'owner').length

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
      } catch (failure) {
        if (active) setError(failure)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [api, canInvite])

  async function save(event) {
    event?.preventDefault()
    if (inviteEmail) return false
    if (!dirty) {
      onSaved?.()
      return true
    }
    setSaving(true)
    setError(null)
    setNotice('')
    try {
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

  return <AccountDialog view="team" workspace={workspace} onDismiss={onDismiss} saving={saving} loading={loading} error={error} notice={notice} className="account-team-dialog">
    <AccountTabs tabs={TEAM_TABS.filter((tab) => tab.id !== 'invitations' || canInvite)} activeTab={teamTab} onChange={setTeamTab} idPrefix="account-team" label="Team sections" className="account-team-tabs" />
    <div className="account-team-panels">
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
                {logoPreview ? <img src={logoPreview} alt={`${workspace.name} logo preview`} /> : <span>{loading ? 'Loading logo...' : 'No logo uploaded'}</span>}
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
            title="Staff" rowIcon={UserRound} rowType="Staff member" compact className="account-team-data-grid"
            items={members.map((member) => ({ ...member, id: member.userId }))} busy={saving}
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
          <form className="account-invite-form" onSubmit={(event) => { event.preventDefault(); inviteAction('send') }}>
            <label className="dialog-field"><span>Email</span><input type="email" required maxLength={254} value={inviteEmail} disabled={saving} onChange={(event) => setInviteEmail(event.target.value)} /></label>
            <button type="submit" className="dialog-create primary-button" disabled={saving || workspace.seatsUsed >= workspace.seatLimit}><Mail size={16} aria-hidden="true" />Invite</button>
          </form>
          {deliveryMode === 'capture' && <p className="account-team-summary">Captured locally</p>}
          {deliveryMode === 'manual' && <p className="account-team-summary">Manual delivery</p>}
          {!loading && <div className="account-invitations account-team-data-grid-wrap"><DataGrid
            title="Invitations" rowIcon={Mail} rowType="Email invitation" compact className="account-team-data-grid" items={invitations} busy={saving}
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
    </div>
    <div className="account-form-actions">
      <button type="button" className="dialog-cancel secondary-button" disabled={saving} onClick={() => onDismiss?.()}>Cancel</button>
      <button type="button" className="dialog-create primary-button" disabled={saving || Boolean(inviteEmail)} onClick={() => save()}>{saving ? 'Saving...' : 'Save'}</button>
    </div>
  </AccountDialog>
}