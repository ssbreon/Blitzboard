import { Building2, CreditCard, LoaderCircle, Settings, UserRound, Users } from 'lucide-react'
import { DialogCloseButton } from '../DialogCloseButton'
import { ErrorDialog } from '../ErrorDialog'

const TITLES = { profile: 'Profile', settings: 'Settings', team: 'Team', billing: 'Membership & Billing' }
const ICONS = { profile: UserRound, settings: Settings, team: Users, billing: CreditCard }

export function AccountDialog({ view, workspace, onDismiss, saving = false, loading = false, error, notice, className = '', children }) {
  const HeadingIcon = ICONS[view] || Building2
  return <div className="dialog-overlay account-dialog-overlay" role="presentation" onClick={() => onDismiss?.()} onKeyDown={(event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onDismiss?.()
    }
  }}>
    <main className={`account-view account-form-dialog dialog-panel${className ? ` ${className}` : ''}`} role="dialog" aria-modal="true" aria-labelledby="account-view-title" onClick={(event) => event.stopPropagation()}>
      <h2 id="account-view-title" aria-label={TITLES[view]}>
        <HeadingIcon size={26} strokeWidth={1.8} aria-hidden="true" />{TITLES[view]}
        {['team', 'billing'].includes(view) && <span className="account-title-loading" role="status" title={loading ? `Loading ${TITLES[view].toLowerCase()}...` : undefined}>
          {loading && <><LoaderCircle size={18} aria-hidden="true" /><span className="sr-only">Loading {TITLES[view].toLowerCase()}...</span></>}
        </span>}
      </h2>
      <DialogCloseButton onClick={() => onDismiss?.()} disabled={saving} />
      <dl className="account-view-context account-dialog-context">
        <div><dt>Current workspace</dt><dd>{workspace.kind === 'individual' ? 'Personal' : workspace.name}</dd></div>
        <div><dt>Your role</dt><dd className="account-role account-dialog-role">{workspace.role}</dd></div>
      </dl>
      <ErrorDialog error={error} message="We couldn't complete the account request. Please try again." />
      {notice && <p className="account-notice" role="status">{notice}</p>}
      {children}
    </main>
  </div>
}