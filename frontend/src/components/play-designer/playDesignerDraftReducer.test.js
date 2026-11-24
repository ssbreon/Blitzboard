import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createPlayDesignerDraftState,
  playDesignerDraftIsDirty,
  playDesignerDraftReducer,
} from './playDesignerDraftReducer.js'

const design = {
  markers: [],
  drawings: {},
  textAnnotations: [],
  zones: [],
  templateId: 'template-a',
  category: 'Offense',
  fieldDecoration: 'Hash Marks',
  fieldOrientation: 'Upfield',
  fieldZone: 'Full Field',
  perspective: 'Coach',
  theme: 'classic',
  showAssignments: true,
}

test('draft state starts clean', () => {
  const state = createPlayDesignerDraftState({ name: 'Base Play', design })
  assert.equal(playDesignerDraftIsDirty(state), false)
})

test('design field changes mark the base play dirty', () => {
  const initial = createPlayDesignerDraftState({ name: 'Base Play', design })
  const changed = playDesignerDraftReducer(initial, { type: 'SET_DESIGN_FIELD', field: 'perspective', value: 'End Zone' })
  assert.equal(playDesignerDraftIsDirty(changed), true)
})

test('mark saved makes the active design clean', () => {
  const initial = createPlayDesignerDraftState({ name: 'Base Play', design })
  const changed = playDesignerDraftReducer(initial, { type: 'SET_DESIGN_FIELD', field: 'category', value: 'Defense' })
  const savedDesign = changed.currentDesign
  const saved = playDesignerDraftReducer(changed, { type: 'MARK_SAVED', baseDesign: savedDesign, activeDesign: savedDesign })
  assert.equal(playDesignerDraftIsDirty(saved), false)
})

test('activating an adjustment compares it against the adjustment baseline', () => {
  const slides = [{ id: 'adjustment-1', title: 'Adjustment 1', template: 'template-b', category: 'Offense' }]
  const initial = createPlayDesignerDraftState({ name: 'Base Play', design, slides })
  const adjustmentDesign = { ...design, templateId: 'template-b' }
  const active = playDesignerDraftReducer(initial, {
    type: 'ACTIVATE_SLIDE',
    slideId: 'adjustment-1',
    title: 'Adjustment 1',
    design: adjustmentDesign,
    savedDesign: adjustmentDesign,
  })

  assert.equal(playDesignerDraftIsDirty(active), false)
  const renamed = playDesignerDraftReducer(active, { type: 'SET_ACTIVE_SLIDE_TITLE', title: 'Renamed' })
  assert.equal(playDesignerDraftIsDirty(renamed), true)
})

test('cached drafts can be captured and removed', () => {
  const initial = createPlayDesignerDraftState({ name: 'Base Play', design })
  const captured = playDesignerDraftReducer(initial, {
    type: 'CAPTURE_DRAFT',
    slideId: null,
    draft: { name: 'Draft Name', ...design },
  })
  assert.ok(captured.slideDrafts.base)

  const cleared = playDesignerDraftReducer(captured, { type: 'DELETE_SLIDE_DRAFT', slideId: 'base' })
  assert.equal(cleared.slideDrafts.base, undefined)
})
