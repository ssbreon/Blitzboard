import { BillingView } from './BillingView'
import { ProfileView } from './ProfileView'
import { SettingsView } from './SettingsView'
import { TeamView } from './TeamView'

const VIEWS = { profile: ProfileView, settings: SettingsView, team: TeamView, billing: BillingView }

export function AccountViews(props) {
  const View = VIEWS[props.view]
  return View ? <View {...props} /> : null
}