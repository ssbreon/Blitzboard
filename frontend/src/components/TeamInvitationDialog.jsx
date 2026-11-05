import { Users } from 'lucide-react'
import { DialogCloseButton } from './DialogCloseButton'

export function TeamInvitationDialog({ user, saving, onAccept, onCancel }) {
  return <div className="dialog-overlay account-dialog-overlay invitation-dialog-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onCancel() }}>
    <section className="dialog-panel team-invitation-dialog" role="dialog" aria-modal="true" aria-labelledby="team-invitation-title" aria-describedby="team-invitation-description">
      <h2 id="team-invitation-title"><Users size={22} aria-hidden="true" />Team Invitation</h2>
      <DialogCloseButton onClick={onCancel} disabled={saving} />
      <div className="team-invitation-body">
        <p id="team-invitation-description">You’ve been invited to join a Blitzboard team as a Coach. Coaches can create and manage plays, schedules, and game plans. Team Owners manage workspace settings and membership.</p>
        <div className="team-invitation-email"><span>Signed in as</span><strong>{user.email || user.name}</strong></div>
        <p className="team-invitation-note">This invitation can only be accepted by the verified email address it was sent to.</p>
      </div>
      <div className="dialog-actions">
        <button type="button" className="dialog-cancel" autoFocus disabled={saving} onClick={onCancel}>Cancel</button>
        <button type="button" className="dialog-create" disabled={saving} onClick={onAccept}>{saving ? 'Accepting...' : 'Accept Invitation'}</button>
      </div>
    </section>
  </div>
}
