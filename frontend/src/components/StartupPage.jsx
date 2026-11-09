/*
 * Blitzboard Studio
 * Copyright (c) 2027 Breon Technologies LLC
 * All Rights Reserved
 */
import { useState } from 'react'
import { ArrowRight, Check, UserRound, Users } from 'lucide-react'
import { clearSiteData } from '../utils/clearSiteData'

const PLANS = [
  { id: 'free', name: 'Free', price: 'Free', annual: 'No recurring charge', seats: '1 coach', limits: ['5 playbooks', '15 games', '500 plays', '500 scouting plays'], detail: 'Includes coaching resource recommendations.' },
  { id: 'individual', name: 'Individual', price: '$9.99', annual: '$99.90 / year, paid upfront', seats: '1 coach', limits: ['100 playbooks', '100 games', '5,000 plays', '5,000 scouting plays'], detail: '14-day trial. No recommendations or upgrade prompts.' },
  { id: 'team', name: 'Team', price: '$29.99', annual: '$299.90 / year, paid upfront', seats: 'Up to 20 coaches', limits: ['100 playbooks', '200 games', '10,000 plays', '10,000 scouting plays'], detail: '14-day trial. Shared workspace, staff roles and invitations.' },
]

export function StartupPage({ development = false, cloudAuth = false, invitation = false, onSignIn, busy = false }) {
  const [firstVisit] = useState(() => {
    try { return localStorage.getItem('blitzboard:welcome-seen') !== 'true' } catch { return true }
  })
  const [plan, setPlan] = useState('free')
  const [clearing, setClearing] = useState(false)

  function continueToSignIn(selectedPlan = plan) {
    try { localStorage.setItem('blitzboard:welcome-seen', 'true') } catch { }
    onSignIn(selectedPlan)
  }

  async function handleClearSiteCache() {
    if (!window.confirm('Clear this site\'s browser data? You may need to sign in again, and local preferences will be removed.')) return
    setClearing(true)
    const { incomplete } = await clearSiteData()
    window.alert(`${incomplete ? 'Some site data could not be cleared.' : 'Accessible site data was cleared.'} Use your browser settings to remove HTTP-only cookies, browser cache, or data in other tabs.`)
    window.location.reload()
  }

  return <main className="startup-page">
    <header className="startup-brand">
      <img src="/blitzboard-mark.svg" alt="" aria-hidden="true" />
      <span>BLITZBOARD <span>Studio</span></span>
      {development && <span className="startup-environment">Local development</span>}
    </header>
    <section className="startup-welcome" aria-labelledby="startup-title">
      <div>
        <h1 id="startup-title">{invitation ? 'Join your team on Blitzboard Studio' : firstVisit ? 'Welcome to Blitzboard Studio' : 'Blitzboard Studio'}</h1>
        <p>{invitation ? 'You have a team invitation. Sign in or create an account using the email address that received the invitation.' : 'Design football plays, build playbooks, plan practices and games, and keep your coaching staff on the same page.'}</p>
      </div>
      <div className="startup-sign-in">
        <button type="button" className="dialog-create" disabled={busy || clearing} aria-describedby={invitation ? 'startup-invitation-help' : undefined} onClick={() => continueToSignIn(invitation || cloudAuth ? null : plan)}>
          {busy ? 'Signing in...' : invitation ? 'Sign in to accept invitation' : development ? `Sign in to ${PLANS.find((item) => item.id === plan).name}` : 'Continue to sign in'}<ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
    {(invitation || !cloudAuth) && <section className="startup-membership" aria-labelledby="startup-membership-title">
      <div className="startup-membership-heading">
        <h2 id="startup-membership-title">{invitation ? 'Accept your invitation' : development ? 'Choose a coaching account' : 'Choose your subscription'}</h2>
        {invitation ? <p id="startup-invitation-help">After signing in, confirm your invitation to join the team. No subscription purchase is needed.</p> : !cloudAuth && <p>USD. Taxes included in paid plans.</p>}
      </div>
      {!cloudAuth && !invitation && <fieldset className="startup-plans" disabled={busy || clearing}>
        <legend className="sr-only">Subscription tier</legend>
        {PLANS.map((item) => <label key={item.id} className={`startup-plan${plan === item.id ? ' is-selected' : ''}`}>
          <div className="startup-plan-heading">
            {item.id === 'team' ? <Users size={20} aria-hidden="true" /> : <UserRound size={20} aria-hidden="true" />}
            <h3>{item.name}</h3>
            <input type="radio" name="startup-plan" value={item.id} checked={plan === item.id} onChange={() => setPlan(item.id)} />
          </div>
          <p className="startup-price"><strong>{item.price}</strong>{item.id !== 'free' && <span> / month</span>}</p>
          <p className="startup-annual">{item.annual}</p>
          <p className="startup-seats">{item.seats}</p>
          <ul>{item.limits.map((limit) => <li key={limit}><Check size={15} aria-hidden="true" />{limit}</li>)}</ul>
          <p className="startup-plan-detail">{item.detail}</p>
        </label>)}
      </fieldset>}
    </section>}
    <footer className="startup-copyright">
      <button type="button" className="startup-clear-cache" disabled={busy || clearing} onClick={handleClearSiteCache}>{clearing ? 'Clearing site cache...' : 'Clear site cache'}</button>
      <div>© 2027 Breon Technologies LLC. All Rights Reserved.</div>
    </footer>
  </main>
}