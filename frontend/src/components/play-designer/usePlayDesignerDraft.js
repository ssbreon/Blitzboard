import { useEffect, useRef, useState } from 'react'
import { adjustmentDesign } from './playDesignerUtils.js'

export function usePlayDesignerDraft({
  record,
  api,
  readOnly,
  settingsOpen,
  isDirty,
  currentDesign,
  name,
  gameType,
  scoutingTendencies,
  scoutingTendenciesDirty,
  activeSlideId,
  activeSlideTitle,
  activeSlide,
  slides,
  savedBaseDesign,
  savedName,
  onGuardChange,
  onNameSaved,
  onBaseSaved,
  onSlideSaved,
  onScoutingTendenciesSaved,
  setError,
}) {
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const etagRef = useRef(record._etag)
  const slideDraftsRef = useRef({})

  function captureCurrentDraft() {
    return { ...currentDesign, name, title: activeSlideTitle }
  }

  function draftIsDirty(slideId, draft) {
    const savedSlide = slides.find((slide) => slide.id === slideId)
    const baseline = slideId === 'base' ? savedBaseDesign : adjustmentDesign(savedSlide || {}, savedBaseDesign)
    return Object.keys(currentDesign).some((property) => JSON.stringify(draft[property]) !== JSON.stringify(baseline[property]))
      || (slideId === 'base' ? draft.name !== savedName : draft.title !== (savedSlide?.title || 'Adjustment'))
  }

  function navigationIsDirty() {
    return !readOnly && (
      isDirty
      || settingsOpen
      || Object.entries(slideDraftsRef.current).some(([slideId, draft]) => draftIsDirty(slideId, draft))
    )
  }

  async function handleSave() {
    if (readOnly || savingRef.current) return false
    savingRef.current = true
    setSaving(true)
    setError(null)
    try {
      const designPayload = {
        ...currentDesign,
        template: currentDesign.templateId,
      }
      delete designPayload.templateId

      if (activeSlideId) {
        const title = activeSlideTitle.trim() || activeSlide?.title || 'Adjustment'
        const updated = await api.updateSlide(record.parentId, record.id, activeSlideId, { ...designPayload, title }, record.kind)
        onSlideSaved?.(activeSlideId, updated, title)
      } else {
        const payload = {
          ...designPayload,
          name,
          gameType,
          _etag: etagRef.current,
          ...(record.kind === 'scoutPlay' && { scoutingTendencies }),
        }
        const updated = record.kind === 'play'
          ? await api.updatePlay(record.parentId, record.id, payload)
          : await api.updateScoutPlay(record.parentId, record.id, payload)
        etagRef.current = updated._etag
        onNameSaved?.(name)
        onBaseSaved?.({ name, design: currentDesign, gameType, scoutingTendencies })
      }

      if (activeSlideId && scoutingTendenciesDirty) {
        const updated = await api.updateScoutPlay(record.parentId, record.id, { scoutingTendencies, _etag: etagRef.current })
        etagRef.current = updated._etag
        onScoutingTendenciesSaved?.(scoutingTendencies)
      }

      delete slideDraftsRef.current[activeSlideId || 'base']
      return true
    } catch (error) {
      setError({ ...error, message: `Unable to save: ${error.message}` })
      return false
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  async function saveNavigationDrafts() {
    if (readOnly || settingsOpen || savingRef.current) return false
    savingRef.current = true
    setSaving(true)
    setError(null)
    const drafts = { ...slideDraftsRef.current, [activeSlideId || 'base']: captureCurrentDraft() }
    try {
      for (const [slideId, draft] of Object.entries(drafts).sort(([first], [second]) => first === 'base' ? -1 : second === 'base' ? 1 : 0)) {
        if (!draftIsDirty(slideId, draft)) continue
        const { templateId: draftTemplate, name: draftName, title: draftTitle, ...design } = draft
        const payload = { ...design, template: draftTemplate }
        if (slideId === 'base') {
          const versionedPayload = { ...payload, name: draftName, _etag: etagRef.current }
          const updated = record.kind === 'play'
            ? await api.updatePlay(record.parentId, record.id, versionedPayload)
            : await api.updateScoutPlay(record.parentId, record.id, versionedPayload)
          etagRef.current = updated._etag
        } else {
          await api.updateSlide(record.parentId, record.id, slideId, { ...payload, title: draftTitle || 'Adjustment' }, record.kind)
        }
      }

      if (scoutingTendenciesDirty) {
        const updated = await api.updateScoutPlay(record.parentId, record.id, { scoutingTendencies, _etag: etagRef.current })
        etagRef.current = updated._etag
        onScoutingTendenciesSaved?.(scoutingTendencies)
      }
      slideDraftsRef.current = {}
      return true
    } catch (error) {
      setError({ ...error, message: `Unable to save: ${error.message}` })
      return false
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  useEffect(() => {
    onGuardChange?.({ dirty: navigationIsDirty(), saving, canSave: !settingsOpen, save: saveNavigationDrafts })
    return () => onGuardChange?.(null)
  })

  useEffect(() => {
    function beforeUnload(event) {
      if (navigationIsDirty()) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  })

  return {
    saving,
    setSaving,
    slideDraftsRef,
    captureCurrentDraft,
    draftIsDirty,
    navigationIsDirty,
    handleSave,
    saveNavigationDrafts,
  }
}
