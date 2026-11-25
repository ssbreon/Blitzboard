import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const LEGACY_DISMISSED_KEY = 'blitzboard:free-plan-upgrade-dismissed'
const DISMISSED_KEY_PREFIX = 'blitzboard:free-plan-upgrade-dismissed:'

const CURRENT_LIMITS = [
  '5 Playbooks',
  '15 Games',
  '500 Plays',
  '500 Scouting Plays / Reports',
]

const INDIVIDUAL_LIMITS = [
  '100 Playbooks',
  '100 Games',
  '5,000 Plays',
  '5,000 Scouting Plays / Reports',
]

const TEAM_LIMITS = [
  'Up to 20 coaches',
  'Unlimited* Playbooks',
  'Unlimited* Games',
  'Unlimited* Plays',
  'Unlimited* Scouting Plays / Reports',
]

export function FreePlanUpgradeBanner({ onUpgrade, area = 'unknown' }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      localStorage.removeItem(LEGACY_DISMISSED_KEY)
      return sessionStorage.getItem(DISMISSED_KEY_PREFIX + area) === 'true'
    } catch { return false }
  })

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_DISMISSED_KEY)
      setDismissed(sessionStorage.getItem(DISMISSED_KEY_PREFIX + area) === 'true')
    } catch {}
  }, [area])

  function dismissBanner() {
    try { sessionStorage.setItem(DISMISSED_KEY_PREFIX + area, 'true') } catch {}
    setDismissed(true)
  }

  if (dismissed) return null

  return <aside className="free-plan-upgrade" aria-label="Free plan upgrade">
    <div className="free-plan-upgrade-heading">
      <button type="button" className="free-plan-upgrade-close" aria-label="Hide upgrade banner" title="Hide upgrade banner" onClick={dismissBanner}><X size={16} aria-hidden="true" /></button>
      <p>FREE PLAN</p>
      <h2>You're currently using Blitzboard Free.</h2>
      <p className="free-plan-upgrade-ad-note">This ad is shown because you're on the Free plan.</p>
    </div>
    <div className="free-plan-upgrade-comparison">
      <section className="free-plan-upgrade-tier free-plan-upgrade-current" aria-labelledby="free-plan-current-limits">
        <h3 id="free-plan-current-limits">Current usage limits</h3>
        <ul>{CURRENT_LIMITS.map((limit) => <li key={limit}>{limit}</li>)}</ul>
      </section>
      <section className="free-plan-upgrade-tier free-plan-upgrade-individual" aria-labelledby="free-plan-individual-limits">
        <h3 id="free-plan-individual-limits">Upgrade to Individual <span>$9.99/mo</span></h3>
        <ul>{INDIVIDUAL_LIMITS.map((limit) => <li key={limit}>{limit}</li>)}</ul>
        <button type="button" className="free-plan-upgrade-card-action" aria-label="Upgrade to Individual" onClick={onUpgrade} />
      </section>
      <section className="free-plan-upgrade-tier free-plan-upgrade-team" aria-labelledby="free-plan-team-limits">
        <h3 id="free-plan-team-limits">Upgrade to Team <span>$29.99/mo</span></h3>
        <ul>{TEAM_LIMITS.map((limit) => <li key={limit}>{limit}</li>)}</ul>
        <p className="free-plan-team-note">* Subject to maximum supported database storage capacity.</p>
        <button type="button" className="free-plan-upgrade-card-action" aria-label="Upgrade to Team" onClick={onUpgrade} />
      </section>
    </div>
  </aside>
}
