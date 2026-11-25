import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { act, createElement } from 'react'
import { createServer } from 'vite'

test('grid controls do not select or open their row', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' })
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const { createRoot } = await import('react-dom/client')
  const server = await createServer({
    root: fileURLToPath(new URL('../../', import.meta.url)),
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false },
    appType: 'custom',
  })
  const root = createRoot(document.getElementById('root'))
  let opened = 0

  try {
    const { DataGrid } = await server.ssrLoadModule('/src/components/DataGrid.jsx')
    await act(async () => root.render(createElement(DataGrid, {
      title: 'Records',
      items: [{ id: 'one', name: 'First' }],
      columns: [{
        key: 'name', header: 'Name', render: (name) => createElement('div', null,
          createElement('span', { className: 'row-name' }, name),
          createElement('button', { type: 'button', className: 'native-control' }, 'Action'),
          createElement('div', { role: 'button', 'data-grid-no-select': '', className: 'custom-control' },
            createElement('span', null, 'Custom action'))),
      }],
      onRowClick: () => { opened += 1 },
      hideToolbar: true,
      hidePager: true,
    })))

    const row = document.querySelector('tbody tr')
    for (const selector of ['.native-control', '.custom-control span']) {
      await act(async () => document.querySelector(selector).click())
      assert.equal(row.getAttribute('aria-selected'), 'false')
      assert.equal(opened, 0)
    }
    await act(async () => document.querySelector('.row-name').click())
    assert.equal(row.getAttribute('aria-selected'), 'true')
    assert.equal(opened, 1)
  } finally {
    await act(async () => root.unmount())
    await server.close()
    dom.window.close()
    delete globalThis.window
    delete globalThis.document
    delete globalThis.IS_REACT_ACT_ENVIRONMENT
  }
})

test('duplicate dialog validates names, preserves failures, and closes after success or cancellation', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' })
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const { createRoot } = await import('react-dom/client')
  const server = await createServer({
    root: fileURLToPath(new URL('../../', import.meta.url)),
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false },
    appType: 'custom',
  })
  const root = createRoot(document.getElementById('root'))
  const calls = []
  let cancelled = 0
  let fail = true

  try {
    const { DuplicateItemDialog } = await server.ssrLoadModule('/src/components/DuplicateItemDialog.jsx')
    const { ErrorDialogProvider } = await server.ssrLoadModule('/src/components/ErrorDialog.jsx')
    const renderDialog = () => createElement(ErrorDialogProvider, null, createElement(DuplicateItemDialog, {
      onCancel: () => { cancelled += 1 },
      onDuplicate: async (name) => { calls.push(name); if (fail) throw new Error('Try again') },
    }))
    await act(async () => root.render(renderDialog()))
    const input = document.querySelector('input')
    const submit = document.querySelector('button[type="submit"]')
    assert.equal(submit.disabled, true)
    const setName = async (value) => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, value)
      await act(async () => input.dispatchEvent(new dom.window.Event('input', { bubbles: true })))
    }
    await setName('   ')
    assert.equal(submit.disabled, true)
    await setName('  New Name  ')
    assert.equal(submit.disabled, false)
    await act(async () => document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })))
    assert.deepEqual(calls, ['New Name'])
    assert.equal(cancelled, 0)
    assert.equal(input.value, '  New Name  ')
    assert.ok(document.querySelector('[role="alertdialog"]'))
    await act(async () => document.querySelector('.error-dialog-panel .dialog-create').click())
    fail = false
    await act(async () => document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })))
    assert.deepEqual(calls, ['New Name', 'New Name'])
    assert.equal(cancelled, 1)
    await act(async () => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    assert.equal(cancelled, 2)
  } finally {
    await act(async () => root.unmount())
    await server.close()
    dom.window.close()
    delete globalThis.window
    delete globalThis.document
    delete globalThis.IS_REACT_ACT_ENVIRONMENT
  }
})
