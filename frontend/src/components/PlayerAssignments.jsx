import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, GripVertical, PanelBottom } from 'lucide-react'
import { assignmentPanelPosition, assignmentPlayers, assignmentTeam } from '../utils/playerAssignments'

export function PlayerAssignments({ id, sectionRef, markers, parentCategory, readOnly, saving, undocked, onUndockedChange, onChange }) {
  const [position, setPosition] = useState({ x: 12, y: 12 })
  const dragRef = useRef(null)
  const wasUndockedRef = useRef(false)
  const rows = assignmentPlayers(markers, parentCategory)

  function boundedPosition(next) {
    const panel = sectionRef.current?.getBoundingClientRect()
    return panel ? assignmentPanelPosition(next, panel, { width: window.innerWidth, height: window.innerHeight }) : next
  }

  useLayoutEffect(() => {
    if (undocked || wasUndockedRef.current) {
      sectionRef.current?.querySelector(undocked ? '.play-assignments-drag-handle' : '[aria-label="Docked"]')?.focus({ preventScroll: true })
    }
    wasUndockedRef.current = undocked
  }, [undocked, sectionRef])

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
    const width = Math.min(560, window.innerWidth - 24)
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
      className={`play-assignments${undocked ? ' is-undocked' : ''}`}
      id={id}
      ref={sectionRef}
      role={undocked ? 'dialog' : undefined}
      aria-modal={undocked ? false : undefined}
      aria-label="Player assignments"
      tabIndex={undocked ? -1 : undefined}
      style={undocked ? { left: position.x, top: position.y } : undefined}
      onKeyDown={undocked ? (event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          onUndockedChange(false)
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
        ) : <h2>Player Assignments</h2>}
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
          <thead><tr><th scope="col">Position</th><th scope="col">Assignment</th></tr></thead>
          <tbody>
            {rows.map((marker, index) => (
              <tr key={marker.id}>
                <th scope="row"><label htmlFor={`${id}-${marker.id}`}>{marker.label || `Player ${index + 1}`}</label></th>
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
            {rows.length === 0 && <tr><td colSpan={2}>No {assignmentTeam(parentCategory)} players on this play.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )

  return undocked ? createPortal(section, document.body) : section
}