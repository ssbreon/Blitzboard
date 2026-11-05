import { InteractionRequiredAuthError, PublicClientApplication } from '@azure/msal-browser'

export function createEntraSession(settings, createClient = (config) => new PublicClientApplication(config), origin = location.origin) {
  const clientId = settings.VITE_ENTRA_CLIENT_ID || ''
  const tenantId = settings.VITE_ENTRA_TENANT_ID || ''
  const authority = settings.VITE_ENTRA_AUTHORITY || ''
  const scope = settings.VITE_ENTRA_API_SCOPE || ''
  const scopes = [scope, 'email']
  const redirectUri = settings.VITE_ENTRA_REDIRECT_URI || `${origin}/`
  const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  let authorityUrl, redirectUrl
  try {
    authorityUrl = new URL(authority)
    redirectUrl = new URL(redirectUri)
  } catch { throw new Error('Entra authentication settings are missing or invalid') }
  if (!guid.test(clientId) || !guid.test(tenantId) || authorityUrl.protocol !== 'https:'
    || !authorityUrl.hostname.endsWith('.ciamlogin.com') || authorityUrl.username || authorityUrl.password
    || authorityUrl.port || authorityUrl.search || authorityUrl.hash
    || authorityUrl.pathname.replace(/^\/|\/$/g, '').toLowerCase() !== tenantId.toLowerCase()
    || !scope.startsWith('api://') || /\s/.test(scope)
    || redirectUrl.origin !== origin || redirectUrl.search || redirectUrl.hash
    || (redirectUrl.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(redirectUrl.hostname))) {
    throw new Error('Entra authentication settings are missing or invalid')
  }
  const client = createClient({
    auth: {
      clientId, authority, knownAuthorities: [authorityUrl.hostname], redirectUri,
      postLogoutRedirectUri: redirectUri, navigateToLoginRequestUrl: false,
    },
    cache: { cacheLocation: 'sessionStorage' },
    system: { loggerOptions: { piiLoggingEnabled: false, loggerCallback: () => {} } },
  })
  let initialization
  function initialize() {
    initialization ??= (async () => {
      await client.initialize()
      const result = await client.handleRedirectPromise()
      const accounts = client.getAllAccounts()
      const account = result?.account || client.getActiveAccount() || (accounts.length === 1 ? accounts[0] : null)
      client.setActiveAccount(account)
      return Boolean(account)
    })().catch((error) => { initialization = null; throw error })
    return initialization
  }
  return {
    initialize,
    async signIn() {
      await initialize()
      return client.loginRedirect({ scopes, prompt: 'select_account' })
    },
    async accessToken() {
      await initialize()
      const account = client.getActiveAccount()
      if (!account) throw new Error('You are signed out')
      try {
        const result = await client.acquireTokenSilent({ account, scopes })
        if (!result.accessToken || result.account?.homeAccountId !== account.homeAccountId) throw new Error('The authentication account changed; sign in again')
        return result.accessToken
      } catch (error) {
        if (error instanceof InteractionRequiredAuthError) {
          const failure = new Error('Your sign-in needs to be renewed. Sign out and sign in again after saving your changes.')
          failure.code = 'AUTH_INTERACTION_REQUIRED'
          throw failure
        }
        throw error
      }
    },
    async signOut() {
      await initialize()
      return client.logoutRedirect({ account: client.getActiveAccount(), postLogoutRedirectUri: redirectUri })
    },
  }
}