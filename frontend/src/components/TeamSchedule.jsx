import { useEffect, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Clock3, Dumbbell, GripVertical, LoaderCircle, Plus, Trash2, X } from 'lucide-react'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const EVENT_TYPES = ['Practice', 'Film Review', 'Team Meeting', 'Other']
const pad = (value) => String(value).padStart(2, '0')
const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const parseDate = (value) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}
const monthKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
const displayDate = (value) => {
  if (!value) return ''
  const date = value instanceof Date ? value : parseDate(value)
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}
const eventTime = (event) => event.startTime ? event.startTime : ''
const gameOpponent = (event) => (event.opponent || event.name || '').replace(/^Game vs\.\s*/i, '').trim()
const gameEventLabel = (event) => {
  const opponent = gameOpponent(event)
  if (!opponent) return 'Game'
  return `${event.gameSite === 'Away' ? '@' : 'vs.'} ${opponent}`
}
const calendarTime = (event) => {
  const value = eventTime(event)
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(value)
  if (!match) return value
  return new Date(2000, 0, 1, Number(match[1]), Number(match[2])).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function ScheduleEventDialog({ initialEvent, initialDate, canEdit, canCreateGame, canDelete, onCancel, onSave, onDelete }) {
  const defaultEventDate = initialEvent?.eventDate || initialEvent?.gameDate || initialDate || dateKey(new Date())
  const isFridayDefault = !initialEvent && parseDate(defaultEventDate).getDay() === 5
  const [eventType, setEventType] = useState(initialEvent?.kind === 'game' ? 'Game' : initialEvent?.eventType || (isFridayDefault && canCreateGame ? 'Game' : 'Practice'))
  const [name, setName] = useState(initialEvent?.kind === 'game' ? initialEvent.opponent || '' : initialEvent?.name || '')
  const [eventDate, setEventDate] = useState(defaultEventDate)
  const [startTime, setStartTime] = useState(initialEvent?.startTime || (isFridayDefault ? '19:00' : ''))
  const [endTime, setEndTime] = useState(initialEvent?.endTime || '')
  const [location, setLocation] = useState(initialEvent?.location || '')
  const [gameSite, setGameSite] = useState(initialEvent?.gameSite || '')
  const [notes, setNotes] = useState(initialEvent?.notes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const isGame = eventType === 'Game'

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSave({ eventType, name: name.trim(), eventDate, startTime, endTime, location: location.trim(), gameSite, ...(!isGame && { notes: notes.trim() }) })
    } catch (failure) {
      setError(failure.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="schedule-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onCancel() }}>
      <form className="schedule-dialog" onSubmit={submit} aria-busy={saving}>
        <header className="schedule-dialog-header">
          <div><CalendarDays size={20} aria-hidden="true" /><h2>{initialEvent ? 'Edit Event' : 'Add Event'}</h2></div>
          <button type="button" className="schedule-icon-button" aria-label="Close" onClick={onCancel} disabled={saving}><X size={20} /></button>
        </header>
        <div className="schedule-dialog-body">
          <label className="schedule-field">
            <span>Event type</span>
            <select value={eventType} onChange={(event) => setEventType(event.target.value)} disabled={!canEdit || saving || Boolean(initialEvent)}>
              <option value="Game" disabled={!canCreateGame && initialEvent?.kind !== 'game'}>Game</option>
              {EVENT_TYPES.map((type) => <option value={type} key={type}>{type}</option>)}
            </select>
          </label>
          <div className={isGame ? 'schedule-field-row' : undefined}>
            <label className="schedule-field">
              <span>{isGame ? 'Opponent' : 'Event name'}</span>
              <input value={name} onChange={(event) => setName(event.target.value)} required disabled={!canEdit || saving} autoFocus />
            </label>
            {isGame && <label className="schedule-field"><span>Game Site</span><select value={gameSite} onChange={(event) => setGameSite(event.target.value)} disabled={!canEdit || saving}><option value="">Select game site</option><option value="Home">Home</option><option value="Away">Away</option><option value="Neutral">Neutral</option></select></label>}
          </div>
          <div className="schedule-field-row">
            <label className="schedule-field"><span>Date</span><input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} required disabled={!canEdit || saving} /></label>
            <label className="schedule-field"><span>Start</span><input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} disabled={!canEdit || saving} /></label>
            {!isGame && <label className="schedule-field"><span>End</span><input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} disabled={!canEdit || saving} /></label>}
          </div>
          {!isGame && <label className="schedule-field"><span>Location</span><input value={location} onChange={(event) => setLocation(event.target.value)} disabled={!canEdit || saving} /></label>}
          {!isGame && <label className="schedule-field"><span>Notes</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows="3" disabled={!canEdit || saving} />
          </label>}
          {error && <p className="schedule-error" role="alert">{error}</p>}
        </div>
        <footer className="schedule-dialog-actions">
          {initialEvent && canDelete && <button type="button" className="schedule-delete-button" onClick={onDelete} disabled={saving}><Trash2 size={16} /> Delete</button>}
          <button type="button" className="schedule-secondary-button" onClick={onCancel} disabled={saving}>Cancel</button>
          {canEdit && <button type="submit" className="schedule-primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save Event'}</button>}
        </footer>
      </form>
    </div>
  )
}

function buildCalendarDays(date, mode) {
  if (mode === 'week') {
    const first = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay())
    return Array.from({ length: 7 }, (_, index) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + index))
  }
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const start = new Date(first.getFullYear(), first.getMonth(), -first.getDay() + 1)
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const weekCount = Math.ceil((first.getDay() + daysInMonth) / 7)
  return Array.from({ length: weekCount * 7 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
}

export function TeamSchedule({ api, canEdit, canDelete, canCreateGame, onCreateGame, onOpenGame, onWorkspaceUpdated }) {
  const [calendarDate, setCalendarDate] = useState(() => new Date())
  const [mode, setMode] = useState('month')
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const [dialog, setDialog] = useState(null)
  const [draggedEvent, setDraggedEvent] = useState(null)
  const [dropTargetDate, setDropTargetDate] = useState(null)
  const [movingEventKey, setMovingEventKey] = useState(null)

  useEffect(() => {
    let active = true
    Promise.all([api.listScheduleEvents(), api.listGamePlans()])
      .then(([eventResult, gameResult]) => {
        if (!active) return
        const regularEvents = eventResult.items.map((event) => ({ ...event, kind: 'event', eventDate: event.eventDate }))
        const games = gameResult.items.filter((game) => game.gameDate && game.recordStatus !== 'Archived').map((game) => ({ ...game, kind: 'game', eventType: 'Game', eventDate: game.gameDate }))
        setEvents([...regularEvents, ...games].sort((a, b) => `${a.eventDate} ${eventTime(a)}`.localeCompare(`${b.eventDate} ${eventTime(b)}`)))
        setError(null)
      })
      .catch((failure) => { if (active) setError(failure.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [api, refresh])

  const days = buildCalendarDays(calendarDate, mode)

  function moveCalendar(direction) {
    setCalendarDate((current) => mode === 'week'
      ? new Date(current.getFullYear(), current.getMonth(), current.getDate() + direction * 7)
      : new Date(current.getFullYear(), current.getMonth() + direction, 1))
  }

  async function saveEvent(values) {
    if (values.eventType === 'Game') {
      const payload = {
        name: `Game vs. ${values.name}`,
        opponent: values.name,
        gameDate: values.eventDate,
        year: Number(values.eventDate.slice(0, 4)),
        startTime: values.startTime,
        endTime: values.endTime,
        location: values.location,
        ...(values.gameSite && { gameSite: values.gameSite }),
        ...(dialog.event?.installPlaybookIds && { installPlaybookIds: dialog.event.installPlaybookIds }),
      }
      if (dialog.event?.kind === 'game') await api.updateGamePlan(dialog.event.id, payload)
      else await onCreateGame(payload)
    } else {
      const payload = { name: values.name, eventType: values.eventType, eventDate: values.eventDate, startTime: values.startTime, endTime: values.endTime, location: values.location, notes: values.notes }
      if (dialog.event?.kind === 'event') await api.updateScheduleEvent(dialog.event.id, payload)
      else await api.createScheduleEvent(payload)
    }
    setDialog(null)
    setRefresh((value) => value + 1)
    onWorkspaceUpdated?.()
  }

  async function moveEventToDate(event, destinationDate) {
    const eventKey = `${event.kind}-${event.id}`
    if (!canEdit || event.eventDate === destinationDate || movingEventKey) return
    setMovingEventKey(eventKey)
    setError(null)
    try {
      if (event.kind === 'game') {
        await api.updateGamePlan(event.id, { gameDate: destinationDate, year: Number(destinationDate.slice(0, 4)) })
      } else {
        await api.updateScheduleEvent(event.id, { eventDate: destinationDate })
      }
      setRefresh((value) => value + 1)
      onWorkspaceUpdated?.()
    } catch (failure) {
      setError(failure.message)
    } finally {
      setMovingEventKey(null)
      setDraggedEvent(null)
      setDropTargetDate(null)
    }
  }

  async function removeEvent(event) {
    if (!canDelete || !window.confirm(`Delete “${event.kind === 'game' ? event.opponent || event.name : event.name}”?`)) return
    try {
      if (event.kind === 'game') await api.deleteGamePlan(event.id)
      else await api.deleteScheduleEvent(event.id)
      setDialog(null)
      setRefresh((value) => value + 1)
      onWorkspaceUpdated?.()
    } catch (failure) {
      setError(failure.message)
    }
  }

  function eventsForDay(date) {
    const key = dateKey(date)
    return events.filter((event) => event.eventDate === key)
  }

  return (
    <main className="team-schedule">
      <header className="schedule-toolbar">
        <div className="schedule-subtoolbar-actions">
          <button type="button" className="schedule-primary-button" disabled={!canEdit} onClick={() => setDialog({ date: dateKey(calendarDate) })}><Plus size={18} /> Add Event</button>
          <label className="schedule-jump-picker"><span>Jump to</span><input aria-label="Jump to date" type="date" value={dateKey(calendarDate)} onChange={(event) => { if (event.target.value) setCalendarDate(parseDate(event.target.value)) }} /></label>
        </div>
        <div className="schedule-toolbar-controls">
          <button type="button" className="schedule-secondary-button" onClick={() => setCalendarDate(new Date())}>Today</button>
          <button type="button" className="schedule-icon-button" aria-label="Previous period" onClick={() => moveCalendar(-1)}><ChevronLeft size={20} /></button>
          <label className="schedule-month-picker"><span className="sr-only">Choose month</span><input type="month" value={monthKey(calendarDate)} onChange={(event) => { if (event.target.value) setCalendarDate(parseDate(`${event.target.value}-01`)) }} /></label>
          <button type="button" className="schedule-icon-button" aria-label="Next period" onClick={() => moveCalendar(1)}><ChevronRight size={20} /></button>
          <div className="schedule-view-switch" role="group" aria-label="Calendar view">
            <button type="button" aria-pressed={mode === 'month'} onClick={() => setMode('month')}>Month</button>
            <button type="button" aria-pressed={mode === 'week'} onClick={() => setMode('week')}>Week</button>
          </div>
        </div>
      </header>
      {error && <p className="schedule-error schedule-page-error" role="alert">{error}</p>}
      <div className={`schedule-calendar schedule-${mode}${mode === 'month' ? ` schedule-month-${days.length / 7}-weeks` : ''}`}>
        <div className="schedule-weekdays" aria-hidden="true">{(mode === 'month' ? WEEKDAYS : days.map((day) => WEEKDAYS[day.getDay()])).map((label, index) => <div key={`${label}-${index}`}>{label}</div>)}</div>
        {loading ? <div className="schedule-loading" role="status">Loading schedule…</div> : <div className="schedule-days">
          {days.map((date) => {
            const dayEvents = eventsForDay(date)
            const outsideMonth = date.getMonth() !== calendarDate.getMonth()
            return <section key={dateKey(date)} className={`schedule-day${outsideMonth && mode === 'month' ? ' outside-month' : ''}${dateKey(date) === dateKey(new Date()) ? ' today' : ''}${dropTargetDate === dateKey(date) ? ' schedule-drop-target' : ''}`} aria-label={displayDate(date)}
              onDragOver={(dragEvent) => {
                if (!canEdit || !draggedEvent || draggedEvent.eventDate === dateKey(date) || movingEventKey) return
                dragEvent.preventDefault()
                dragEvent.dataTransfer.dropEffect = 'move'
                setDropTargetDate(dateKey(date))
              }}
              onDragLeave={(dragEvent) => { if (!dragEvent.currentTarget.contains(dragEvent.relatedTarget)) setDropTargetDate(null) }}
              onDrop={(dropEvent) => {
                dropEvent.preventDefault()
                setDropTargetDate(null)
                if (draggedEvent) void moveEventToDate(draggedEvent, dateKey(date))
              }}>
              <header><span>{date.getDate()}</span>{mode === 'week' && <small>{date.toLocaleDateString(undefined, { month: 'short' })}</small>}{canEdit && <button type="button" className="schedule-day-add" aria-label={`Add event ${dateKey(date)}`} onClick={() => setDialog({ date: dateKey(date) })}><Plus size={15} /></button>}</header>
              <div className="schedule-day-events">{dayEvents.map((event) => {
                const eventKey = `${event.kind}-${event.id}`
                const eventClass = `schedule-event schedule-event-${event.kind === 'game' ? 'game' : event.eventType.toLowerCase().replaceAll(' ', '-')}`
                const eventTitle = `${calendarTime(event)} ${event.name}`
                const isMoving = movingEventKey === eventKey
                return <div key={eventKey} className={eventClass}>
                  <button type="button" className="schedule-event-content" onClick={() => event.kind === 'game' ? onOpenGame(event) : setDialog({ event })} title={eventTitle}>
                    {event.kind === 'game' ? <><span className="schedule-football" aria-hidden="true">🏈</span>{calendarTime(event) && <span className="schedule-event-time">{calendarTime(event)}</span>}<span className="schedule-event-name">{gameEventLabel(event)}</span></> : <>{event.eventType === 'Film Review' ? <ClipboardList size={14} aria-hidden="true" /> : event.eventType === 'Practice' ? <Dumbbell size={14} aria-hidden="true" /> : <Clock3 size={14} aria-hidden="true" />}{eventTime(event) && <span className="schedule-event-time">{calendarTime(event)}</span>}<span className="schedule-event-name">{event.name}</span></>}
                  </button>
                  {canEdit && <button type="button" className="schedule-event-drag-handle" aria-label={`${isMoving ? 'Saving' : 'Drag'} ${event.kind === 'game' ? gameOpponent(event) || 'game' : event.name}`} title={isMoving ? 'Saving event' : 'Drag event'} disabled={isMoving} draggable={!isMoving} aria-busy={isMoving} onDragStart={(dragEvent) => {
                    dragEvent.dataTransfer.effectAllowed = 'move'
                    dragEvent.dataTransfer.setData('text/plain', eventKey)
                    setDraggedEvent(event)
                  }} onDragEnd={() => { setDraggedEvent(null); setDropTargetDate(null) }}>{isMoving ? <LoaderCircle size={15} className="schedule-event-saving-spinner" aria-hidden="true" /> : <GripVertical size={15} aria-hidden="true" />}</button>}
                </div>
              })}</div>
            </section>
          })}
        </div>}
      </div>
      {dialog && <ScheduleEventDialog initialEvent={dialog.event} initialDate={dialog.date} canEdit={canEdit} canCreateGame={canCreateGame} canDelete={canDelete} onCancel={() => setDialog(null)} onSave={saveEvent} onDelete={() => removeEvent(dialog.event)} />}
    </main>
  )
}