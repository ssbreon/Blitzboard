import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { act, createElement } from 'react'
import { createServer } from 'vite'

test('drawing history controls follow undoable and redoable paths after saving', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' })
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
  const { createRoot } = await import('react-dom/client')
  const server = await createServer({
    root: fileURLToPath(new URL('../../', import.meta.url)),
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false },
    appType: 'custom',
  })
  const root = createRoot(document.getElementById('root'))

  try {
    const { PlayDesigner } = await server.ssrLoadModule('/src/components/PlayDesigner.jsx')
    await act(async () => root.render(createElement(PlayDesigner, {
      record: { id: 'play', parentId: 'playbook', kind: 'play', name: 'Test play', parentCategory: 'Offense' },
      api: { listSlides: async () => ({ items: [] }), updatePlay: async () => ({ _etag: 'saved' }) },
    })))

    const undo = document.querySelector('button[aria-label="Undo"]')
    const redo = document.querySelector('button[aria-label="Redo"]')
    const field = document.querySelector('#play-designer-field')
    field.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 })
    const click = async (element) => act(async () => element.click())
    const fieldEvent = async (type, x, y) => act(async () => field.dispatchEvent(new dom.window.MouseEvent(type, {
      bubbles: true, cancelable: true, clientX: x, clientY: y,
    })))

    assert.equal(undo.disabled, true)
    assert.equal(redo.disabled, true)
    await click(document.querySelector('button[aria-label="Add Line"]'))
    await fieldEvent('click', 20, 20)
    await fieldEvent('contextmenu', 40, 40)
    assert.equal(undo.disabled, false)
    assert.equal(redo.disabled, true)
    await click(undo)
    assert.equal(undo.disabled, true)
    assert.equal(redo.disabled, false)
    await click(redo)
    assert.equal(undo.disabled, false)
    assert.equal(redo.disabled, true)
    await click(document.querySelector('.play-designer-save'))
    assert.equal(undo.disabled, false)
    assert.equal(redo.disabled, true)
    await click(undo)
    assert.equal(undo.disabled, true)
    assert.equal(redo.disabled, false)
  } finally {
    await act(async () => root.unmount())
    await server.close()
    dom.window.close()
    delete globalThis.window
    delete globalThis.document
    delete globalThis.IS_REACT_ACT_ENVIRONMENT
    delete globalThis.ResizeObserver
  }
})