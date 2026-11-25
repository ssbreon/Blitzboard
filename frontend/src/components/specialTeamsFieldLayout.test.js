import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { act, createElement } from 'react'
import { createServer } from 'vite'

test('wizard and designer lock special teams field zones', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' })
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
  const { createRoot } = await import('react-dom/client')
  const server = await createServer({
    root: fileURLToPath(new URL('../../', import.meta.url)),
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false },
    appType: 'custom',
  })
  const root = createRoot(document.getElementById('root'))
  const selectValue = async (select, value) => {
    select.value = value
    await act(async () => select.dispatchEvent(new dom.window.Event('change', { bubbles: true })))
  }
  const submit = async (form) => {
    await act(async () => form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })))
  }

  try {
    const { NewPlayDialog, SPECIAL_TEAMS_PLAY_CATEGORIES } = await server.ssrLoadModule('/src/components/NewPlayDialog.jsx')
    const { PlayDesigner } = await server.ssrLoadModule('/src/components/PlayDesigner.jsx')
    const api = { listSlides: async () => ({ items: [] }) }
    for (const category of SPECIAL_TEAMS_PLAY_CATEGORIES) {
      const gold = category === 'PAT/FG' || category === 'PAT/FG Block'
      const created = []
      await act(async () => root.render(createElement(NewPlayDialog, {
        key: category, open: true, titleLabel: 'New Play', initialName: 'Test',
        categoryOptions: SPECIAL_TEAMS_PLAY_CATEGORIES, onCancel: () => {}, onCreate: (...args) => created.push(args),
      })))
      await selectValue(document.querySelector('label:has(select) select'), category)
      await submit(document.querySelector('form'))
      const zoneSelect = [...document.querySelectorAll('label')].find((label) => label.textContent.startsWith('Field Zone')).querySelector('select')
      assert.equal(zoneSelect.disabled, !gold, category)
      assert.equal(zoneSelect.value, gold ? 'Gold Zone' : '', category)
      if (!gold) assert.equal(zoneSelect.selectedOptions[0].textContent, 'Kickoff/Punt', category)
      for (const option of zoneSelect.querySelectorAll('option[value$="Zone"]')) {
        assert.equal(option.disabled, !gold || option.value !== 'Gold Zone', `${category}: ${option.value}`)
      }
      await submit(document.querySelector('form'))
      assert.equal(created[0][7], gold ? 'Gold Zone' : 'Green Zone', category)

      await act(async () => root.render(createElement(PlayDesigner, {
        key: category, api, record: { kind: 'play', name: 'Test', parentCategory: 'Special Teams', category, fieldZone: 'Red Zone', initialMarkers: [] },
      })))
      await act(async () => document.querySelector('[aria-label="Layout"]').click())
      const zoneButtons = [...document.querySelectorAll('[aria-label="Field Zone"] button')]
      assert.equal(zoneButtons.length, 4)
      for (const button of zoneButtons) {
        const isGold = button.textContent.includes('Gold Zone')
        assert.equal(button.disabled, !gold || !isGold, `${category}: ${button.textContent}`)
        assert.equal(button.getAttribute('aria-checked'), String(gold && isGold), `${category}: ${button.textContent}`)
      }
    }

    const breadcrumb = document.createElement('div')
    document.body.append(breadcrumb)
    await act(async () => root.render(createElement(PlayDesigner, {
      key: 'category-switch', api, breadcrumbSettingsTarget: breadcrumb,
      record: { kind: 'play', name: 'Test', parentCategory: 'Special Teams', category: 'Punt', fieldZone: 'Red Zone', initialMarkers: [] },
    })))
    for (const category of ['PAT/FG', 'Kickoff Return']) {
      await act(async () => breadcrumb.querySelector('[aria-label="Edit Play Settings"]').click())
      await selectValue(document.querySelector('.dialog-panel label:has(select) select'), category)
      await submit(document.querySelector('.dialog-panel'))
      await act(async () => document.querySelector('[aria-label="Layout"]').click())
      const zoneButtons = [...document.querySelectorAll('[aria-label="Field Zone"] button')]
      for (const button of zoneButtons) {
        const selected = category === 'PAT/FG' && button.textContent.includes('Gold Zone')
        assert.equal(button.disabled, !selected, `${category}: ${button.textContent}`)
        assert.equal(button.getAttribute('aria-checked'), String(selected), `${category}: ${button.textContent}`)
      }
      await act(async () => document.querySelector('[aria-label="Layout"]').click())
    }
    breadcrumb.remove()
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