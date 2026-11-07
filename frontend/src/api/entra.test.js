import assert from 'node:assert/strict'
import test from 'node:test'
import { InteractionRequiredAuthError } from '@azure/msal-browser'
import { createEntraSession } from './entra.js'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'

const settings = {
  VITE_ENTRA_CLIENT_ID: '22222222-2222-4222-8222-222222222222',
  VITE_ENTRA_TENANT_ID: '11111111-1111-4111-8111-111111111111',
  VITE_ENTRA_AUTHORITY: 'https://test.ciamlogin.com/11111111-1111-4111-8111-111111111111',
  VITE_ENTRA_API_SCOPE: 'api://33333333-3333-4333-8333-333333333333/access_as_user',
}

function fixture({ accounts = [], callback = null, tokenError = null } = {}) {
  let active = null, config, initializationCount = 0, login, logout
  const silentRequests = []
  const client = {
    initialize: async () => { initializationCount += 1 },
    handleRedirectPromise: async () => callback,
    getAllAccounts: () => accounts,
    getActiveAccount: () => active,
    setActiveAccount: (account) => { active = account },
    acquireTokenSilent: async (request) => {
      silentRequests.push(request)
      if (tokenError) throw tokenError
      return { accessToken: 'api-access-token', account: active }
    },
    loginRedirect: async (request) => { login = request },
    logoutRedirect: async (request) => { logout = request; active = null },
  }
  const session = createEntraSession(settings, (value) => { config = value; return client }, 'http://localhost:5173')
  return { session, client, config, initializationCount: () => initializationCount, login: () => login, logout: () => logout, silentRequests }
}

test('Entra processes callback once, selects its account, and acquires API tokens silently', async () => {
  const account = { homeAccountId: 'coach' }
  const { session, config, initializationCount, silentRequests } = fixture({ callback: { account } })
  assert.deepEqual(await Promise.all([session.initialize(), session.initialize()]), [true, true])
  assert.equal(initializationCount(), 1)
  assert.equal(await session.accessToken(), 'api-access-token')
  assert.deepEqual(silentRequests[0].scopes, [settings.VITE_ENTRA_API_SCOPE, 'email'])
  assert.equal(config.cache.cacheLocation, 'localStorage')
  assert.equal(config.auth.navigateToLoginRequestUrl, false)
  assert.deepEqual(config.auth.knownAuthorities, ['test.ciamlogin.com'])
})

test('Entra login and provider logout use registered URLs and the API scope', async () => {
  const { session, login } = fixture()
  await session.signIn()
  assert.deepEqual(login().scopes, [settings.VITE_ENTRA_API_SCOPE, 'email'])
  assert.equal(login().prompt, undefined)
  const account = { homeAccountId: 'coach' }
  const { session: logoutSession, logout } = fixture({ accounts: [account] })
  await logoutSession.signOut()
  assert.equal(logout().account, account)
  assert.equal(logout().postLogoutRedirectUri, 'http://localhost:5173/')
})

test('Entra sign-in reuses an existing cached account', async () => {
  const { session, login } = fixture({ accounts: [{ homeAccountId: 'coach' }] })
  await session.signIn()
  assert.equal(login(), undefined)
})

test('Entra requires explicit login when signed out or multiple cached accounts exist', async () => {
  for (const accounts of [[], [{ homeAccountId: 'one' }, { homeAccountId: 'two' }]]) {
    const { session } = fixture({ accounts })
    assert.equal(await session.initialize(), false)
    await assert.rejects(session.accessToken(), /signed out/)
  }
})

test('Entra interaction-required errors do not trigger redirects that discard work', async () => {
  const { session, login } = fixture({ accounts: [{ homeAccountId: 'coach' }], tokenError: new InteractionRequiredAuthError('interaction_required') })
  await assert.rejects(session.accessToken(), (error) => error.code === 'AUTH_INTERACTION_REQUIRED')
  assert.equal(login(), undefined)
})

test('Entra rejects missing configuration, untrusted authorities, and external callbacks', () => {
  for (const invalid of [{}, { ...settings, VITE_ENTRA_AUTHORITY: 'https://attacker.example/tenant' },
    { ...settings, VITE_ENTRA_REDIRECT_URI: 'https://attacker.example/' },
    { ...settings, VITE_ENTRA_API_SCOPE: 'openid' }]) {
    assert.throws(() => createEntraSession(invalid, () => {}, 'http://localhost:5173'), /settings/)
  }
})

test('API client uses MSAL identity, bearer headers, and bounded pending invitation state', async () => {
  const keys = ['location', 'history', 'sessionStorage', 'fetch', '__entraTestSession']
  const original = Object.fromEntries(keys.map((key) => [key, globalThis[key]]))
  const values = new Map([['blitzboard:sign-in-session', 'true']])
  let authenticated = false, logoutCount = 0
  const requests = []
  globalThis.location = { origin: 'http://localhost:5173', pathname: '/', search: '', hash: '#invite=' + 'a'.repeat(32) }
  globalThis.history = { replaceState: () => { globalThis.location.hash = '' } }
  globalThis.sessionStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) }
  globalThis.__entraTestSession = {
    initialize: async () => authenticated,
    accessToken: async () => 'api-access-token',
    signIn: async () => {},
    signOut: async () => { logoutCount += 1 },
  }
  globalThis.fetch = async (url, options) => {
    requests.push({ url, headers: options.headers })
    return { ok: true, status: 200, json: async () => ({}) }
  }
  const server = await createServer({
    root: fileURLToPath(new URL('../../', import.meta.url)),
    define: { 'import.meta.env.VITE_AUTH_MODE': JSON.stringify('entra'), 'import.meta.env.DEV': false },
    plugins: [{ name: 'mock-entra-session', enforce: 'pre', load(id) {
      if (id.replaceAll('\\', '/').endsWith('/src/api/entra.js')) return 'export const createEntraSession = () => globalThis.__entraTestSession'
    } }],
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom',
  })
  try {
    const client = await server.ssrLoadModule('/src/api/client.js')
    await client.initializeAuthentication()
    assert.equal(client.isSignedOut(), true)
    await assert.rejects(client.api.me(), /signed out/)
    assert.equal(client.pendingInvitation(), 'a'.repeat(32))
    assert.equal(globalThis.location.hash, '')
    authenticated = true
    await client.initializeAuthentication()
    assert.equal(client.isSignedOut(), false)
    await client.createApi('team').workspace()
    assert.equal(requests.at(-1).headers.Authorization, 'Bearer api-access-token')
    assert.equal(requests.at(-1).headers['X-Workspace-Id'], 'team')
    assert.equal(requests.at(-1).headers['X-Dev-Auth-Secret'], undefined)
    await client.api.health()
    assert.equal(requests.at(-1).headers.Authorization, undefined)
    await client.signOut()
    assert.equal(logoutCount, 1)
    assert.equal(client.isSignedOut(), true)
    assert.equal(client.pendingInvitation(), null)
    values.set('blitzboard:pending-invitation', JSON.stringify({ token: 'a'.repeat(32), expiresAt: 1 }))
    assert.equal(client.pendingInvitation(), null)
  } finally {
    await server.close()
    for (const key of keys) {
      if (original[key] === undefined) delete globalThis[key]
      else globalThis[key] = original[key]
    }
  }
})