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
