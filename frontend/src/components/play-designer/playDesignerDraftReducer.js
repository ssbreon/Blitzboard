function stableValue(value) {
  return JSON.stringify(value)
}

export function createPlayDesignerDraftState({
  name,
  design,
  scoutingTendencies = [],
  slides = [],
  slideDraftTitles = {},
}) {
  return {
    name,
    savedName: name,
    activeSlideId: null,
    activeSlideTitle: '',
    currentDesign: design,
    savedBaseDesign: design,
    savedActiveDesign: design,
    scoutingTendencies,
    savedScoutingTendencies: scoutingTendencies,
    slides,
    slideDrafts: {},
    slideDraftTitles,
  }
}

export function playDesignerDraftDesignIsDirty(state) {
  if (!state.savedActiveDesign) return true
  return Object.keys(state.currentDesign).some((key) => (
    stableValue(state.currentDesign[key]) !== stableValue(state.savedActiveDesign[key])
  ))
}

export function playDesignerScoutingTendenciesIsDirty(state) {
  return stableValue(state.scoutingTendencies) !== stableValue(state.savedScoutingTendencies)
}

export function playDesignerDraftIsDirty(state) {
  if (state.activeSlideId) {
    return playDesignerDraftDesignIsDirty(state)
      || state.activeSlideTitle !== (state.slides.find((slide) => slide.id === state.activeSlideId)?.title || 'Adjustment')
      || playDesignerScoutingTendenciesIsDirty(state)
  }
  return state.name !== state.savedName
    || playDesignerDraftDesignIsDirty(state)
    || playDesignerScoutingTendenciesIsDirty(state)
}

export function playDesignerDraftReducer(state, action) {
  switch (action.type) {
    case 'SET_DESIGN_FIELD':
      return { ...state, currentDesign: { ...state.currentDesign, [action.field]: action.value } }
    case 'SET_CURRENT_DESIGN':
      return { ...state, currentDesign: action.design }
    case 'RESTORE_DESIGN':
      return { ...state, currentDesign: action.design }
    case 'SET_NAME':
      return { ...state, name: action.name }
    case 'SET_ACTIVE_SLIDE_TITLE':
      return { ...state, activeSlideTitle: action.title }
    case 'SET_SCOUTING_TENDENCIES':
      return { ...state, scoutingTendencies: action.rows }
    case 'SET_SAVED_SCOUTING_TENDENCIES':
      return { ...state, savedScoutingTendencies: action.rows }
    case 'SET_SLIDES':
      return { ...state, slides: action.slides }
    case 'SET_SLIDE_DRAFT_TITLE':
      return {
        ...state,
        slideDraftTitles: { ...state.slideDraftTitles, [action.slideId]: action.title },
      }
    case 'ACTIVATE_SLIDE':
      return {
        ...state,
        activeSlideId: action.slideId,
        activeSlideTitle: action.slideId ? action.title || 'Adjustment' : '',
        currentDesign: action.design,
        savedActiveDesign: action.savedDesign,
      }
    case 'CAPTURE_DRAFT':
      return {
        ...state,
        slideDrafts: {
          ...state.slideDrafts,
          [action.slideId || 'base']: action.draft,
        },
      }
    case 'DELETE_SLIDE_DRAFT': {
      const slideDrafts = { ...state.slideDrafts }
      delete slideDrafts[action.slideId]
      return { ...state, slideDrafts }
    }
    case 'CLEAR_SLIDE_DRAFTS':
      return { ...state, slideDrafts: {} }
    case 'MARK_SAVED':
      return {
        ...state,
        savedName: action.name ?? state.savedName,
        name: action.name ?? state.name,
        savedBaseDesign: action.baseDesign ?? state.savedBaseDesign,
        savedActiveDesign: action.activeDesign ?? state.savedActiveDesign,
        savedScoutingTendencies: action.scoutingTendencies ?? state.savedScoutingTendencies,
      }
    default:
      return state
  }
}
