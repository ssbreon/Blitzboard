import { useEffect, useState } from 'react'
import { CreditCard, Gauge, UserRound, Users } from 'lucide-react'
import { AccountDialog } from './AccountDialog'
import { AccountTabs } from './AccountTabs'

const BILLING_TABS = [{ id: 'membership', label: 'Membership', icon: CreditCard }, { id: 'usage', label: 'Workspace Usage', icon: Gauge }]
const LABELS = { playbooks: 'Playbooks', gamePlans: 'Games', plays: 'Plays', scoutPlays: 'Scouting plays / reports' }
const PLAN_LABELS = { free: 'Free', individual: 'Personal', team: 'Team' }
const money = (cents) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
const date = (value, timeZone) => value ? new Date(value).toLocaleDateString(undefined, timeZone ? { timeZone } : undefined) : 'Not started'

export function BillingView({ user, workspace, api, onGuardChange, onDismiss }) {
  const [billing, setBilling] = useState(null)
  const [tab, setTab] = useState('membership')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const subscriptionPlan = workspace.subscription.kind || workspace.kind

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const result = await api.billing()
        if (active) setBilling(result)
      } catch (failure) {
        if (active) setError(failure)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [api])

  useEffect(() => {
    onGuardChange({ dirty: false, saving: false, canSave: true, save: () => true })
    return () => onGuardChange(null)
  })

  return <AccountDialog view="billing" workspace={workspace} onDismiss={onDismiss} loading={loading} error={error} className="account-billing-dialog">
    <AccountTabs tabs={BILLING_TABS} activeTab={tab} onChange={setTab} idPrefix="account-billing" label="Membership and billing" />
    {!loading && billing && <div className="account-billing-panels">
      <div id="account-billing-panel-membership" className={`account-billing-panel${tab === 'membership' ? ' active' : ''}`} role="tabpanel" aria-labelledby="account-billing-tab-membership" aria-hidden={tab !== 'membership'} inert={tab !== 'membership'} tabIndex={tab === 'membership' ? 0 : -1}>
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
      <div id="account-billing-panel-usage" className={`account-billing-panel${tab === 'usage' ? ' active' : ''}`} role="tabpanel" aria-labelledby="account-billing-tab-usage" aria-hidden={tab !== 'usage'} inert={tab !== 'usage'} tabIndex={tab === 'usage' ? 0 : -1}>
        <section className="account-section" aria-label="Workspace Usage">
          <div className="account-usage">{Object.entries(workspace.limits).map(([type, limit]) => <div key={type}>
            <div><span>{LABELS[type]}</span><span>{workspace.usage[type].toLocaleString()} / {limit == null ? 'Unlimited*' : limit.toLocaleString()}</span></div>
            {limit == null
              ? <div className="account-usage-unlimited" aria-label={`${LABELS[type]} usage`}>Unlimited capacity*</div>
              : <meter min={0} max={limit} value={Math.min(workspace.usage[type], limit)} aria-label={`${LABELS[type]} usage`} />}
          </div>)}</div>
        </section>
      </div>
    </div>}
    <div className="account-form-actions">
      <button type="button" className="dialog-create primary-button" onClick={() => onDismiss?.()}>Close</button>
    </div>
  </AccountDialog>
}