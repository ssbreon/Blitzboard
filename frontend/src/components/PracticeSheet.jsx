import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDown, ArrowUp, BookOpen, BookOpenCheck, CalendarDays, Check, ClipboardList, Clock3, GripVertical, Menu, Paperclip, Pencil, Plus, Printer, RefreshCw, Save, Table2, Trash2 } from 'lucide-react'
import { ErrorDialog } from './ErrorDialog'
import { LoadingIndicator } from './LoadingIndicator'
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog'
import { DialogCloseButton } from './DialogCloseButton'
import { DataGrid } from './DataGrid'
import { linkedPracticeEventIds } from '../utils/gamePlanWorkspace'
import './PracticeSheet.css'
import './GamePlanWorkspace.css'

const newActivity = () => ({ id: crypto.randomUUID(), name: '', group: 'Team', coach: '' })
export const ACTIVITY_GROUPS = ['Team', 'QB', 'RB', 'WR', 'OL', 'DB', 'LB', 'DLINE']
const newPeriod = (startTime = '', duration = '', name = '') => ({ id: crypto.randomUUID(), name, startTime, duration, groupBreakdown: 'No', activities: [newActivity()] })
const parsePracticeClockTime = (value) => /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(value || '')
// Format a 24-hour clock value for display in the practice sheet.
export function practiceSheetTimeLabel(value) {
  const match = parsePracticeClockTime(value)
  return match ? new Date(2000, 0, 1, Number(match[1]), Number(match[2])).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : value || ''
}
// Format the event date for the practice sheet header.
export function practiceSheetDateLabel(value) {
  return value ? new Date(`${value}T00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'Date not set'
}
// Use the event start time or the standard afternoon practice start.
export function defaultPracticePeriodStart(value) {
  const match = parsePracticeClockTime(value)
  return match ? `${match[1]}:${match[2]}` : '15:30'
}
export const PRACTICE_PLAN_GRID_COLUMNS = [
  { key: 'start', header: 'Start' },
  { key: 'minutes', header: 'Minutes' },
  { key: 'period', header: 'Period' },
  { key: 'activities', header: 'Activities', render: (groups) => <div className="practice-grid-activities">{groups.length ? <div className="practice-grid-activity-list">{groups.map(({ group, activities }) => <div className="practice-grid-activity-group" key={group}><span className="practice-grid-activity-group-label">{group}</span><div className="practice-grid-activity-items">{activities.map((activity, index) => <div className="practice-grid-activity-item" key={`${activity.name}-${index}`}><span className="practice-grid-activity-name">{activity.name}</span>{activity.coach && <span className="practice-grid-activity-coach">Coach {activity.coach}</span>}</div>)}</div></div>)}</div> : <span className="practice-grid-activity-empty">—</span>}</div> },
]

export function reorderPracticeSheetAttachments(playbookIds, draggedId, targetId) {
  const sourceIndex = playbookIds.indexOf(draggedId)
  const targetIndex = playbookIds.indexOf(targetId)
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return playbookIds
  const reordered = [...playbookIds]
  reordered.splice(sourceIndex, 1)
  reordered.splice(reordered.indexOf(targetId), 0, draggedId)
  return reordered
}

// Normalize a period's group breakdown to the supported Yes or No values.
export function practicePeriodGroupBreakdown(period = {}) {
  return period.groupBreakdown === 'Yes' ? 'Yes' : 'No'
}

// Render the practice plan and manage its editing, loading, and save lifecycle.
export function PracticeSheet({ api, eventId, canEdit, periodSuggestions = [], breadcrumbSettingsTarget, onEditEvent, onSaved, onGuardChange, onEventLoaded, playbooks, playbooksLoading = false, onCreatePracticeScript, onOpenScript, onPrintAttachments }) {
  const [event, setEvent] = useState(null)
  const [sheet, setSheet] = useState({ periods: [] })
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [revision, setRevision] = useState(0)
  const [practicePlanView, setPracticePlanView] = useState('planning')
  const [menuOpen, setMenuOpen] = useState(false)
  const [activityToDelete, setActivityToDelete] = useState(null)
  const menuRef = useRef(null)
  const [schedulePlaybooks, setSchedulePlaybooks] = useState([])
  const [loadingPlaybooks, setLoadingPlaybooks] = useState(false)
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false)
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState(new Set())
  const [draggingAttachmentId, setDraggingAttachmentId] = useState(null)
  const [attachmentDropTarget, setAttachmentDropTarget] = useState(null)
  const [printDialogOpen, setPrintDialogOpen] = useState(false)
  const [printAttachmentsSelected, setPrintAttachmentsSelected] = useState(true)
  const [draggingPeriodId, setDraggingPeriodId] = useState(null)
  const [periodDropTarget, setPeriodDropTarget] = useState(null)

  useEffect(() => {
    // Ignore a response if this event load is superseded or the sheet unmounts.
    let active = true
    api.getScheduleEvent(eventId).then((result) => {
      if (!active) return
      setEvent(result)
      onEventLoaded?.(result)
      const practiceSheet = result.practiceSheet || { periods: [] }
      const hasEmptyGroups = practiceSheet.periods?.some((period) => period.activities?.some((activity) => !activity.group))
      const hasMissingGroupBreakdown = practiceSheet.periods?.some((period) => period.groupBreakdown !== 'Yes' && period.groupBreakdown !== 'No')
      const hasLegacyPeriodScripts = practiceSheet.periods?.some((period) => Object.hasOwn(period, 'practiceScriptId'))
      const shouldNormalize = hasEmptyGroups || hasMissingGroupBreakdown || hasLegacyPeriodScripts
      // Normalize legacy period fields on load so scripts are associated only with the Practice Sheet.
      setSheet(shouldNormalize ? {
        ...practiceSheet,
        periods: practiceSheet.periods.map((period) => {
          const normalizedPeriod = { ...period }
          delete normalizedPeriod.practiceScriptId
          return {
            ...normalizedPeriod,
            groupBreakdown: period.groupBreakdown === 'Yes' ? 'Yes' : 'No',
            activities: (period.activities || []).map((activity) => activity.group ? activity : { ...activity, group: 'Team' }),
          }
        }),
      } : practiceSheet)
      setDirty(Boolean(canEdit && shouldNormalize))
      setError(null)
    }).catch((failure) => { if (active) setError(failure) })
    return () => { active = false }
  }, [api, eventId, revision, onEventLoaded])

  useEffect(() => {
    // Prefer playbooks supplied by the parent; fetch only when this sheet owns the lookup.
    if (playbooks !== undefined || !event) return undefined
    let active = true
    setLoadingPlaybooks(true)
    api.listPlaybooks()
      .then(({ items }) => {
        if (!active) return
        setSchedulePlaybooks(items)
      })
      .catch((failure) => { if (active) { setSchedulePlaybooks([]); setError(failure) } })
      .finally(() => { if (active) setLoadingPlaybooks(false) })
    return () => { active = false }
  }, [api, event, playbooks])

  useEffect(() => {
    function warnBeforeUnload(event) {
      // Keep browser close or reload from silently discarding an edited sheet.
      if (dirty) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [dirty])

  useEffect(() => {
    // Let the parent save the latest sheet before continuing navigation.
    onGuardChange?.({ dirty, saving: busy, canSave: true, save })
    return () => onGuardChange?.(null)
  }, [dirty, busy, sheet, eventId, api, onSaved, onGuardChange])

  useEffect(() => {
    if (!menuOpen) return undefined
    function handleOutsideClick(event) {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false)
    }
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        // Return keyboard focus to the control that opened the menu.
        menuRef.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [menuOpen])

  function changePeriods(update) {
    // Centralize period edits so every change also marks the sheet as unsaved.
    setSheet((current) => ({ ...current, periods: update(current.periods || []) }))
    setDirty(true)
  }

  function changePeriod(index, patch) {
    changePeriods((periods) => {
      const next = periods.map((period, current) => current === index ? { ...period, ...patch } : period)
      // A timing edit shifts only later periods; the edited period keeps its chosen start time.
      return Object.hasOwn(patch, 'startTime') || Object.hasOwn(patch, 'duration')
        ? cascadePracticePeriodStarts(next, index + 1)
        : next
    })
  }

  function changeActivity(periodIndex, activityIndex, patch) {
    changePeriods((periods) => periods.map((period, current) => current === periodIndex
      ? { ...period, activities: (period.activities || []).map((activity, index) => index === activityIndex ? { ...activity, ...patch } : activity) }
      : period))
  }

  function movePeriod(index, direction) {
    changePeriods((periods) => reorderPracticePeriods(periods, index, index + direction))
  }

  function dragPeriodOver(event, targetIndex, targetId) {
    if (!draggingPeriodId || draggingPeriodId === targetId) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const rect = event.currentTarget.getBoundingClientRect()
    const after = event.clientY > rect.top + rect.height / 2
    setPeriodDropTarget((current) => current?.id === targetId && current.after === after ? current : { id: targetId, index: targetIndex, after })
  }

  function dropPeriod(event, targetIndex) {
    event.preventDefault()
    // Native drag data survives the pointer interaction; state is the fallback for browsers without it.
    const sourceId = event.dataTransfer.getData('text/plain') || draggingPeriodId
    const sourceIndex = periods.findIndex((period, index) => (period.id || String(index)) === sourceId)
    if (sourceIndex >= 0) {
      const rect = event.currentTarget.getBoundingClientRect()
      const insertionIndex = targetIndex + (event.clientY > rect.top + rect.height / 2 ? 1 : 0)
      // Removing an earlier source shifts the insertion point back by one.
      const destination = sourceIndex < insertionIndex ? insertionIndex - 1 : insertionIndex
      changePeriods((current) => reorderPracticePeriods(current, sourceIndex, destination))
    }
    setDraggingPeriodId(null)
    setPeriodDropTarget(null)
  }

  function finishPeriodDrag() {
    setDraggingPeriodId(null)
    setPeriodDropTarget(null)
  }

  async function save() {
    // Reject incomplete timings before sending the whole sheet to the API.
    if ((sheet.periods || []).some((period) => !period.startTime || !practicePeriodEndTime(period.startTime, period.duration))) {
      setError(new Error('Every practice period needs a valid Start time and a Minutes value greater than zero.'))
      return false
    }
    setBusy(true)
    setError(null)
    try {
      const saved = await api.updateScheduleEvent(eventId, { practiceSheet: sheet })
      setEvent(saved)
      setDirty(false)
      onSaved?.()
      return true
    } catch (failure) { setError(failure) }
    finally { setBusy(false) }
    return false
  }

  function leave(action) {
    // Refresh and event editing both replace the current view, so guard them when edits are pending.
    if (!dirty || window.confirm('Discard unsaved practice sheet changes?')) action()
  }

  function refreshPractice() {
    setMenuOpen(false)
    leave(() => setRevision((value) => value + 1))
  }

  if (!event) return <section className="practice-sheet"><ErrorDialog error={error} message="We couldn't load this practice." />{error ? <button type="button" className="secondary-button" onClick={() => setRevision((value) => value + 1)}>Retry</button> : <LoadingIndicator label="Loading practice..." />}</section>

  const periods = sheet.periods || []
  const lastPeriod = periods[periods.length - 1]
  const canAddPeriod = !lastPeriod || Boolean(practicePeriodEndTime(lastPeriod.startTime, lastPeriod.duration))
  const gamePlanIds = new Set(event.gamePlanIds || [])
  const attachablePlaybooks = (playbooks ?? schedulePlaybooks).filter((playbook) => {
    const supportedType = playbook.gameCardId?.endsWith('-scout') || playbook.gameCardId?.endsWith('-installs')
    const alreadyAttached = linkedPracticeEventIds(playbook).includes(eventId)
    return supportedType && (alreadyAttached || (playbook.recordStatus !== 'Archived' && gamePlanIds.has(playbook.gamePlanId)))
  })
  const attachedItems = attachablePlaybooks.filter((playbook) => linkedPracticeEventIds(playbook).includes(eventId))
  const attachedById = new Map(attachedItems.map((playbook) => [playbook.id, playbook]))
  const orderedAttachedIds = Array.isArray(sheet.attachedPlaybookIds) ? sheet.attachedPlaybookIds : []
  const orderedAttachedPlaybooks = orderedAttachedIds.map((id) => attachedById.get(id)).filter(Boolean)
  const orderedAttachedSet = new Set(orderedAttachedPlaybooks.map((playbook) => playbook.id))
  const attachedPlaybooks = [...orderedAttachedPlaybooks, ...attachedItems.filter((playbook) => !orderedAttachedSet.has(playbook.id))]
  const attachmentChanges = attachablePlaybooks.some((playbook) => selectedAttachmentIds.has(playbook.id) !== linkedPracticeEventIds(playbook).includes(eventId))
  const gridRows = practicePlanGridRows(periods)
  const gridColumns = PRACTICE_PLAN_GRID_COLUMNS

  function openAttachmentDialog() {
    setSelectedAttachmentIds(new Set(attachedPlaybooks.map((playbook) => playbook.id)))
    setAttachmentDialogOpen(true)
  }

  function requestPrintSheet() {
    setMenuOpen(false)
    if (!attachedPlaybooks.length) {
      window.print()
      return
    }
    setPrintAttachmentsSelected(true)
    setPrintDialogOpen(true)
  }

  function confirmPrintSheet() {
    setPrintDialogOpen(false)
    window.setTimeout(() => {
      if (printAttachmentsSelected && attachedPlaybooks.length && onPrintAttachments) {
        const attachmentsToPrint = [...attachedPlaybooks]
        window.addEventListener('afterprint', () => onPrintAttachments(attachmentsToPrint), { once: true })
      }
      window.print()
    }, 0)
  }

  function updateAttachmentOrder(nextIds) {
    setSheet((current) => ({ ...current, attachedPlaybookIds: nextIds }))
    setDirty(true)
  }

  function dragAttachmentOver(input, targetId) {
    if (!draggingAttachmentId || draggingAttachmentId === targetId) return
    input.preventDefault()
    input.dataTransfer.dropEffect = 'move'
    setAttachmentDropTarget(targetId)
  }

  function dropAttachment(input, targetId) {
    input.preventDefault()
    const sourceId = input.dataTransfer.getData('text/plain') || draggingAttachmentId
    const currentIds = attachedPlaybooks.map((playbook) => playbook.id)
    const nextIds = reorderPracticeSheetAttachments(currentIds, sourceId, targetId)
    if (nextIds !== currentIds) updateAttachmentOrder(nextIds)
    setDraggingAttachmentId(null)
    setAttachmentDropTarget(null)
  }

  function finishAttachmentDrag() {
    setDraggingAttachmentId(null)
    setAttachmentDropTarget(null)
  }

  function moveAttachmentWithKeyboard(playbookId, direction) {
    const currentIds = attachedPlaybooks.map((playbook) => playbook.id)
    const sourceIndex = currentIds.indexOf(playbookId)
    const targetIndex = sourceIndex + direction
    if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= currentIds.length) return
    const nextIds = [...currentIds]
    ;[nextIds[sourceIndex], nextIds[targetIndex]] = [nextIds[targetIndex], nextIds[sourceIndex]]
    updateAttachmentOrder(nextIds)
  }

  async function saveAttachments() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await Promise.all(attachablePlaybooks.map((playbook) => {
        const currentIds = linkedPracticeEventIds(playbook)
        const isSelected = selectedAttachmentIds.has(playbook.id)
        if (isSelected === currentIds.includes(eventId)) return Promise.resolve()
        const practiceEventIds = isSelected ? [...currentIds, eventId] : currentIds.filter((id) => id !== eventId)
        return api.updatePlaybook(playbook.id, { practiceEventIds })
      }))
      const currentAttachedIds = attachedPlaybooks.map((playbook) => playbook.id)
      const nextAttachedPlaybookIds = [
        ...currentAttachedIds.filter((id) => selectedAttachmentIds.has(id)),
        ...attachablePlaybooks.filter((playbook) => selectedAttachmentIds.has(playbook.id) && !currentAttachedIds.includes(playbook.id)).map((playbook) => playbook.id),
      ]
      const nextSheet = { ...sheet, attachedPlaybookIds: nextAttachedPlaybookIds }
      const savedEvent = await api.updateScheduleEvent(eventId, { practiceSheet: nextSheet })
      setSchedulePlaybooks((current) => current.map((playbook) => {
        if (!attachablePlaybooks.some((item) => item.id === playbook.id)) return playbook
        const practiceEventIds = linkedPracticeEventIds(playbook).filter((id) => id !== eventId)
        if (!selectedAttachmentIds.has(playbook.id)) return { ...playbook, practiceEventIds }
        return { ...playbook, practiceEventIds: [...practiceEventIds, eventId] }
      }))
      setEvent(savedEvent)
      setSheet(savedEvent.practiceSheet || nextSheet)
      setDirty(false)
      setAttachmentDialogOpen(false)
      onSaved?.()
    } catch (failure) { setError(failure) }
    finally { setBusy(false) }
  }
  return <section className="practice-sheet" aria-label="Practice sheet" aria-busy={busy}>
    {canEdit && breadcrumbSettingsTarget && createPortal(<button type="button" className="breadcrumb-settings breadcrumb-settings-icon-only" onClick={() => leave(() => onEditEvent(event))} disabled={busy} title="Edit Event" aria-label="Edit Event"><Pencil size={18} aria-hidden="true" /></button>, breadcrumbSettingsTarget)}
    <header className="practice-sheet-header">
      <div className="practice-sheet-header-details"><p className="practice-sheet-eyebrow">Practice Sheet</p><h1>{event.name}</h1><div className="practice-sheet-header-meta-overlay"><p className="practice-sheet-meta"><CalendarDays size={16} /><span>{practiceSheetDateLabel(event.eventDate)}</span>{(event.startTime || event.endTime) && <span>{event.startTime && practiceSheetTimeLabel(event.startTime)}{event.startTime && event.endTime && ' - '}{!event.startTime && event.endTime && practiceSheetTimeLabel(event.endTime)}{event.startTime && event.endTime && practiceSheetTimeLabel(event.endTime)}</span>}{event.location && <span>at {event.location}</span>}</p>{(event.dress || event.notes) && <div className="practice-sheet-dress-row">{event.dress && <p className="practice-sheet-dress"><strong>Dress</strong><span>{event.dress}</span></p>}{event.notes && <p className="practice-sheet-event-notes" title={event.notes}><strong>Notes</strong><span>{event.notes}</span></p>}</div>}</div></div>
    </header>
    <ErrorDialog error={error} message="We couldn't save the practice sheet. Your changes are still here." />
    {activityToDelete && <DeleteConfirmationDialog
      message={`Are you sure you want to delete activity "${activityToDelete.name || 'Unnamed'}"? This cannot be undone.`}
      onCancel={() => setActivityToDelete(null)}
      onConfirm={() => {
        const { periodIndex, activityIndex } = activityToDelete
        const activities = sheet.periods?.[periodIndex]?.activities || []
        changePeriod(periodIndex, { activities: activities.filter((_, index) => index !== activityIndex) })
      }}
    />}
    <div className="practice-sheet-body">
    <div className="practice-sheet-content">
      <datalist id="practice-period-suggestions">{periodSuggestions.map((value) => <option key={value} value={value} />)}</datalist>
      <div className="practice-sheet-section-heading practice-plan-controls">{canEdit && practicePlanView === 'planning' && <button type="button" className="primary-button" title={canAddPeriod ? 'Add period' : 'Set the previous period Start and Minutes first'} onClick={() => changePeriods((current) => [...current, current.length ? newPeriod(practicePeriodEndTime(lastPeriod?.startTime, lastPeriod?.duration)) : newPeriod(defaultPracticePeriodStart(event.startTime), '15', 'STRETCH')])} disabled={busy || !canAddPeriod}><Plus size={16} />Add Period</button>}<div className="toolbar-menu practice-plan-menu" ref={menuRef}>
        <button type="button" className="hamburger-button" aria-label="Practice Plan options" aria-haspopup="true" aria-expanded={menuOpen} title="Practice Plan options" onClick={() => setMenuOpen((open) => !open)}><Menu size={19} aria-hidden="true" /></button>
        {menuOpen && <div className="toolbar-dropdown data-grid-toolbar-dropdown practice-plan-dropdown" role="menu" aria-label="Practice Plan options"><div className="data-grid-menu-panes">
          <div className="data-grid-status-filter" role="group" aria-label="Practice Plan view"><div className="account-menu-section-label">View</div>{[{ id: 'planning', label: 'Planning View', icon: ClipboardList }, { id: 'grid', label: 'Grid View', icon: Table2 }].map(({ id, label, icon: Icon }) => <button key={id} type="button" role="menuitemradio" className="menu-item-radio" aria-checked={practicePlanView === id} onClick={() => { setPracticePlanView(id); setMenuOpen(false) }}><Icon size={16} className="data-grid-option-icon" aria-hidden="true" /><span>{label}</span><Check size={16} className="data-grid-status-check" aria-hidden="true" /></button>)}</div>
          <div className="data-grid-menu-actions" role="group" aria-label="Practice Plan actions"><div className="account-menu-section-label">Actions</div><button type="button" role="menuitem" className="menu-item" onClick={refreshPractice}><RefreshCw className="menu-item-icon" aria-hidden="true" /><span className="data-grid-menu-action-label">Refresh</span></button><button type="button" role="menuitem" className="menu-item" onClick={requestPrintSheet}><Printer className="menu-item-icon" aria-hidden="true" /><span className="data-grid-menu-action-label">Print Sheet...</span></button></div>
        </div></div>}
      </div>{canEdit && <button type="button" className="secondary-button" onClick={refreshPractice} disabled={!dirty || busy}>Cancel</button>}{canEdit && <button type="button" className="primary-button" onClick={save} disabled={!dirty || busy}><Save size={16} />{busy ? 'Saving...' : 'Save Sheet'}</button>}</div>
      {practicePlanView === 'grid' ? <DataGrid title="Practice Plan" rowIcon={Clock3} rowType="Period" columns={gridColumns} items={gridRows} compact hideToolbar hidePager /> : <>
      {!periods.length && <p className="practice-sheet-empty">No periods added.</p>}
      {periods.map((period, periodIndex) => {
        const periodId = period.id || String(periodIndex)
        const periodContentId = `practice-period-content-${periodIndex}`
        const groupBreakdown = practicePeriodGroupBreakdown(period)
        // Activity details are shown only when this period has a group breakdown.
        const periodCollapsed = groupBreakdown !== 'Yes'
        const activityRows = (period.activities || []).map((activity, activityIndex) => ({
          ...activity,
          id: activity.id || `${periodId}:activity:${activityIndex}`,
          page: activityIndex + 1,
          activityIndex,
        }))
        const activityColumns = [
          { key: 'group', header: 'Group', render: (value, row) => <><select aria-label={`Group for period ${periodIndex + 1} activity ${row.activityIndex + 1}`} value={value || 'Team'} disabled={!canEdit || busy} onChange={(input) => changeActivity(periodIndex, row.activityIndex, { group: input.target.value })}>{value && !ACTIVITY_GROUPS.includes(value) && <option value={value}>{value}</option>}{ACTIVITY_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}</select><span className="practice-print-value">{value || 'Team'}</span></> },
          { key: 'name', header: 'Activity', render: (value, row) => <><input aria-label={`Activity for period ${periodIndex + 1} row ${row.activityIndex + 1}`} value={value || ''} disabled={!canEdit || busy} onChange={(input) => changeActivity(periodIndex, row.activityIndex, { name: input.target.value })} /><span className="practice-print-value">{value || '-'}</span></> },
          { key: 'coach', header: 'Coach', render: (value, row) => <><input aria-label={`Coach for period ${periodIndex + 1} activity ${row.activityIndex + 1}`} value={value || ''} disabled={!canEdit || busy} onChange={(input) => changeActivity(periodIndex, row.activityIndex, { coach: input.target.value })} /><span className="practice-print-value">{value || '-'}</span></> },
        ]
        return <section className={`practice-period${periodDropTarget?.id === periodId ? periodDropTarget.after ? ' is-drop-after' : ' is-drop-before' : ''}`} key={periodId} aria-label={`Period ${periodIndex + 1}`} onDragOver={(event) => dragPeriodOver(event, periodIndex, periodId)} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPeriodDropTarget(null) }} onDrop={(event) => dropPeriod(event, periodIndex)}>
        <div className="practice-period-heading">
          <span className="practice-period-number">{String(periodIndex + 1).padStart(2, '0')}</span>
          <button type="button" className="practice-period-drag-handle" aria-label={`Drag period ${periodIndex + 1}`} title="Drag to reorder period" draggable={canEdit && !busy} disabled={!canEdit || busy} onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', periodId); setDraggingPeriodId(periodId); setPeriodDropTarget(null) }} onDragEnd={finishPeriodDrag}><GripVertical size={17} aria-hidden="true" /></button>
          <label><span>Start</span><input aria-label={`Period ${periodIndex + 1} start`} type="time" required value={period.startTime || ''} disabled={!canEdit || busy} onChange={(input) => changePeriod(periodIndex, { startTime: input.target.value })} /><span className="practice-print-value">{period.startTime || '-'}</span></label>
          <label><span>Minutes</span><input aria-label={`Period ${periodIndex + 1} minutes`} type="number" min="1" step="1" required value={period.duration ?? ''} disabled={!canEdit || busy} onChange={(input) => changePeriod(periodIndex, { duration: input.target.value })} /><span className="practice-print-value">{period.duration || '-'}</span></label>
          <label><span>Period</span><input aria-label={`Period ${periodIndex + 1} name`} list="practice-period-suggestions" value={period.name || ''} placeholder="Period name" disabled={!canEdit || busy} onChange={(input) => changePeriod(periodIndex, { name: input.target.value })} /><span className="practice-print-value">{period.name || '-'}</span></label>
          <label className="practice-period-group-breakdown"><span>Group Breakdown</span><select aria-label={`Group Breakdown for period ${periodIndex + 1}`} value={groupBreakdown} disabled={!canEdit || busy} onChange={(input) => changePeriod(periodIndex, { groupBreakdown: input.target.value })}><option value="No">No</option><option value="Yes">Yes</option></select><span className="practice-print-value">{groupBreakdown}</span></label>
          {canEdit && <div className="practice-period-tools"><button type="button" title="Move period up" aria-label={`Move period ${periodIndex + 1} up`} disabled={busy || periodIndex === 0} onClick={() => movePeriod(periodIndex, -1)}><ArrowUp size={16} /></button><button type="button" title="Move period down" aria-label={`Move period ${periodIndex + 1} down`} disabled={busy || periodIndex === periods.length - 1} onClick={() => movePeriod(periodIndex, 1)}><ArrowDown size={16} /></button><button type="button" title="Delete period" aria-label={`Delete period ${periodIndex + 1}`} disabled={busy} onClick={() => { if (window.confirm('Delete this period and its activities?')) changePeriods((current) => cascadePracticePeriodStarts(current.filter((_, index) => index !== periodIndex))) }}><Trash2 size={16} /></button></div>}
        </div>
        <div id={periodContentId} className="practice-period-content" hidden={periodCollapsed}>
        <div className="practice-activities-grid">
          <div className="data-grid-toolbar practice-activities-grid-toolbar"><div className="data-grid-toolbar-actions"><button type="button" className="primary-button" disabled={!canEdit || busy} onClick={() => changePeriod(periodIndex, { activities: [...(period.activities || []), newActivity()] })}><Plus className="toolbar-icon" aria-hidden="true" />Add Activity</button></div></div>
          <DataGrid title={`Period ${periodIndex + 1} Activities`} className="editable-data-grid" columns={activityColumns} items={activityRows} showPage pageLabel="Order" hidePager hideToolbar onReorder={canEdit ? (ids) => {
            const rowsById = new Map(activityRows.map((row) => [row.id, row]))
            // Rebuild from displayed row order while retaining IDs for legacy activities without one.
            changePeriod(periodIndex, { activities: ids.map((id) => {
              const row = rowsById.get(id)
              const activity = period.activities[row.activityIndex]
              return { ...activity, id: activity.id || id }
            }) })
          } : undefined} rowActions={canEdit ? (row) => [{ key: 'delete', label: 'Delete', icon: Trash2, destructive: true, onClick: () => setActivityToDelete({ periodIndex, activityIndex: row.activityIndex, name: row.name }) }] : undefined} />
        </div>
        </div>
      </section>})}
      </>}
    </div>
    <aside className="gp-overview-sidebar practice-sheet-sidebar" aria-label="Attachments">
      <section className="gp-section practice-attachments-section"><header><p className="gp-eyebrow">ATTACHMENTS</p>{canEdit && <button type="button" className="secondary-button practice-sheet-attach-button" onClick={openAttachmentDialog} disabled={busy || loadingPlaybooks || playbooksLoading}><Paperclip size={16} />Attach Script or Install</button>}</header>
        {attachedPlaybooks.length ? <div className="gp-activities practice-attachment-list">{attachedPlaybooks.map((playbook) => { const isInstall = playbook.gameCardId?.endsWith('-installs'); const AttachmentIcon = isInstall ? BookOpenCheck : ClipboardList; const itemType = isInstall ? 'Install' : 'Practice Script'; return <article key={playbook.id} className={`gp-event-card gp-linked-event-card practice-attachment-card${attachmentDropTarget === playbook.id ? ' is-drop-target' : ''}`} onDragOver={(input) => dragAttachmentOver(input, playbook.id)} onDrop={(input) => dropAttachment(input, playbook.id)} onDragLeave={() => { if (attachmentDropTarget === playbook.id) setAttachmentDropTarget(null) }}><button type="button" className="practice-attachment-grip" aria-label={`Reorder ${playbook.name}`} title="Drag or use arrow keys to reorder" draggable={canEdit && !busy} disabled={!canEdit || busy} onDragStart={(input) => { input.dataTransfer.effectAllowed = 'move'; input.dataTransfer.setData('text/plain', playbook.id); setDraggingAttachmentId(playbook.id) }} onDragEnd={finishAttachmentDrag} onKeyDown={(input) => { const direction = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[input.key]; if (direction) { input.preventDefault(); moveAttachmentWithKeyboard(playbook.id, direction) } }}><GripVertical size={16} aria-hidden="true" /></button><button type="button" className="gp-linked-event-open" onClick={() => onOpenScript?.(playbook)} disabled={!onOpenScript || busy} title={`Open ${itemType}: ${playbook.name}`}><AttachmentIcon size={18} aria-hidden="true" /><span className="gp-event-copy"><small>{itemType}</small><strong>{playbook.name}</strong></span></button></article> })}</div> : <p className="gp-empty">No attachments.</p>}
      </section>
    </aside>
    </div>
      {attachmentDialogOpen && <div className="schedule-overlay" onMouseDown={(input) => { if (input.target === input.currentTarget && !busy) setAttachmentDialogOpen(false) }}><form className="schedule-dialog practice-sheet-attachment-dialog" role="dialog" aria-modal="true" aria-labelledby="practice-sheet-attachments-title" aria-busy={busy} onSubmit={(input) => { input.preventDefault(); saveAttachments() }}>
        <header className="schedule-dialog-header"><div><Paperclip size={20} aria-hidden="true" /><h2 id="practice-sheet-attachments-title">Attach to Practice Sheet</h2></div><DialogCloseButton onClick={() => setAttachmentDialogOpen(false)} disabled={busy} /></header>
        <div className="schedule-dialog-body practice-sheet-attachment-options">{attachablePlaybooks.length ? attachablePlaybooks.map((playbook) => <label className="practice-sheet-attachment-option" key={playbook.id}><input type="checkbox" checked={selectedAttachmentIds.has(playbook.id)} disabled={busy} onChange={(input) => setSelectedAttachmentIds((current) => { const next = new Set(current); if (input.target.checked) next.add(playbook.id); else next.delete(playbook.id); return next })} /><span><strong>{playbook.name}</strong><small>{playbook.gameCardId?.endsWith('-installs') ? 'Install' : 'Practice Script'}{playbook.category ? ` · ${playbook.category}` : ''}{playbook.recordStatus === 'Archived' ? ' · Archived' : ''}</small></span></label>) : <p className="practice-sheet-empty">No Practice Scripts or Installs are available from this Practice's linked Game Plans.</p>}</div>
        <footer className="schedule-dialog-actions">{onCreatePracticeScript && event.gamePlanIds?.length > 0 && <button type="button" className="secondary-button practice-sheet-new-script-button" onClick={() => { setAttachmentDialogOpen(false); onCreatePracticeScript(eventId) }} disabled={busy}><Plus size={16} />New Practice Script</button>}<button type="button" className="secondary-button" onClick={() => setAttachmentDialogOpen(false)} disabled={busy}>Cancel</button><button type="submit" className="primary-button" disabled={busy || !attachmentChanges}>{busy ? 'Saving...' : 'Save Attachments'}</button></footer>
      </form></div>}
      {printDialogOpen && <div className="schedule-overlay" onMouseDown={(input) => { if (input.target === input.currentTarget) setPrintDialogOpen(false) }}><section className="schedule-dialog practice-sheet-print-dialog" role="dialog" aria-modal="true" aria-labelledby="practice-sheet-print-title">
        <header className="schedule-dialog-header"><div><Printer size={20} aria-hidden="true" /><h2 id="practice-sheet-print-title">Print Practice Sheet</h2></div><DialogCloseButton onClick={() => setPrintDialogOpen(false)} /></header>
        <div className="schedule-dialog-body"><p>{attachedPlaybooks.length} attached {attachedPlaybooks.length === 1 ? 'item is' : 'items are'} available to print after the Practice Sheet.</p><label className="practice-sheet-print-attachments"><input type="checkbox" checked={printAttachmentsSelected} onChange={(input) => setPrintAttachmentsSelected(input.target.checked)} /><span>Print attached Practice Scripts and Installs after the schedule</span></label></div>
        <footer className="schedule-dialog-actions"><button type="button" className="secondary-button" onClick={() => setPrintDialogOpen(false)}>Cancel</button><button type="button" className="primary-button" onClick={confirmPrintSheet}><Printer size={16} />Print</button></footer>
      </section></div>}
  </section>
}

// Return the end time of a period, or an empty string when its timing is invalid.
export function practicePeriodEndTime(startTime, duration) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(startTime || '')
  const minutes = Number(duration)
  if (!match || !Number.isInteger(minutes) || minutes < 1) return ''
  // Modulo keeps periods that cross midnight within the 24-hour clock.
  const total = (Number(match[1]) * 60 + Number(match[2]) + minutes) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// Recalculate each period's start time from its predecessor, beginning at fromIndex.
export function cascadePracticePeriodStarts(periods, fromIndex = 1) {
  const next = periods.map((period) => ({ ...period }))
  // Keep the first period as the schedule anchor; derive each following start from its predecessor.
  for (let index = Math.max(1, fromIndex); index < next.length; index += 1) {
    next[index].startTime = practicePeriodEndTime(next[index - 1].startTime, next[index - 1].duration)
  }
  return next
}

// Move a period, preserve the schedule's first start time, and recalculate later starts.
export function reorderPracticePeriods(periods, fromIndex, toIndex) {
  if (fromIndex < 0 || fromIndex >= periods.length || toIndex < 0 || toIndex >= periods.length || fromIndex === toIndex) return periods
  const firstStartTime = periods[0]?.startTime || ''
  const reordered = [...periods]
  const [period] = reordered.splice(fromIndex, 1)
  reordered.splice(toIndex, 0, period)
  // Moving periods changes their sequence, so preserve the schedule anchor and recalculate later starts.
  if (reordered.length) reordered[0] = { ...reordered[0], startTime: firstStartTime }
  return cascadePracticePeriodStarts(reordered)
}

// Group activities by unit and order supported groups before custom groups.
export function groupPracticeActivities(activities = []) {
  const grouped = new Map()
  activities.forEach((activity) => {
    const group = activity.group || 'Team'
    if (!grouped.has(group)) grouped.set(group, [])
    grouped.get(group).push({ name: activity.name || 'Unnamed', coach: activity.coach || '' })
  })
  return [...grouped]
    .sort(([left], [right]) => {
      const leftOrder = ACTIVITY_GROUPS.indexOf(left)
      const rightOrder = ACTIVITY_GROUPS.indexOf(right)
      if (leftOrder < 0 && rightOrder < 0) return left.localeCompare(right)
      if (leftOrder < 0) return 1
      if (rightOrder < 0) return -1
      return leftOrder - rightOrder
    })
    .map(([group, items]) => ({ group, activities: items }))
}

// Convert grouped activities into a compact, printable text summary.
export function summarizePracticeActivities(activities = []) {
  return groupPracticeActivities(activities)
    .map(({ group, activities: items }) => `${group}: ${items.map(({ name, coach }) => `${name}${coach ? ` (${coach})` : ''}`).join(', ')}`)
    .join('\n') || '—'
}

// Map practice periods and linked scripts into rows for the plan grid.
export function practicePlanGridRows(periods = []) {
  return periods.map((period, periodIndex) => ({
    id: period.id || String(periodIndex),
    period: period.name || `Period ${periodIndex + 1}`,
    start: period.startTime || '',
    minutes: period.duration || '',
    activities: groupPracticeActivities(period.activities || []),
  }))
}