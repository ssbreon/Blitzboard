import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { act, createElement } from 'react'
import { createServer } from 'vite'

test('account views retain drafts, register guards, and save their own changes', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' })
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const { createRoot } = await import('react-dom/client')
  const server = await createServer({
    root: fileURLToPath(new URL('../../../', import.meta.url)),
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false },
    appType: 'custom',
  })
  const root = createRoot(document.getElementById('root'))
  const calls = []
  const revokedUrls = []
  const createObjectURL = URL.createObjectURL
  const revokeObjectURL = URL.revokeObjectURL
  URL.createObjectURL = () => 'blob:account-test'
  URL.revokeObjectURL = (url) => revokedUrls.push(url)
  let guard
  let saved = 0
  const workspace = {
    name: 'Alpha', kind: 'team', role: 'owner', permissions: ['workspace.settings', 'member.invite'],
    defaults: {}, suggestionLists: { location: ['Field'] }, scoutingTendencies: {},
    subscription: { kind: 'free', status: 'active' }, seatsUsed: 1, seatLimit: 5,
    limits: { plays: 10 }, usage: { plays: 3 },
  }
  const user = { userId: 'owner', name: 'Coach', email: 'coach@example.com', preferences: {} }
  const api = {
    updateProfile: async (value) => { calls.push(['profile', value]); return value },
    updatePreferences: async (value) => { calls.push(['preferences', value]); return value },
    updateWorkspace: async (value) => { calls.push(['workspace', value]); return { ...workspace, ...value } },
    members: async () => ({ items: [] }),
    invitations: async () => ({ items: [], deliveryMode: 'manual' }),
    workspaceLogo: async () => null,
    billing: async () => ({ connected: false, plans: { team: { month: 100, year: 1000 }, individual: { month: 50, year: 500 } } }),
  }

  try {
    const { AccountViews } = await server.ssrLoadModule('/src/components/AccountViews.jsx')
    async function render(view) {
      await act(async () => root.render(createElement(AccountViews, {
        key: view, view, user, workspace, api, onUserUpdated: () => {}, onWorkspaceUpdated: () => {},
        onGuardChange: (value) => { guard = value }, onSaved: () => { saved += 1 }, onDismiss: () => {},
      })))
    }
    async function click(selector) {
      await act(async () => document.querySelector(selector).click())
    }
    async function setValue(selector, value) {
      const element = document.querySelector(selector)
      const prototype = element.tagName === 'TEXTAREA' ? dom.window.HTMLTextAreaElement.prototype
        : element.tagName === 'SELECT' ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value)
      await act(async () => element.dispatchEvent(new dom.window.Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })))
    }

    await render('profile')
    await setValue('#account-profile-panel-profile input', 'Coach Updated')
    await act(async () => document.querySelector('#account-profile-tab-profile').dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))
    assert.equal(document.activeElement.id, 'account-profile-tab-defaults')
    assert.equal(document.activeElement.getAttribute('aria-selected'), 'true')
    await act(async () => document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Home', bubbles: true })))
    assert.equal(document.activeElement.id, 'account-profile-tab-profile')
    await act(async () => document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })))
    assert.equal(document.activeElement.id, 'account-profile-tab-defaults')
    await act(async () => document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'End', bubbles: true })))
    assert.equal(document.activeElement.id, 'account-profile-tab-defaults')
    await setValue('#account-profile-panel-defaults select', '7v7')
    await click('#account-profile-tab-profile')
    assert.equal(document.querySelector('#account-profile-panel-profile input').value, 'Coach Updated')
    assert.equal(guard.dirty, true)
    await act(async () => assert.equal(await guard.save(), true))
    assert.equal(calls.find(([type]) => type === 'profile')[1].name, 'Coach Updated')
    assert.equal(calls.find(([type]) => type === 'preferences')[1].gameType, '7v7')

    await render('settings')
    await click('#account-settings-tab-suggestions')
    await setValue('#account-settings-panel-suggestions textarea', ' Field A\nField A\nField B ')
    await click('#account-settings-tab-scouting')
    await setValue('#account-settings-panel-scouting textarea', 'Run tendencies')
    await click('#account-settings-tab-suggestions')
    assert.equal(document.querySelector('#account-settings-panel-suggestions textarea').value, ' Field A\nField A\nField B ')
    assert.equal(guard.dirty, true)
    await act(async () => assert.equal(await guard.save(), true))
    const settings = calls.find(([type]) => type === 'workspace')[1]
    assert.deepEqual(settings.suggestionLists.location, ['Field A', 'Field B'])
    assert.ok(Object.values(settings.scoutingTendencies).includes('Run tendencies'))

    await render('team')
    await click('#account-team-tab-invitations')
    await setValue('.account-invite-form input', 'invite@example.com')
    assert.equal(guard.dirty, true)
    assert.equal(guard.canSave, false)
    await act(async () => assert.equal(await guard.save(), false))
    await click('#account-team-tab-workspace')
    await setValue('#account-team-panel-workspace input[type="text"], #account-team-panel-workspace input:not([type])', 'Alpha Updated')
    const logoInput = document.querySelector('#account-team-panel-workspace input[type="file"]')
    Object.defineProperty(logoInput, 'files', { configurable: true, value: [new dom.window.File(['logo'], 'logo.png', { type: 'image/png' })] })
    await act(async () => logoInput.dispatchEvent(new dom.window.Event('change', { bubbles: true })))
    assert.equal(document.querySelector('.team-logo-preview img').getAttribute('src'), 'blob:account-test')
    await click('.team-logo-controls button')
    assert.deepEqual(revokedUrls, ['blob:account-test'])
    await click('#account-team-tab-invitations')
    await setValue('.account-invite-form input', '')
    assert.equal(guard.canSave, true)
    await act(async () => assert.equal(await guard.save(), true))
    assert.ok(calls.some(([type, value]) => type === 'workspace' && value.name === 'Alpha Updated'))

    await render('billing')
    await click('#account-billing-tab-usage')
    assert.match(document.querySelector('#account-billing-panel-usage').textContent, /3 \/ 10/)
    assert.equal(guard.dirty, false)
    assert.equal(saved, 3)
  } finally {
    await act(async () => root.unmount())
    await server.close()
    dom.window.close()
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL
    delete globalThis.window
    delete globalThis.document
    delete globalThis.IS_REACT_ACT_ENVIRONMENT
  }
})