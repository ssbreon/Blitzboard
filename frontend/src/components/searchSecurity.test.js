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
    assert.ok(denied.includes('<fieldset disabled=""'))
    const granted = render('coach', ['workspace.settings', 'member.invite'])
    assert.ok(granted.includes('account-team-tab-invitations'))
    assert.ok(granted.includes('account-invite-form'))
    assert.ok(!granted.includes('<fieldset disabled=""'))
    assert.ok(!granted.includes('value="admin"'))
  } finally {
    await server.close()
  }
})