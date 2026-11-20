import { useLayoutEffect, useRef, useState } from 'react'
import { ExternalLink, GripVertical, PanelBottom, ScanSearch } from 'lucide-react'
import { assignmentPanelPosition } from '../utils/playerAssignments'

export function ScoutingTendencies({ id, sectionRef, anchorRef, fieldHeight, open, rows, readOnly, saving, undocked, onUndockedChange, onOpenChange, onChange }) {
  const [position, setPosition] = useState({ x: 12, y: 12 })
  const [popoverPosition, setPopoverPosition] = useState({ left: 12, top: 12, pointerX: 32, pointerSide: 'bottom' })
  const dragRef = useRef(null)
  const wasUndockedRef = useRef(false)

  function boundedPosition(next) {
    const panel = sectionRef.current?.getBoundingClientRect()
    return panel ? assignmentPanelPosition(next, panel, { width: window.innerWidth, height: window.innerHeight }) : next
  }

  useLayoutEffect(() => {
    if (open && (undocked || wasUndockedRef.current)) {
      sectionRef.current?.querySelector(undocked ? '.play-assignments-drag-handle' : '[aria-label="Docked"]')?.focus({ preventScroll: true })
    }
    wasUndockedRef.current = undocked
  }, [open, undocked, sectionRef])

  useLayoutEffect(() => {
    if (!open || undocked) return undefined
    const panel = sectionRef.current
    const anchor = anchorRef.current
    if (!panel || !anchor) return undefined

    function placePopover() {
      const panelRect = panel.getBoundingClientRect()
      const anchorRect = anchor.getBoundingClientRect()
      const aboveTop = anchorRect.top - panelRect.height - 12
      const pointerSide = aboveTop >= 12 ? 'bottom' : 'top'
      const top = (pointerSide === 'bottom'
        ? aboveTop
        : Math.min(anchorRect.bottom + 12, window.innerHeight - panelRect.height - 12)) + 1
      const left = Math.max(12, window.innerWidth - panelRect.width - 12)
      const pointerX = Math.max(12, Math.min(anchorRect.left + anchorRect.width / 2 - left, panelRect.width - 12))
      setPopoverPosition((current) => current.left === left && current.top === top && current.pointerX === pointerX && current.pointerSide === pointerSide
        ? current
        : { left, top, pointerX, pointerSide })
    }

    placePopover()
    window.addEventListener('resize', placePopover)
    window.addEventListener('scroll', placePopover, true)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(placePopover)
    observer?.observe(panel)
    observer?.observe(anchor)
    return () => {
      window.removeEventListener('resize', placePopover)
      window.removeEventListener('scroll', placePopover, true)
      observer?.disconnect()
    }
  }, [anchorRef, fieldHeight, open, sectionRef, undocked])

  useLayoutEffect(() => {
    if (!undocked) return undefined
    function keepInViewport() {
      const panel = sectionRef.current?.getBoundingClientRect()
      if (panel) setPosition((current) => assignmentPanelPosition(current, panel, { width: window.innerWidth, height: window.innerHeight }))
    }
    keepInViewport()
    window.addEventListener('resize', keepInViewport)
    return () => window.removeEventListener('resize', keepInViewport)
  }, [undocked, sectionRef])

  function undock() {
    const width = Math.min(640, window.innerWidth - 24)
    setPosition({ x: Math.max(12, window.innerWidth - width - 24), y: Math.min(120, Math.max(12, window.innerHeight / 5)) })
    onUndockedChange(true)
    onOpenChange(true)
  }

  function startDrag(event) {
    if (event.button !== 0) return
    const panel = sectionRef.current?.getBoundingClientRect()
    if (!panel) return
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { pointerId: event.pointerId, x: event.clientX - panel.left, y: event.clientY - panel.top }
  }

  function moveDrag(event) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    setPosition(boundedPosition({ x: event.clientX - drag.x, y: event.clientY - drag.y }))
  }

  function endDrag(event) {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function moveWithKeyboard(event) {
    const offsets = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    const offset = offsets[event.key]
    if (!offset) return
    event.preventDefault()
    const step = event.shiftKey ? 40 : 10
    setPosition(boundedPosition({ x: position.x + offset[0] * step, y: position.y + offset[1] * step }))
  }

  return (
    <section
      className={`play-assignments play-scouting-tendencies${undocked ? ' is-undocked' : open ? ` is-popover pointer-${popoverPosition.pointerSide}` : ''}`}
      id={id}
      ref={sectionRef}
      role={open ? 'dialog' : undefined}
      aria-modal={open ? false : undefined}
      aria-label="Scouting Tendencies"
      tabIndex={open ? -1 : undefined}
      hidden={!open}
      style={undocked
        ? { left: position.x, top: position.y }
        : open
          ? {
              left: popoverPosition.left,
              top: popoverPosition.top,
              height: `min(${Math.max(240, fieldHeight - 6)}px, calc(100dvh - 24px))`,
              maxHeight: 'none',
              '--assignment-pointer-x': `${popoverPosition.pointerX}px`,
            }
          : undefined}
      onKeyDown={open ? (event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          onOpenChange(false)
          anchorRef.current?.focus({ preventScroll: true })
        }
      } : undefined}
    >
      <header className="play-assignments-header">
        {undocked ? <button
          type="button"
          className="play-assignments-drag-handle"
          aria-label="Move Scouting Tendencies"
          title="Move Scouting Tendencies"
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={() => { dragRef.current = null }}
          onKeyDown={moveWithKeyboard}
        ><GripVertical size={16} aria-hidden="true" /><span>Scouting Tendencies</span></button>
          : <h2><ScanSearch size={16} aria-hidden="true" />Scouting Tendencies</h2>}
        <div className="play-assignments-dock-tools" role="toolbar" aria-label="Scouting Tendencies docking">
          <button type="button" aria-label="Dock Scouting Tendencies" title="Keep Scouting Tendencies docked in the play" aria-pressed={!undocked} onClick={() => onUndockedChange(false)}>
            <PanelBottom size={16} aria-hidden="true" /><span>Dock</span>
          </button>
          <button type="button" aria-label="Pop out Scouting Tendencies" title="Open Scouting Tendencies as a movable panel" aria-pressed={undocked} onClick={undock}>
            <ExternalLink size={16} aria-hidden="true" /><span>Pop out</span>
          </button>
        </div>
      </header>
      <div className="play-assignments-body play-scouting-tendencies-body">
        <table className="play-assignments-table play-scouting-tendencies-table" aria-label="Scouting Tendencies">
          <colgroup><col /><col /></colgroup>
          <thead><tr><th scope="col">Tendency</th><th scope="col">Notes</th></tr></thead>
          <tbody>
            {rows.map((row, index) => <tr key={row.id || index}>
              <td><textarea aria-label={`Tendency ${index + 1}`} value={row.tendency || ''} maxLength={500} readOnly={readOnly} disabled={saving} onChange={(event) => onChange(index, 'tendency', event.target.value)} /></td>
              <td><textarea aria-label={`Notes for tendency ${index + 1}`} value={row.notes || ''} maxLength={2000} readOnly={readOnly} disabled={saving} onChange={(event) => onChange(index, 'notes', event.target.value)} /></td>
            </tr>)}
            {rows.length === 0 && <tr><td colSpan={2}>No tendencies were configured for this template.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}