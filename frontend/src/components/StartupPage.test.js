import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('../../', import.meta.url))

test('startup welcome, local identities, session restoration and production isolation', async () => {
  const original = { localStorage: globalThis.localStorage, sessionStorage: globalThis.sessionStorage, fetch: globalThis.fetch, location: globalThis.location }
  const localValues = new Map()
  const sessionValues = new Map()
  const storage = (values) => ({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  })
  globalThis.localStorage = storage(localValues)
  globalThis.sessionStorage = storage(sessionValues)
  const createTestServer = (development, signInUrl = '') => createServer({
    root,
    define: {
      'import.meta.env.DEV': development,
      'import.meta.env.VITE_AUTH_MODE': JSON.stringify('development'),
      'import.meta.env.VITE_DEV_AUTH_SECRET': JSON.stringify('test-secret'),
      'import.meta.env.VITE_DEV_USER_ID': JSON.stringify('existing-coach'),
      'import.meta.env.VITE_SIGN_IN_URL': JSON.stringify(signInUrl),
    },
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false },
    appType: 'custom',
  })
  const server = await createTestServer(true)
  try {
    const { LoadingIndicator } = await server.ssrLoadModule('/src/components/LoadingIndicator.jsx')
    const loading = renderToStaticMarkup(createElement(LoadingIndicator, { label: 'Signing in...' }))
    assert.ok(loading.includes('role="status"'))
    assert.ok(loading.includes('aria-live="polite"'))
    assert.ok(loading.includes('class="loading-indicator-overlay"'))
    assert.ok(loading.includes('class="loading-indicator-panel"'))
    assert.ok(loading.includes('class="loading-football"'))
    assert.ok(loading.includes('aria-hidden="true"'))
    assert.ok(loading.includes('Signing in...'))
    const compact = renderToStaticMarkup(createElement(LoadingIndicator, { label: 'Loading plays...', compact: true }))
    assert.ok(compact.includes('loading-indicator-compact'))
    const { DataGrid } = await server.ssrLoadModule('/src/components/DataGrid.jsx')
    const gridLoading = renderToStaticMarkup(createElement(DataGrid, { title: 'Playbooks', columns: [], fetchRows: async () => [] }))
    assert.ok(gridLoading.includes('loading-football'))
    assert.ok(gridLoading.includes('Loading playbooks...'))
    const { StartupPage } = await server.ssrLoadModule('/src/components/StartupPage.jsx')
    const first = renderToStaticMarkup(createElement(StartupPage, { development: true }))
    assert.ok(first.includes('Welcome to Blitzboard Studio'))
    assert.ok(first.includes('Already have a Blitzboard account?'))
    assert.ok(first.includes('href="#login"'))
    assert.ok(first.includes('Please login here'))
    assert.ok(first.includes('Local development'))
    assert.equal((first.match(/type="radio"/g) || []).length, 3)
    assert.ok(first.includes('10,000 scouting plays'))
    for (const cloudAuth of [false, true]) {
      const invitation = renderToStaticMarkup(createElement(StartupPage, { invitation: true, cloudAuth, development: !cloudAuth }))
      assert.ok(invitation.includes('Join your team on Blitzboard Studio'))
      assert.ok(invitation.includes('email address that received the invitation'))
      assert.ok(invitation.includes('Sign in to accept invitation'))
      assert.ok(invitation.includes('After signing in, confirm your invitation'))
      assert.ok(invitation.includes('aria-describedby="startup-invitation-help"'))
      assert.ok(!invitation.includes('type="radio"'))
      assert.ok(!invitation.includes('Choose your subscription'))
      assert.ok(!invitation.includes('Please login here'))
      assert.ok(!invitation.includes('Continue to sign in'))
    }
    const signingIn = renderToStaticMarkup(createElement(StartupPage, { invitation: true, busy: true }))
    assert.ok(signingIn.includes('Signing in...'))
    assert.ok(signingIn.includes('disabled=""'))
    localValues.set('blitzboard:welcome-seen', 'true')
    const returning = renderToStaticMarkup(createElement(StartupPage))
    assert.ok(!returning.includes('Welcome to Blitzboard Studio'))
    assert.ok(!returning.includes('Already have a Blitzboard account?'))
    assert.ok(!returning.includes('Local development'))
    assert.ok(returning.includes('Continue to sign in'))

    const client = await server.ssrLoadModule('/src/api/client.js')
    assert.equal(client.isSignedOut(), true)
    const headers = []
    globalThis.fetch = async (path, options) => {
      headers.push(options.headers)
      return { ok: true, status: 200, json: async () => ({}) }
    }
    await assert.rejects(client.api.me(), /signed out/)
    for (const plan of ['free', 'individual', 'team']) {
      client.signIn(plan)
      assert.equal(client.isSignedOut(), false)
      assert.equal(client.selectedDevelopmentPlan(), plan)
      await client.api.me()
      assert.equal(headers.at(-1)['X-Dev-User'], `local-demo-${plan}`)
      assert.equal(headers.at(-1)['X-Dev-Auth-Secret'], 'test-secret')
      assert.equal(sessionValues.get('blitzboard:sign-in-session'), 'true')
      client.signOut()
      assert.equal(client.isSignedOut(), true)
      assert.equal(sessionValues.has('blitzboard:workspace'), false)
      await assert.rejects(client.api.me(), /signed out/)
    }
    client.signIn(null)
    await client.api.me()
    assert.equal(headers.at(-1)['X-Dev-User'], 'existing-coach')
    assert.equal(client.selectedDevelopmentPlan(), null)
    assert.equal(sessionValues.has('blitzboard:development-plan'), false)
    client.signOut()
    assert.throws(() => client.signIn('forged'), /subscription tier/)
    client.signIn('team')
    const restoredServer = await createTestServer(true)
    try {
      const restored = await restoredServer.ssrLoadModule('/src/api/client.js')
      assert.equal(restored.isSignedOut(), false)
      assert.equal(restored.selectedDevelopmentPlan(), 'team')
    } finally { await restoredServer.close() }

    const productionServer = await createTestServer(false)
    try {
      const production = await productionServer.ssrLoadModule('/src/api/client.js')
      assert.equal(production.isDevelopmentAuth, false)
      assert.equal(production.selectedDevelopmentPlan(), null)
      production.signOut()
      assert.throws(() => production.signIn('team'), /Production sign-in is not connected/)
      assert.equal(production.isSignedOut(), true)
    } finally { await productionServer.close() }

    const loginServer = await createTestServer(false, 'https://identity.example/login')
    try {
      let destination
      globalThis.location = { origin: 'https://app.example', assign: (url) => { destination = url } }
      localValues.set('blitzboard:requested-plan', 'free')
      const login = await loginServer.ssrLoadModule('/src/api/client.js')
      login.signIn(null)
      assert.equal(destination, 'https://identity.example/login')
      assert.equal(localValues.has('blitzboard:requested-plan'), false)
    } finally { await loginServer.close() }
  } finally {
    await server.close()
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete globalThis[key]
      else globalThis[key] = value
    }
  }
})