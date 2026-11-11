import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ClipboardList, ExternalLink, GripVertical, PanelBottom } from 'lucide-react'
import { assignmentPanelPosition, assignmentPlayers, assignmentTeam } from '../utils/playerAssignments'

export function PlayerAssignments({ id, sectionRef, anchorRef, fieldHeight, open, markers, selectedMarkerId, parentCategory, readOnly, saving, undocked, onUndockedChange, onOpenChange, onSelectMarker, onChange, onAlignmentChange }) {
  const [position, setPosition] = useState({ x: 12, y: 12 })
  const [popoverPosition, setPopoverPosition] = useState({ left: 12, top: 12, pointerX: 32, pointerSide: 'bottom' })
  const dragRef = useRef(null)
  const wasUndockedRef = useRef(false)
  const rows = assignmentPlayers(markers, parentCategory)

  useLayoutEffect(() => {
    if (!open || !selectedMarkerId) return
    const row = Array.from(sectionRef.current?.querySelectorAll('[data-assignment-marker-id]') || [])
      .find((element) => element.dataset.assignmentMarkerId === selectedMarkerId)
    if (!row) return
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
    row.scrollIntoView?.({ block: 'nearest', behavior })
  }, [open, selectedMarkerId, undocked, sectionRef])

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
      setPopoverPosition((current) => (
        current.left === left && current.top === top && current.pointerX === pointerX && current.pointerSide === pointerSide
          ? current
          : { left, top, pointerX, pointerSide }
      ))
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

  useEffect(() => {
    if (!open || undocked) return undefined
    function dismissOutside(event) {
      const target = event.target
      if (
        sectionRef.current?.contains(target)
        || anchorRef.current?.contains(target)
        || (target instanceof Element && target.closest('.play-designer-field [data-marker-id]'))
      ) return
      onOpenChange(false)
    }
    document.addEventListener('pointerdown', dismissOutside, true)
    return () => document.removeEventListener('pointerdown', dismissOutside, true)
  }, [anchorRef, onOpenChange, open, sectionRef, undocked])

  useLayoutEffect(() => {
    if (!undocked) return undefined
    function keepInViewport() {
      const panel = sectionRef.current?.getBoundingClientRect()
      if (!panel) return
      setPosition((current) => assignmentPanelPosition(current, panel, { width: window.innerWidth, height: window.innerHeight }))
    }
    keepInViewport()
    window.addEventListener('resize', keepInViewport)
    return () => window.removeEventListener('resize', keepInViewport)
  }, [undocked, sectionRef])

  function undock() {
    const width = Math.min(640, window.innerWidth - 24)
    setPosition({ x: Math.max(12, window.innerWidth - width - 24), y: Math.min(120, Math.max(12, window.innerHeight / 5)) })
    onUndockedChange(true)
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

  const section = (
    <section
      className={`play-assignments${undocked ? ' is-undocked' : open ? ` is-popover pointer-${popoverPosition.pointerSide}` : ''}`}
      id={id}
      ref={sectionRef}
      role={open ? 'dialog' : undefined}
      aria-modal={open ? false : undefined}
      aria-label="Player assignments"
      tabIndex={open ? -1 : undefined}
      hidden={!open}
      style={undocked
        ? { left: position.x, top: position.y }
        : open
          ? {
              left: popoverPosition.left,
              top: popoverPosition.top,
              height: `min(${Math.max(0, fieldHeight - 6)}px, calc(100dvh - 24px))`,
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
        {undocked ? (
          <button
            type="button"
            className="play-assignments-drag-handle"
            aria-label="Move player assignments"
            title="Move player assignments"
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={() => { dragRef.current = null }}
            onKeyDown={moveWithKeyboard}
          >
            <GripVertical size={16} aria-hidden="true" />
            <span>Player Assignments</span>
          </button>
        ) : <h2><ClipboardList size={16} aria-hidden="true" />Player Assignments</h2>}
        <div className="play-assignments-dock-tools" role="toolbar" aria-label="Assignments docking">
          <button type="button" aria-label="Docked" title="Docked" aria-pressed={!undocked} onClick={() => onUndockedChange(false)}>
            <PanelBottom size={16} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Undocked" title="Undocked" aria-pressed={undocked} onClick={undock}>
            <ExternalLink size={16} aria-hidden="true" />
          </button>
        </div>
      </header>
      <div className="play-assignments-body">
        <table className="play-assignments-table" aria-label="Player Assignments">
          <colgroup>
            <col />
            <col />
            <col />
          </colgroup>
          <thead><tr><th scope="col">Position</th><th scope="col">Alignment</th><th scope="col">Assignment</th></tr></thead>
          <tbody>
            {rows.map((marker, index) => (
              <tr key={marker.id} data-assignment-marker-id={marker.id}>
                <th className={(undocked || open) && marker.id === selectedMarkerId ? 'is-selected' : undefined} scope="row" onClick={() => onSelectMarker(marker.id)}><label htmlFor={`${id}-${marker.id}`}>{marker.label || `Player ${index + 1}`}</label></th>
                <td>
                  <textarea
                    id={`${id}-${marker.id}-alignment`}
                    aria-label={`${marker.label || `Player ${index + 1}`} alignment rules`}
                    value={typeof marker.alignment === 'string' ? marker.alignment : ''}
                    rows={2}
                    maxLength={500}
                    readOnly={readOnly}
                    disabled={saving}
                    onChange={(event) => onAlignmentChange(marker.id, event.target.value)}
                  />
                </td>
                <td>
                  <textarea
                    id={`${id}-${marker.id}`}
                    value={typeof marker.assignment === 'string' ? marker.assignment : ''}
                    rows={2}
                    maxLength={2000}
                    readOnly={readOnly}
                    disabled={saving}
                    onChange={(event) => onChange(marker.id, event.target.value)}
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={3}>No {assignmentTeam(parentCategory)} players on this play.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )

  return open || undocked ? createPortal(section, document.body) : section
}