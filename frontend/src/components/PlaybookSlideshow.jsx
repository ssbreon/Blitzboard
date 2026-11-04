import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { buildMarkersFromTemplate, DEFAULT_PLAY_TEMPLATE, findPlayTemplate } from '../utils/formations'
import { defaultPlayPerspective } from '../utils/playGeometry'
import { loadSlideshowDetails, loadSlideshowRows } from '../utils/slideshow'
import { PlayFieldView } from './PlayFieldView'
import { LoadingIndicator } from './LoadingIndicator'

export function PlaybookSlideshow({ api, collection }) {
  const [plays, setPlays] = useState(null)
  const [index, setIndex] = useState(0)
  const [details, setDetails] = useState(null)
  const [adjustmentId, setAdjustmentId] = useState(null)
  const [error, setError] = useState(null)
  const [retry, setRetry] = useState(0)
  const row = plays?.[index]

  useEffect(() => {
    let active = true
    loadSlideshowRows(api, collection).then((items) => {
      if (active) {
        setPlays(items.filter((play) => play.rowType !== 'grouping' && play.recordStatus !== 'Archived'))
        setIndex(0)
      }
    }).catch((failure) => { if (active) setError(failure) })
    return () => { active = false }
  }, [api, collection, retry])

  useEffect(() => {
    if (!row) return undefined
    let active = true
    loadSlideshowDetails(api, collection, row)
      .then((result) => {
        if (active) setDetails(result)
      })
      .catch((failure) => { if (active) setError(failure) })
    return () => { active = false }
  }, [api, collection, row])

  const adjustment = details?.adjustments.find((slide) => slide.id === adjustmentId)
  const play = details && {
    ...details.play,
    ...adjustment,
    markers: Array.isArray(adjustment?.markers) ? adjustment.markers : details.play.markers || buildMarkersFromTemplate(findPlayTemplate(details.play.template) || DEFAULT_PLAY_TEMPLATE),
    drawings: adjustment?.drawings || details.play.drawings,
    textAnnotations: adjustment?.textAnnotations || details.play.textAnnotations,
    zones: adjustment?.zones || details.play.zones,
    theme: adjustment?.theme || details.play.theme,
    fieldDecoration: adjustment?.fieldDecoration || details.play.fieldDecoration,
    fieldOrientation: adjustment?.fieldOrientation || details.play.fieldOrientation,
    fieldZone: adjustment?.fieldZone || details.play.fieldZone,
    perspective: adjustment?.perspective || details.play.perspective || defaultPlayPerspective(collection.category),
  }

  function navigate(nextIndex) {
    setDetails(null)
    setAdjustmentId(null)
    setError(null)
    setIndex(nextIndex)
  }

  function reload() {
    setPlays(null)
    navigate(0)
    setRetry(retry + 1)
  }

  return (
    <main className="playbook-slideshow" aria-label={`${collection.name} slideshow`}>
      <header className="slideshow-bar">
        <button type="button" className="slideshow-nav" title="Previous play" aria-label="Previous play" disabled={!plays?.length || index === 0} onClick={() => navigate(index - 1)}>
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
        <div className="slideshow-heading" aria-live="polite">
          {details?.adjustments.length > 0 ? <div className="slideshow-tabs" role="tablist" aria-label="Play adjustments">
            {[{ id: null, title: details.play.name }, ...details.adjustments].map((slide, slideIndex) => (
              <button key={slide.id || 'base'} id={`slideshow-tab-${slideIndex}`} type="button" role="tab" aria-selected={adjustmentId === slide.id} aria-controls="slideshow-field" onClick={() => setAdjustmentId(slide.id)}>
                {slide.title || `Adjustment ${slideIndex}`}
              </button>
            ))}
          </div> : <h1>{row?.name || 'Slideshow'}</h1>}
          {plays?.length > 0 && <span>{index + 1} / {plays.length}</span>}
        </div>
        <button type="button" className="slideshow-nav" title="Next play" aria-label="Next play" disabled={!plays?.length || index === plays.length - 1} onClick={() => navigate(index + 1)}>
          <ChevronRight size={22} aria-hidden="true" />
        </button>
      </header>
      {error ? <div className="slideshow-status" role="alert">
        <p>We couldn't load this slideshow. Please try again.</p>
        <button type="button" onClick={reload}><RefreshCw size={16} aria-hidden="true" /> Retry</button>
      </div> : plays?.length === 0 ? <p className="slideshow-status" role="status">No active plays to present.</p>
        : !details ? <LoadingIndicator className="slideshow-status" label="Loading play..." />
          : <div className="slideshow-canvas" id="slideshow-field" role={details.adjustments.length ? 'tabpanel' : undefined} aria-labelledby={details.adjustments.length ? `slideshow-tab-${adjustment ? details.adjustments.indexOf(adjustment) + 1 : 0}` : undefined}>
            <PlayFieldView play={play} />
          </div>}
    </main>
  )
}