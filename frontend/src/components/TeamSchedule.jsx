/*
 * Blitzboard Studio
 * Copyright (c) 2027 Breon Technologies LLC
 * All Rights Reserved
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardList, Clock3, Dumbbell, FolderOpen, GripVertical, LoaderCircle, Menu, Plus, Printer, RefreshCw, Table2, Trash2, Trophy, Users } from 'lucide-react'
import { renderCategoryBadge } from './CategoryBadge'
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog'
import { DialogCloseButton } from './DialogCloseButton'
import { DataGrid } from './DataGrid'
import { ErrorDialog } from './ErrorDialog'
import { LoadingIndicator } from './LoadingIndicator'
import { ScheduleView, buildCalendarDays, scheduleMonths, schedulePeriod, scheduleLoadPeriod, shiftScheduleDate } from '../utils/scheduleCalendar'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SCHEDULE_VIEWS = Object.values(ScheduleView)
const EVENT_INDICATORS = { Practice: '\u25cf', Game: '\u25a0', 'Team Meeting': '\u25b2', 'Film Review': '\u25c6', Other: '\u25cb' }
function savedScheduleView() {
  try {
    const saved = localStorage.getItem('teamScheduleView')
    return SCHEDULE_VIEWS.includes(saved) ? saved : ScheduleView.MONTH
  } catch {
    return ScheduleView.MONTH
  }
}
const EVENT_TYPES = ['Practice', 'Film Review', 'Team Meeting', 'Other']
const EVENT_TYPE_ICONS = {
  Game: Trophy,
  Practice: Dumbbell,
  'Film Review': ClipboardList,
  'Team Meeting': Users,
  Other: CalendarDays,
}
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
const scheduleGridColumns = [
  { key: 'eventDate', header: 'Date', render: (value) => value ? parseDate(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
  { key: 'startTime', header: 'Time', render: (value) => value ? calendarTime({ startTime: value }) : '—' },
  { key: 'name', header: 'Event', render: (value, event) => event.kind === 'game' ? gameEventLabel(event) : value },
  { key: 'eventType', header: 'Type', render: renderCategoryBadge },
  { key: 'location', header: 'Location', render: (value) => value || '—' },
  { key: 'gameSite', header: 'Site', render: (value) => value || '—' },
]

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
      setError(failure)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="schedule-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onCancel() }}>
      <form className="schedule-dialog" onSubmit={submit} aria-busy={saving}>
        <header className="schedule-dialog-header">
          <div><CalendarDays size={20} aria-hidden="true" /><h2>{initialEvent ? 'Edit Event' : 'Add Event'}</h2></div>
          <DialogCloseButton onClick={onCancel} disabled={saving} />
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
            <label className="schedule-field"><span>Date</span><input className="date-picker" type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} required disabled={!canEdit || saving} /></label>
            <label className="schedule-field"><span>Start</span><input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} disabled={!canEdit || saving} /></label>
            {!isGame && <label className="schedule-field"><span>End</span><input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} disabled={!canEdit || saving} /></label>}
          </div>
          {!isGame && <label className="schedule-field"><span>Location</span><input value={location} onChange={(event) => setLocation(event.target.value)} disabled={!canEdit || saving} /></label>}
          {!isGame && <label className="schedule-field"><span>Notes</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows="3" disabled={!canEdit || saving} />
          </label>}
          <ErrorDialog error={error} message="We couldn't save this event. Your changes are still here so you can try again." />
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

function CalendarEventPill({ event, canEdit, movingEventKey, onOpenEvent, onDragEvent, onDragEnd }) {
  const eventKey = `${event.kind}-${event.id}`
  const eventClass = `schedule-event schedule-event-${event.kind === 'game' ? 'game' : event.eventType.toLowerCase().replaceAll(' ', '-')}`
  const isMoving = movingEventKey === eventKey
  return <div className={eventClass}>
    <button type="button" className="schedule-event-content" onClick={() => onOpenEvent(event)} title={`${calendarTime(event)} ${event.name}`}>
      {event.kind === 'game' ? <><span className="schedule-football" aria-hidden="true">🏈</span>{calendarTime(event) && <span className="schedule-event-time">{calendarTime(event)}</span>}<span className="schedule-event-name">{gameEventLabel(event)}</span></> : <>{event.eventType === 'Film Review' ? <ClipboardList size={14} aria-hidden="true" /> : event.eventType === 'Practice' ? <Dumbbell size={14} aria-hidden="true" /> : <Clock3 size={14} aria-hidden="true" />}{eventTime(event) && <span className="schedule-event-time">{calendarTime(event)}</span>}<span className="schedule-event-name">{event.name}</span></>}
    </button>
    {canEdit && <button type="button" className="schedule-event-drag-handle" aria-label={`${isMoving ? 'Saving' : 'Drag'} ${event.kind === 'game' ? gameOpponent(event) || 'game' : event.name}`} title={isMoving ? 'Saving event' : 'Drag event'} disabled={isMoving} draggable={!isMoving} aria-busy={isMoving} onDragStart={(dragEvent) => {
      dragEvent.dataTransfer.effectAllowed = 'move'
      dragEvent.dataTransfer.setData('text/plain', eventKey)
      onDragEvent(event)
    }} onDragEnd={onDragEnd}>{isMoving ? <LoaderCircle size={15} className="schedule-event-saving-spinner" aria-hidden="true" /> : <GripVertical size={15} aria-hidden="true" />}</button>}
  </div>
}

function ScheduleDays({ month, mode, eventsByDate, canEdit, draggedEvent, dropTargetDate, movingEventKey, onDropTarget, onMoveEvent, onAddEvent, ...eventProps }) {
  const days = buildCalendarDays(month, mode)
  const today = dateKey(new Date())
  return <>
    <div className="schedule-weekdays" aria-hidden="true">{WEEKDAYS.map((label) => <div key={label}>{label}</div>)}</div>
    <div className="schedule-days">{days.map((date) => {
      const key = dateKey(date)
      return <section key={key} className={`schedule-day${date.getMonth() !== month.getMonth() && mode === 'month' ? ' outside-month' : ''}${key === today ? ' today' : ''}${dropTargetDate === key ? ' schedule-drop-target' : ''}`} aria-label={displayDate(date)}
        onDragOver={(dragEvent) => {
          if (!canEdit || !draggedEvent || draggedEvent.eventDate === key || movingEventKey) return
          dragEvent.preventDefault()
          dragEvent.dataTransfer.dropEffect = 'move'
          onDropTarget(key)
        }}
        onDragLeave={(dragEvent) => { if (!dragEvent.currentTarget.contains(dragEvent.relatedTarget)) onDropTarget(null) }}
        onDrop={(dropEvent) => {
          dropEvent.preventDefault()
          onDropTarget(null)
          if (draggedEvent) void onMoveEvent(draggedEvent, key)
        }}>
        <header><span>{date.getDate()}</span>{mode === 'week' && <small>{date.toLocaleDateString(undefined, { month: 'short' })}</small>}{canEdit && <button type="button" className="schedule-day-add" aria-label={`Add event ${key}`} onClick={() => onAddEvent(key)}><Plus size={15} /></button>}</header>
        <div className="schedule-day-events">{(eventsByDate.get(key) || []).map((event) => <CalendarEventPill key={`${event.kind}-${event.id}`} event={event} canEdit={canEdit} movingEventKey={movingEventKey} {...eventProps} />)}</div>
      </section>
    })}</div>
  </>
}

export function MonthCalendar({ month, showHeading = false, highlightCurrent = false, ...props }) {
  const weeks = buildCalendarDays(month, 'month').length / 7
  return <section className={`schedule-calendar schedule-month schedule-month-${weeks}-weeks${highlightCurrent ? ' schedule-centered-month' : ''}`} aria-label={month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}>
    {showHeading && <h2 className="schedule-calendar-heading">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>}
    <ScheduleDays month={month} mode="month" {...props} />
  </section>
}

export function YearCalendar({ date, eventsByDate, onSelectMonth }) {
  const today = dateKey(new Date())
  return <div className="schedule-year">
    <div className="schedule-year-legend" aria-label="Event types">{Object.entries(EVENT_INDICATORS).map(([type, symbol]) => <span key={type}><span className={`schedule-indicator schedule-indicator-${type.toLowerCase().replaceAll(' ', '-')}`} aria-hidden="true">{symbol}</span>{type}</span>)}</div>
    <div className="schedule-year-months">{scheduleMonths(date, ScheduleView.YEAR).map((month) => <button key={monthKey(month)} type="button" className="schedule-mini-month" aria-label={`Open ${month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`} onClick={() => onSelectMonth(month)}>
      <span className="schedule-mini-heading">{month.toLocaleDateString(undefined, { month: 'long' })}</span>
      <span className="schedule-mini-weekdays" aria-hidden="true">{WEEKDAYS.map((day) => <span key={day}>{day.slice(0, 2)}</span>)}</span>
      <span className="schedule-mini-days">{buildCalendarDays(month, 'month').map((day) => {
        const key = dateKey(day)
        const inMonth = day.getMonth() === month.getMonth()
        const dayEvents = inMonth ? eventsByDate.get(key) || [] : []
        const types = [...new Set(dayEvents.map((event) => event.eventType))]
        return <span key={key} className={`schedule-mini-day${key === today ? ' today' : ''}`} title={inMonth ? `${displayDate(day)}${dayEvents.length ? `: ${dayEvents.map((event) => `${calendarTime(event)} ${event.name}`).join(', ')}` : ''}` : undefined}>
          {inMonth && <><span>{day.getDate()}</span><span className="schedule-mini-indicators">{types.map((type) => <span key={type} className={`schedule-indicator schedule-indicator-${type.toLowerCase().replaceAll(' ', '-')}`} aria-label={`${dayEvents.filter((event) => event.eventType === type).length} ${type}`}>{EVENT_INDICATORS[type] || EVENT_INDICATORS.Other}</span>)}</span></>}
        </span>
      })}</span>
    </button>)}</div>
  </div>
}

export function TeamSchedule({ api, displayMode, onDisplayModeChange, canEdit, canDelete, canCreateGame, onCreateGame, onOpenGame, onWorkspaceUpdated }) {
  const cacheVersion = useSyncExternalStore(api.breadcrumbCache.subscribe, api.breadcrumbCache.getSnapshot)
  const [calendarDate, setCalendarDate] = useState(() => new Date())
  const [mode, setMode] = useState(savedScheduleView)
  const [viewMenuOpen, setViewMenuOpen] = useState(false)
  const [events, setEvents] = useState([])
  const [loadedRequest, setLoadedRequest] = useState(null)
  const [error, setError] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const [dialog, setDialog] = useState(null)
  const [eventToDelete, setEventToDelete] = useState(null)
  const [draggedEvent, setDraggedEvent] = useState(null)
  const [dropTargetDate, setDropTargetDate] = useState(null)
  const [movingEventKey, setMovingEventKey] = useState(null)
  const viewMenuRef = useRef(null)
  const { start: loadStart, end: loadEnd } = scheduleLoadPeriod(calendarDate, mode, displayMode)
  const loadSummary = mode === ScheduleView.YEAR && displayMode === 'calendar'
  const loadRequestKey = `${loadStart}/${loadEnd}/${loadSummary}/${refresh}/${cacheVersion}`
  const loading = loadedRequest !== loadRequestKey

  useEffect(() => {
    try { localStorage.setItem('teamScheduleView', mode) } catch { return }
  }, [mode])

  useEffect(() => {
    if (!viewMenuOpen) return undefined
    function handleOutsideClick(event) {
      if (!viewMenuRef.current?.contains(event.target)) setViewMenuOpen(false)
    }
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setViewMenuOpen(false)
        viewMenuRef.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [viewMenuOpen])

  useEffect(() => {
    let active = true
    const range = { start: loadStart, end: loadEnd, summary: loadSummary }
    Promise.all([api.listScheduleEvents(range), api.listGamePlans(undefined, undefined, false, range)])
      .then(([eventResult, gameResult]) => {
        if (!active) return
        const regularEvents = eventResult.items.map((event) => ({ ...event, kind: 'event', eventDate: event.eventDate }))
        const games = gameResult.items.filter((game) => game.gameDate && game.recordStatus !== 'Archived').map((game) => ({ ...game, kind: 'game', eventType: 'Game', eventDate: game.gameDate }))
        setEvents([...regularEvents, ...games].sort((a, b) => `${a.eventDate} ${eventTime(a)}`.localeCompare(`${b.eventDate} ${eventTime(b)}`)))
        setError(null)
      })
      .catch((failure) => { if (active) setError(failure) })
      .finally(() => { if (active) setLoadedRequest(loadRequestKey) })
    return () => { active = false }
  }, [api, loadStart, loadEnd, loadSummary, loadRequestKey])

  const { start: periodStart, end: periodEnd } = schedulePeriod(calendarDate, mode)
  const todayKey = dateKey(new Date())
  const periodEvents = events
    .filter((event) => event.eventDate >= periodStart && event.eventDate <= periodEnd)
    .sort((left, right) => right.eventDate.localeCompare(left.eventDate))

  function openEvent(event) {
    if (event.kind === 'game') onOpenGame(event)
    else setDialog({ event })
  }

  function moveCalendar(direction) {
    setCalendarDate((current) => shiftScheduleDate(current, mode, direction))
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
      setError(failure)
    } finally {
      setMovingEventKey(null)
      setDraggedEvent(null)
      setDropTargetDate(null)
    }
  }

  async function removeEvent(event) {
    if (!canDelete) return
    try {
      if (event.kind === 'game') await api.deleteGamePlan(event.id)
      else await api.deleteScheduleEvent(event.id)
      setDialog(null)
      setRefresh((value) => value + 1)
      onWorkspaceUpdated?.()
    } catch (failure) {
      setError(failure)
      throw failure
    }
  }

  const eventsByDate = new Map()
  for (const event of events) {
    if (event._gridDeleted) continue
    if (!eventsByDate.has(event.eventDate)) eventsByDate.set(event.eventDate, [])
    eventsByDate.get(event.eventDate).push(event)
  }
  const calendarProps = {
    eventsByDate, canEdit, draggedEvent, dropTargetDate, movingEventKey,
    onDropTarget: setDropTargetDate, onMoveEvent: moveEventToDate,
    onAddEvent: (date) => setDialog({ date }), onOpenEvent: openEvent,
    onDragEvent: setDraggedEvent, onDragEnd: () => { setDraggedEvent(null); setDropTargetDate(null) },
  }

  return (
    <main className="team-schedule">
      <header className="schedule-toolbar">
        <div className="schedule-subtoolbar-actions">
          <button type="button" className="toolbar-new-button" disabled={!canEdit} onClick={() => setDialog({ date: dateKey(calendarDate) })}><Plus size={18} /> New Event</button>
          <label className="schedule-jump-picker" htmlFor="jump-to-date"><span>Jump to</span><input className="date-picker" id="jump-to-date" aria-label="Jump to date" type="date" value={dateKey(calendarDate)} onChange={(event) => { if (event.target.value) setCalendarDate(parseDate(event.target.value)) }} /></label>
        </div>
        <div className="schedule-toolbar-controls">
          <button type="button" className="schedule-secondary-button" onClick={() => setCalendarDate(new Date())}>Today</button>
          <button type="button" className="schedule-icon-button" aria-label="Previous period" onClick={() => moveCalendar(-1)}><ChevronLeft size={20} /></button>
          <label className="schedule-month-picker"><span className="sr-only">Choose month</span><input type="month" value={monthKey(calendarDate)} onChange={(event) => { if (event.target.value) setCalendarDate(parseDate(`${event.target.value}-01`)) }} /></label>
          <button type="button" className="schedule-icon-button" aria-label="Next period" onClick={() => moveCalendar(1)}><ChevronRight size={20} /></button>
          <div className="schedule-view-actions">
            <div className="schedule-view-switch" role="group" aria-label="Calendar view">
              {SCHEDULE_VIEWS.map((view) => <button key={view} type="button" aria-pressed={mode === view} onClick={() => setMode(view)}>{view[0].toUpperCase() + view.slice(1)}</button>)}
            </div>
            <div className="schedule-view-menu" ref={viewMenuRef}>
              <button type="button" className="hamburger-button" aria-label="Schedule view options" aria-haspopup="true" aria-expanded={viewMenuOpen} title="Schedule view options" onClick={() => setViewMenuOpen((open) => !open)}>
                <Menu size={19} aria-hidden="true" />
              </button>
              {viewMenuOpen && <div className="toolbar-dropdown data-grid-toolbar-dropdown schedule-view-dropdown" role="menu" aria-label="Schedule options">
                <div className="data-grid-menu-panes">
                  <div className="data-grid-status-filter" role="group" aria-label="Schedule view">
                    <div className="account-menu-section-label">View</div>
                    {[
                      { id: 'calendar', label: 'Calendar View', icon: CalendarDays },
                      { id: 'grid', label: 'Grid View', icon: Table2 },
                    ].map(({ id, label, icon: Icon }) => (
                      <button key={id} type="button" role="menuitemradio" aria-checked={displayMode === id} onClick={() => { onDisplayModeChange(id); setViewMenuOpen(false) }}>
                        <Icon size={16} className="data-grid-option-icon" aria-hidden="true" />
                        <span>{label}</span>
                        <Check size={16} className="data-grid-status-check" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                  <div className="data-grid-menu-actions" role="group" aria-label="Schedule actions">
                    <div className="account-menu-section-label">Actions</div>
                    <button type="button" role="menuitem" onClick={() => { api.breadcrumbCache.clear(); setRefresh((value) => value + 1); setViewMenuOpen(false) }}>
                      <RefreshCw className="menu-item-icon" aria-hidden="true" />
                      <span className="data-grid-menu-action-label">Refresh</span>
                    </button>
                    <button type="button" role="menuitem" onClick={() => { window.print(); setViewMenuOpen(false) }}>
                      <Printer className="menu-item-icon" aria-hidden="true" />
                      <span className="data-grid-menu-action-label">Print</span>
                    </button>
                  </div>
                </div>
              </div>}
            </div>
          </div>
        </div>
      </header>
      <ErrorDialog error={error} message="We couldn't load or update your schedule. Please try again." />
      {displayMode === 'calendar' ? loading ? <LoadingIndicator className="schedule-loading" label="Loading schedule..." />
        : mode === ScheduleView.YEAR ? <YearCalendar date={calendarDate} eventsByDate={eventsByDate} onSelectMonth={(month) => { setCalendarDate(month); setMode(ScheduleView.MONTH) }} />
          : mode === ScheduleView.QUARTER ? <div className="schedule-quarter">{scheduleMonths(calendarDate, mode).map((month, index) => <MonthCalendar key={monthKey(month)} month={month} showHeading highlightCurrent={index === 1} {...calendarProps} />)}</div>
            : mode === ScheduleView.MONTH ? <MonthCalendar month={calendarDate} {...calendarProps} />
              : <div className="schedule-calendar schedule-week"><ScheduleDays month={calendarDate} mode="week" {...calendarProps} /></div>
        : <section className="schedule-grid-view" aria-label="Schedule events">
        {loading ? <LoadingIndicator className="schedule-loading" label="Loading schedule..." /> : !error && <DataGrid
          title="Schedule Events"
          columns={scheduleGridColumns}
          items={periodEvents}
          compact
          rowType="Event"
          getRowIcon={(event) => EVENT_TYPE_ICONS[event.eventType] || Clock3}
          rowClassName={(event) => event.eventDate < todayKey ? 'schedule-grid-row-past' : undefined}
          onRowDoubleClick={openEvent}
          rowActions={(event) => [{ label: 'Open', icon: FolderOpen, onClick: () => openEvent(event) }]}
        />}
      </section>}
      {dialog && <ScheduleEventDialog initialEvent={dialog.event} initialDate={dialog.date} canEdit={canEdit} canCreateGame={canCreateGame} canDelete={canDelete} onCancel={() => setDialog(null)} onSave={saveEvent} onDelete={() => setEventToDelete(dialog.event)} />}
      {eventToDelete && <DeleteConfirmationDialog
        message={`Are you sure you want to delete "${eventToDelete.kind === 'game' ? eventToDelete.opponent || eventToDelete.name : eventToDelete.name}"? This cannot be undone.`}
        onCancel={() => setEventToDelete(null)}
        onConfirm={() => removeEvent(eventToDelete)}
      />}
    </main>
  )
}