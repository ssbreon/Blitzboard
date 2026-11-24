import { useEffect, useState } from 'react'

export function usePlayDesignerSlides({ record, api, setError }) {
  const [slides, setSlides] = useState([])
  const [slidesLoadError, setSlidesLoadError] = useState(false)
  const [slideDraftTitles, setSlideDraftTitles] = useState({})
  const [slidesLoading, setSlidesLoading] = useState(['play', 'scoutPlay'].includes(record.kind))

  useEffect(() => {
    if (!['play', 'scoutPlay'].includes(record.kind)) return undefined

    let cancelled = false
    api.listSlides(record.parentId, record.id, false, record.kind)
      .then((result) => {
        if (cancelled) return
        const items = result.items || []
        setSlides(items)
        setSlideDraftTitles(Object.fromEntries(items.map((slide) => [slide.id, slide.title || 'Adjustment'])))
      })
      .catch((error) => {
        if (cancelled) return
        setSlidesLoadError(true)
        setError({ ...error, message: `Unable to load adjustments: ${error.message}` })
      })
      .finally(() => {
        if (!cancelled) setSlidesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [record.kind, record.parentId, record.id, api, setError])

  return {
    slides,
    setSlides,
    slidesLoadError,
    slideDraftTitles,
    setSlideDraftTitles,
    slidesLoading,
  }
}
