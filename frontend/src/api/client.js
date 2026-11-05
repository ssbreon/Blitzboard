import { createBreadcrumbCache } from '../utils/breadcrumbCache'
import { createEntraSession } from './entra'

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const authMode = import.meta.env.VITE_AUTH_MODE || ''
const signedOutKey = 'blitzboard:signed-out'
const sessionKey = 'blitzboard:sign-in-session'
const developmentPlanKey = 'blitzboard:development-plan'
let signedOut = true
let developmentPlan = null
try {
  signedOut = sessionStorage.getItem(signedOutKey) === 'true' || sessionStorage.getItem(sessionKey) !== 'true'
  developmentPlan = sessionStorage.getItem(developmentPlanKey)
} catch { signedOut = true }

export const isDevelopmentAuth = import.meta.env.DEV && authMode === 'development'
export const isEntraAuth = authMode === 'entra'
let entraSession
let authenticationError = null
const inviteKey = 'blitzboard:pending-invitation'
const session = () => (entraSession ??= createEntraSession(import.meta.env))
export function getAuthenticationError() { return authenticationError }

export function pendingInvitation() {
  try {
    const token = new URLSearchParams(location.hash.slice(1)).get('invite')
    if (token && /^[A-Za-z0-9_-]{20,200}$/.test(token)) {
      sessionStorage.setItem(inviteKey, JSON.stringify({ token, expiresAt: Date.now() + 30 * 60 * 1000 }))
      history.replaceState(null, '', location.pathname + location.search)
      return token
    }
    const pending = JSON.parse(sessionStorage.getItem(inviteKey) || 'null')
    if (pending?.expiresAt > Date.now() && /^[A-Za-z0-9_-]{20,200}$/.test(pending.token)) return pending.token
    sessionStorage.removeItem(inviteKey)
  } catch { return null }
  return null
}

export function clearPendingInvitation() {
  try { sessionStorage.removeItem(inviteKey) } catch { }
}

export async function initializeAuthentication() {
  if (!isEntraAuth) return
  pendingInvitation()
  signedOut = true
  try {
    signedOut = !await session().initialize()
    authenticationError = null
  } catch (error) { authenticationError = error }
}

export function isSignedOut() { return signedOut }
export function selectedDevelopmentPlan() { return isDevelopmentAuth ? developmentPlan : null }

export function resetSession() {
  signedOut = true
  try {
    sessionStorage.setItem(signedOutKey, 'true')
    sessionStorage.removeItem(sessionKey)
    sessionStorage.removeItem(developmentPlanKey)
    sessionStorage.removeItem('blitzboard:workspace')
    Object.keys(sessionStorage).filter((key) => key.startsWith('blitzboard:breadcrumb:')).forEach((key) => sessionStorage.removeItem(key))
  } catch { return }
}

export function signOut() {
  resetSession()
  clearPendingInvitation()
  if (isEntraAuth) return session().signOut()
}

export function signIn(plan = 'free') {
  if (plan !== null && !['free', 'individual', 'team'].includes(plan)) throw new Error('Choose a subscription tier')
  if (isEntraAuth) {
    pendingInvitation()
    return session().signIn()
  }
  if (!isDevelopmentAuth) {
    const configuredUrl = import.meta.env.VITE_SIGN_IN_URL
    if (!configuredUrl) throw new Error('Production sign-in is not connected. Configure the authentication provider before signing in.')
    const destination = new URL(configuredUrl, location.origin)
    if (destination.protocol !== 'https:' && destination.origin !== location.origin) throw new Error('Sign-in requires a secure provider URL')
    try {
      sessionStorage.setItem(sessionKey, 'true')
      sessionStorage.removeItem(signedOutKey)
      if (plan === null) localStorage.removeItem('blitzboard:requested-plan')
      else localStorage.setItem('blitzboard:requested-plan', plan)
    } catch { throw new Error('Browser storage is required to continue signing in') }
    location.assign(destination.href)
    return
  }
  developmentPlan = plan
  signedOut = false
  try {
    sessionStorage.removeItem(signedOutKey)
    sessionStorage.removeItem('blitzboard:workspace')
    sessionStorage.setItem(sessionKey, 'true')
    if (plan === null) sessionStorage.removeItem(developmentPlanKey)
    else sessionStorage.setItem(developmentPlanKey, plan)
  } catch { return }
}

async function authenticationHeaders(path) {
  if (path === '/health') return {}
  if (signedOut) throw new Error('You are signed out')
  if (isEntraAuth) {
    const token = await session().accessToken()
    if (signedOut) throw new Error('You are signed out')
    return { Authorization: `Bearer ${token}` }
  }
  if (!isDevelopmentAuth) return {}

  const secret = import.meta.env.VITE_DEV_AUTH_SECRET
  if (!secret) throw new Error('VITE_DEV_AUTH_SECRET is required in development authentication mode')
  return {
    'X-Dev-User': developmentPlan ? `local-demo-${developmentPlan}` : import.meta.env.VITE_DEV_USER_ID || 'local-coach',
    'X-Dev-Auth-Secret': secret,
  }
}

const listQuery = (category, namePrefix, summary = false, preserveTheme = false) => {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (namePrefix) params.set('namePrefix', namePrefix)
  if (summary) params.set('summary', 'true')
  if (preserveTheme) params.set('preserveTheme', 'true')
  const query = params.toString()
  return query ? `?${query}` : ''
}

const scheduleQuery = (range, query = '') => {
  const params = new URLSearchParams(query)
  if (range?.start) params.set('start', range.start)
  if (range?.end) params.set('end', range.end)
  if (range?.summary) params.set('scheduleSummary', 'true')
  return params.size ? `?${params}` : ''
}

async function sendRequest(path, options = {}, workspaceId) {
  const { headers = {}, ...fetchOptions } = options
  const response = await fetch(`${baseUrl}/api${path}`, {
    ...fetchOptions,
    headers: { 'Content-Type': 'application/json', ...headers, ...await authenticationHeaders(path), ...(workspaceId ? { 'X-Workspace-Id': workspaceId } : {}) },
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}))
    const error = new Error(detail.error?.message || `Request failed with ${response.status}`)
    error.code = detail.error?.code
    error.status = response.status
    throw error
  }
  return response.status === 204 ? null : response.json()
}

export function createApi(workspaceId, onMutationState, sharedCache) {
  const cache = sharedCache || createBreadcrumbCache()
  const request = async (path, options = {}) => {
    const mutation = ['POST', 'PATCH', 'DELETE'].includes(options.method)
    if (mutation) onMutationState?.(1)
    try {
      if (!mutation && sharedCache) return await cache.read(path, () => sendRequest(path, options, workspaceId))
      const result = await sendRequest(path, options, workspaceId)
      if (mutation) cache.apply(path, options.method, options.body ? JSON.parse(options.body) : {}, result)
      return result
    } finally {
      if (mutation) onMutationState?.(-1)
    }
  }
  const client = {
  breadcrumbCache: cache,
  health: () => request('/health'),
  me: () => request('/me'),
  updateProfile: (payload) => request('/me', { method: 'PATCH', body: JSON.stringify(payload) }),
  updatePreferences: (payload) => request('/me/preferences', { method: 'PATCH', body: JSON.stringify(payload) }),
  workspaces: () => request('/workspaces'),
  workspace: () => request('/workspace'),
  updateWorkspace: (payload) => request('/workspace', { method: 'PATCH', body: JSON.stringify(payload) }),
  members: () => request('/workspace/members'),
  transferOwnership: (userId) => request('/workspace/ownership/transfer', { method: 'POST', body: JSON.stringify({ userId }) }),
  invitations: () => request('/workspace/invitations'),
  invite: (payload) => request('/workspace/invitations', { method: 'POST', body: JSON.stringify(payload) }),
  revokeInvitation: (id) => request(`/workspace/invitations/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  resendInvitation: (id) => request(`/workspace/invitations/${encodeURIComponent(id)}/resend`, { method: 'POST', body: '{}' }),
  acceptInvitation: (token) => request('/invitations/accept', { method: 'POST', body: JSON.stringify({ token }) }),
  updateMember: (id, role) => request(`/workspace/members/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  removeMember: (id) => request(`/workspace/members/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  billing: () => request('/workspace/billing'),
  affiliateRecommendations: () => request('/affiliate/recommendations'),
  search: (query) => request(`/search${query ? `?q=${encodeURIComponent(query)}` : ''}`),
  listPlaybooks: (category, namePrefix, summary = false) => request(`/playbooks${listQuery(category, namePrefix, summary)}`),
  createPlaybook: (payload) => request('/playbooks', { method: 'POST', body: JSON.stringify(payload) }),
  getPlaybook: (id) => request(`/playbooks/${id}`),
  updatePlaybook: (id, payload) => request(`/playbooks/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deletePlaybook: (id) => request(`/playbooks/${id}`, { method: 'DELETE' }),
  listPlays: (id, category, namePrefix, summary = false, preserveTheme = false) => request(`/playbooks/${id}/plays${listQuery(category, namePrefix, summary, preserveTheme)}`),
  listPlaybookRows: (id, namePrefix, summary = false) => {
    const query = new URLSearchParams(listQuery(undefined, namePrefix))
    if (summary) query.set('summary', 'true')
    return request(`/playbooks/${id}/rows${query.size ? `?${query}` : ''}`)
  },
  createGrouping: (id, payload) => request(`/playbooks/${id}/groupings`, { method: 'POST', body: JSON.stringify(payload) }),
  updateGrouping: (bookId, id, payload) => request(`/playbooks/${bookId}/groupings/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteGrouping: (bookId, id) => request(`/playbooks/${bookId}/groupings/${id}`, { method: 'DELETE' }),
  createPlay: (id, payload) => request(`/playbooks/${id}/plays`, { method: 'POST', body: JSON.stringify(payload) }),
  reorderPlays: (id, ids) => request(`/playbooks/${id}/plays/reorder`, { method: 'POST', body: JSON.stringify({ ids }) }),
  getPlay: (bookId, id) => request(`/playbooks/${bookId}/plays/${id}`),
  updatePlay: (bookId, id, payload) => request(`/playbooks/${bookId}/plays/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deletePlay: (bookId, id) => request(`/playbooks/${bookId}/plays/${id}`, { method: 'DELETE' }),
  listSlides: (bookId, playId, summary = false) => request(`/playbooks/${bookId}/plays/${playId}/slides${summary ? '?summary=true' : ''}`),
  createSlide: (bookId, playId, payload) => request(`/playbooks/${bookId}/plays/${playId}/slides`, { method: 'POST', body: JSON.stringify(payload) }),
  getSlide: (bookId, playId, slideId) => request(`/playbooks/${bookId}/plays/${playId}/slides/${slideId}`),
  updateSlide: (bookId, playId, slideId, payload) => request(`/playbooks/${bookId}/plays/${playId}/slides/${slideId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteSlide: (bookId, playId, slideId) => request(`/playbooks/${bookId}/plays/${playId}/slides/${slideId}`, { method: 'DELETE' }),
  createExport: (payload) => request('/exports', { method: 'POST', body: JSON.stringify(payload) }),
  getExport: (id) => request(`/exports/${id}`),
  listGamePlans: (category, namePrefix, summary = false, range) => request(`/game-plans${scheduleQuery(range, listQuery(category, namePrefix, summary))}`),
  createGamePlan: (payload) => request('/game-plans', { method: 'POST', body: JSON.stringify(payload) }),
  getGamePlan: (id) => request(`/game-plans/${id}`),
  updateGamePlan: (id, payload) => request(`/game-plans/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteGamePlan: (id) => request(`/game-plans/${id}`, { method: 'DELETE' }),
  listScheduleEvents: (range) => request(`/schedule-events${scheduleQuery(range)}`),
  createScheduleEvent: (payload) => request('/schedule-events', { method: 'POST', body: JSON.stringify(payload) }),
  updateScheduleEvent: (id, payload) => request(`/schedule-events/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteScheduleEvent: (id) => request(`/schedule-events/${id}`, { method: 'DELETE' }),
  listScoutPlays: (id, category, namePrefix, summary = false) => request(`/game-plans/${id}/scout-plays${listQuery(category, namePrefix, summary)}`),
  createScoutPlay: (id, payload) => request(`/game-plans/${id}/scout-plays`, { method: 'POST', body: JSON.stringify(payload) }),
  reorderScoutPlays: (id, ids) => request(`/game-plans/${id}/scout-plays/reorder`, { method: 'POST', body: JSON.stringify({ ids }) }),
  getScoutPlay: (gamePlanId, id) => request(`/game-plans/${gamePlanId}/scout-plays/${id}`),
  updateScoutPlay: (gamePlanId, id, payload) => request(`/game-plans/${gamePlanId}/scout-plays/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteScoutPlay: (gamePlanId, id) => request(`/game-plans/${gamePlanId}/scout-plays/${id}`, { method: 'DELETE' }),
  }
  if (!sharedCache) client.breadcrumbs = createApi(workspaceId, onMutationState, cache)
  return client
}

export const api = createApi()