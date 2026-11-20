import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('../../', import.meta.url))

test('DataGrid renders HTML-like record names and grouping descriptions as escaped text', async () => {
  const server = await createServer({ root, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' })
  try {
    const { DataGrid } = await server.ssrLoadModule('/src/components/DataGrid.jsx')
    const payload = '<img src=x onerror="alert(1)"><script>alert(1)</script>'
    const markup = renderToStaticMarkup(createElement(DataGrid, {
      title: 'Search results',
      columns: [{ key: 'name', header: 'Name' }, { key: 'type', header: 'Type' }],
      compact: true,
      items: [{ id: 'group', name: payload, description: payload, rowType: 'grouping' }, { id: 'play', name: payload, type: 'Play' }],
    }))
    assert.ok(markup.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'))
    assert.ok(markup.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
    assert.ok(!markup.includes('<img'))
    assert.ok(!markup.includes('<script'))
  } finally {
    await server.close()
  }
})

test('production policy forbids inline scripts, external scripts, plugins, and framing', () => {
  const { globalHeaders } = JSON.parse(readFileSync(new URL('../../public/staticwebapp.config.json', import.meta.url), 'utf8'))
  const directives = Object.fromEntries(globalHeaders['Content-Security-Policy'].split(';').map(directive => {
    const [name, ...sources] = directive.trim().split(/\s+/)
    return [name, sources]
  }))
  assert.deepEqual(directives['script-src'], ["'self'"])
  assert.deepEqual(directives['object-src'], ["'none'"])
  assert.deepEqual(directives['base-uri'], ["'none'"])
  assert.deepEqual(directives['frame-ancestors'], ["'none'"])
  assert.equal(globalHeaders['X-Content-Type-Options'], 'nosniff')
})

test('account management controls use effective permissions rather than role labels', async () => {
  const server = await createServer({ root, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' })
  try {
    const { AccountViews } = await server.ssrLoadModule('/src/components/AccountViews.jsx')
    const render = (role, permissions) => renderToStaticMarkup(createElement(AccountViews, {
      view: 'team', user: { userId: 'coach', preferences: {} }, api: {},
      workspace: { name: 'Alpha', kind: 'team', role, permissions, defaults: {}, subscription: { kind: 'team' }, capabilities: { manageTeam: true } },
    }))
    const denied = render('owner', [])
    assert.ok(!denied.includes('account-team-tab-invitations'))
    assert.ok(!denied.includes('account-team-tab-defaults'))
    assert.ok(!denied.includes('account-team-tab-suggestions'))
    assert.ok(!denied.includes('account-team-tab-scouting'))
    assert.ok(denied.includes('<fieldset disabled=""'))
    const granted = render('coach', ['workspace.settings', 'member.invite'])
    assert.ok(granted.includes('account-team-tab-invitations'))
    assert.ok(!granted.includes('account-team-panel-suggestions'))
    assert.ok(!granted.includes('account-team-panel-scouting'))
    assert.ok(!granted.includes('account-team-panel-defaults'))
    assert.ok(granted.includes('account-invite-form'))
    assert.ok(!granted.includes('<fieldset disabled=""'))
    assert.ok(!granted.includes('value="admin"'))
    const teamSettings = renderToStaticMarkup(createElement(AccountViews, {
      view: 'settings', user: { userId: 'owner', preferences: {} }, api: {},
      workspace: { name: 'Alpha', kind: 'team', role: 'owner', permissions: ['workspace.settings'], defaults: {}, subscription: { kind: 'team' } },
    }))
    assert.ok(teamSettings.includes('account-settings-tab-defaults'))
    assert.ok(teamSettings.includes('account-settings-tab-suggestions'))
    assert.ok(teamSettings.includes('account-settings-tab-scouting'))
    assert.ok(teamSettings.includes('Default Game Type'))
    assert.ok(teamSettings.includes('Suggestion Lists'))
    assert.ok(teamSettings.includes('Scouting'))
    assert.ok(teamSettings.includes('<option value="11v11" selected="">11v11</option>'))
    assert.ok(teamSettings.includes('<option value="4v4_flag">4v4 Flag</option>'))
    const settings = renderToStaticMarkup(createElement(AccountViews, {
      view: 'settings', user: { userId: 'owner', preferences: { timezone: 'UTC' } }, api: {},
      workspace: { name: 'Alpha', kind: 'individual', role: 'owner', permissions: ['workspace.settings'], defaults: {}, suggestionLists: { location: ['Marcal Paper Field', 'Kish Bank Field'], period: ['Warmups', 'Team Period'], offFormation: ['Trips Right'], offPlay: ['24 Zone'], defFront: ['Even Front'], defStunt: ['TEX'], defCoverage: ['Cover 3'] }, scoutingTendencies: { 'offense.formation': 'Run strength: pin and pull' }, subscription: { kind: 'individual' } },
    }))
    assert.ok(settings.includes('Suggestion Lists'))
    assert.ok(settings.includes('Scouting'))
    assert.ok(!settings.includes('account-settings-tab-defaults'))
    assert.ok(!settings.includes('Timezone'))
    assert.ok(settings.includes('Scouting Tendencies'))
    assert.ok(settings.includes('Scouting Template'))
    assert.ok(settings.includes('class="account-settings-suggestion-select" size="15"'))
    assert.ok(settings.includes('<optgroup label="OFFENSE">'))
    assert.ok(settings.includes('<optgroup label="DEFENSE">'))
    assert.ok(settings.includes('<optgroup label="SPECIAL TEAMS">'))
    assert.ok(settings.includes('<option value="offense.formation" selected="">Formation</option>'))
    assert.ok(settings.includes('Run strength: pin and pull'))
    assert.ok(settings.includes('class="account-settings-suggestion-select" size="7"'))
    assert.ok(settings.includes('<option value="location" selected="">Location</option>'))
    assert.ok(settings.includes('<option value="period">Period</option>'))
    assert.ok(settings.includes('<option value="offFormation">OFF Formation</option>'))
    assert.ok(settings.includes('<option value="offPlay">OFF Play</option>'))
    assert.ok(settings.includes('<option value="defFront">DEF Front</option>'))
    assert.ok(settings.includes('<option value="defStunt">DEF Stunt</option>'))
    assert.ok(settings.includes('<option value="defCoverage">DEF Coverage</option>'))
    assert.ok(settings.includes('Marcal Paper Field\nKish Bank Field'))
    const { NewPlayDialog } = await server.ssrLoadModule('/src/components/NewPlayDialog.jsx')
    const newPlay = renderToStaticMarkup(createElement(NewPlayDialog, { open: true, defaultGameType: '7v7' }))
    assert.ok(newPlay.includes('<option value="7v7" selected="">7v7</option>'))
    assert.match(newPlay, /<input[^>]*type="text"[^>]*value=""/)
    assert.ok(!newPlay.includes('value="New Play"'))
    const offensePlay = renderToStaticMarkup(createElement(NewPlayDialog, {
      open: true, suggestionCategory: 'Offense', suggestionLists: { offFormation: ['Ace', 'Trips Right'], offPlay: ['Toss Right', 'Power'], defFront: ['Even Front'] },
    }))
    assert.ok(offensePlay.includes('list="new-play-name-suggestions"'))
    assert.ok(offensePlay.includes('<datalist id="new-play-name-suggestions"><option value="Ace"></option><option value="Trips Right"></option></datalist>'))
    assert.ok(!offensePlay.includes('value="Ace Toss Right"'))
    assert.ok(!offensePlay.includes('value="Even Front"'))
    const offenseFallback = renderToStaticMarkup(createElement(NewPlayDialog, {
      open: true, suggestionCategory: 'Offense', suggestionLists: { offFormation: ['Trips Right'] },
    }))
    assert.ok(offenseFallback.includes('<option value="Trips Right"></option></datalist>'))
    const selectedFormation = renderToStaticMarkup(createElement(NewPlayDialog, {
      open: true, initialName: 'Ace', suggestionCategory: 'Offense', suggestionLists: { offFormation: ['Ace', 'Trips Right'], offPlay: ['Toss Right', 'Power'] },
    }))
    assert.ok(selectedFormation.includes('<datalist id="new-play-name-suggestions"><option value="Ace Toss Right"></option><option value="Ace Power"></option></datalist>'))
    assert.ok(!selectedFormation.includes('value="Trips Right Toss Right"'))
    const manuallyTypedFormation = renderToStaticMarkup(createElement(NewPlayDialog, {
      open: true, initialName: 'Wing ', suggestionCategory: 'Offense', suggestionLists: { offFormation: ['Ace'], offPlay: ['Toss Right'] },
    }))
    assert.ok(manuallyTypedFormation.includes('<datalist id="new-play-name-suggestions"><option value="Wing Toss Right"></option></datalist>'))
    const defensePlay = renderToStaticMarkup(createElement(NewPlayDialog, {
      open: true, suggestionCategory: 'Defense', suggestionLists: { offFormation: ['Trips Right'], defFront: ['Even Front'] },
    }))
    assert.ok(defensePlay.includes('<datalist id="new-play-name-suggestions"><option value="Even Front"></option></datalist>'))
    assert.ok(!defensePlay.includes('value="Trips Right"'))
    const defenseFrontSelected = renderToStaticMarkup(createElement(NewPlayDialog, {
      open: true, initialName: 'Odd', suggestionCategory: 'Defense', suggestionLists: { defFront: ['Odd', 'Even Front'], defStunt: ['TEX', 'SLANT'], defCoverage: ['Cover 3', 'Cover 2'] },
    }))
    assert.ok(defenseFrontSelected.includes('<datalist id="new-play-name-suggestions"><option value="Odd TEX"></option><option value="Odd SLANT"></option></datalist>'))
    assert.ok(!defenseFrontSelected.includes('value="Odd TEX Cover 3"'))
    const defenseStuntSelected = renderToStaticMarkup(createElement(NewPlayDialog, {
      open: true, initialName: 'Odd TEX', suggestionCategory: 'Defense', suggestionLists: { defFront: ['Odd'], defStunt: ['TEX', 'SLANT'], defCoverage: ['Cover 3', 'Cover 2'] },
    }))
    assert.ok(defenseStuntSelected.includes('<datalist id="new-play-name-suggestions"><option value="Odd TEX Cover 3"></option><option value="Odd TEX Cover 2"></option></datalist>'))
    assert.ok(!defenseStuntSelected.includes('value="Odd SLANT Cover 3"'))
    const manuallyTypedDefenseFront = renderToStaticMarkup(createElement(NewPlayDialog, {
      open: true, initialName: 'Mint ', suggestionCategory: 'Defense', suggestionLists: { defFront: ['Odd'], defStunt: ['TEX'], defCoverage: ['Cover 3'] },
    }))
    assert.ok(manuallyTypedDefenseFront.includes('<datalist id="new-play-name-suggestions"><option value="Mint TEX"></option></datalist>'))
    const manuallyTypedDefenseStunt = renderToStaticMarkup(createElement(NewPlayDialog, {
      open: true, initialName: 'Odd TEX ', suggestionCategory: 'Defense', suggestionLists: { defFront: ['Odd'], defStunt: ['TEX'], defCoverage: ['Cover 3'] },
    }))
    assert.ok(manuallyTypedDefenseStunt.includes('<datalist id="new-play-name-suggestions"><option value="Odd TEX Cover 3"></option></datalist>'))
    const renderProfile = (emailVerified) => renderToStaticMarkup(createElement(AccountViews, {
      view: 'profile', user: { userId: 'coach', name: 'Coach', email: 'coach@example.com', emailVerified, preferences: {} },
      api: {}, workspace: { name: 'Individual', kind: 'individual', role: 'owner', permissions: [], defaults: {}, subscription: {} },
    }))
    assert.ok(renderProfile(true).includes('value="Verified"'))
    assert.ok(renderProfile(true).includes('account-profile-tab-defaults'))
    assert.ok(renderProfile(true).includes('My Defaults'))
    assert.ok(renderProfile(false).includes('value="Not verified"'))
    assert.ok(renderProfile(false).includes('value="coach@example.com"'))
  } finally {
    await server.close()
  }
})

test('team invitation renders a standard dialog with clear Coach details and footer actions', async () => {
  const server = await createServer({ root, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' })
  try {
    const { TeamInvitationDialog } = await server.ssrLoadModule('/src/components/TeamInvitationDialog.jsx')
    const markup = renderToStaticMarkup(createElement(TeamInvitationDialog, {
      user: { name: 'Coach Two', email: 'coach+two@example.com' }, saving: false,
      onAccept: () => {}, onCancel: () => {},
    }))
    assert.ok(markup.includes('role="dialog"'))
    assert.ok(markup.includes('aria-modal="true"'))
    assert.ok(markup.includes('You’ve been invited to join a Blitzboard team as a Coach.'))
    assert.ok(markup.includes('plays, schedules, and game plans'))
    assert.ok(markup.includes('workspace settings and membership'))
    assert.ok(markup.includes('coach+two@example.com'))
    assert.ok(markup.includes('verified email address it was sent to'))
    const actions = markup.indexOf('class="dialog-actions"')
    const cancel = markup.indexOf('>Cancel</button>', actions)
    const accept = markup.indexOf('>Accept Invitation</button>', actions)
    assert.ok(actions >= 0 && cancel > actions && accept > cancel)
  } finally {
    await server.close()
  }
})