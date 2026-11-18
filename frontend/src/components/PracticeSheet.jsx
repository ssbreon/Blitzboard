import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDown, ArrowUp, BookOpen, CalendarDays, Check, ClipboardList, Clock3, GripVertical, Menu, Pencil, Plus, Printer, RefreshCw, Save, Table2, Trash2 } from 'lucide-react'
import { ErrorDialog } from './ErrorDialog'
import { LoadingIndicator } from './LoadingIndicator'
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog'
import { DataGrid } from './DataGrid'
import './PracticeSheet.css'

const newActivity = () => ({ id: crypto.randomUUID(), name: '', group: 'Team', coach: '' })
const CREATE_PRACTICE_SCRIPT_OPTION = '__create_new_practice_script__'
export const ACTIVITY_GROUPS = ['Team', 'QB', 'RB', 'WR', 'OL', 'DB', 'LB', 'DLINE']
const newPeriod = (startTime = '', duration = '', name = '') => ({ id: crypto.randomUUID(), name, startTime, duration, groupBreakdown: 'No', activities: [newActivity()] })
export const PRACTICE_PLAN_GRID_COLUMNS = [
  { key: 'start', header: 'Start' },
  { key: 'minutes', header: 'Minutes' },
  { key: 'period', header: 'Period' },
  { key: 'activities', header: 'Activities', render: (groups) => <div className="practice-grid-activities">{groups.length ? <div className="practice-grid-activity-list">{groups.map(({ group, activities }) => <div className="practice-grid-activity-group" key={group}><span className="practice-grid-activity-group-label">{group}</span><div className="practice-grid-activity-items">{activities.map((activity, index) => <div className="practice-grid-activity-item" key={`${activity.name}-${index}`}><span className="practice-grid-activity-name">{activity.name}</span>{activity.coach && <span className="practice-grid-activity-coach">Coach {activity.coach}</span>}</div>)}</div></div>)}</div> : <span className="practice-grid-activity-empty">—</span>}</div> },
  { key: 'practiceScript', header: 'Practice Script', render: (value) => value || '—' },
]

export function practicePeriodGroupBreakdown(period = {}) {
  return period.groupBreakdown === 'Yes' ? 'Yes' : 'No'
}

export function PracticeSheet({ api, eventId, canEdit, breadcrumbSettingsTarget, onEditEvent, onSaved, onGuardChange, onEventLoaded, scripts, onCreatePracticeScript, onOpenScript }) {
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
  const [scheduleScripts, setScheduleScripts] = useState([])
  const [draggingPeriodId, setDraggingPeriodId] = useState(null)
  const [periodDropTarget, setPeriodDropTarget] = useState(null)

  useEffect(() => {
    let active = true
    api.getScheduleEvent(eventId).then((result) => {
      if (!active) return
      setEvent(result)
      onEventLoaded?.(result)
      const practiceSheet = result.practiceSheet || { periods: [] }
      const hasEmptyGroups = practiceSheet.periods?.some((period) => period.activities?.some((activity) => !activity.group))
      const hasMissingGroupBreakdown = practiceSheet.periods?.some((period) => period.groupBreakdown !== 'Yes' && period.groupBreakdown !== 'No')
      setSheet(hasEmptyGroups || hasMissingGroupBreakdown ? {
        ...practiceSheet,
        periods: practiceSheet.periods.map((period) => ({
          ...period,
          groupBreakdown: period.groupBreakdown === 'Yes' ? 'Yes' : 'No',
          activities: (period.activities || []).map((activity) => activity.group ? activity : { ...activity, group: 'Team' }),
        })),
      } : practiceSheet)
      setDirty(Boolean(canEdit && (hasEmptyGroups || hasMissingGroupBreakdown)))
      setError(null)
    }).catch((failure) => { if (active) setError(failure) })
    return () => { active = false }
  }, [api, eventId, revision, onEventLoaded])

  useEffect(() => {
    if (scripts !== undefined || !event) return undefined
    let active = true
    api.listPlaybooks()
      .then(({ items }) => {
        if (!active) return
        const gamePlanIds = new Set(event.gamePlanIds || [])
        setScheduleScripts(items.filter((item) => item.recordStatus !== 'Archived'
          && item.gameCardId?.endsWith('-scout')
          && item.practiceEventId === eventId
          && (!item.gamePlanId || gamePlanIds.has(item.gamePlanId))))
      })
      .catch(() => { if (active) setScheduleScripts([]) })
    return () => { active = false }
  }, [api, event, eventId, scripts])

  useEffect(() => {
    function warnBeforeUnload(event) {
      if (dirty) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [dirty])

  useEffect(() => {
    onGuardChange?.({ dirty, saving: busy, canSave: false })
    return () => onGuardChange?.(null)
  }, [dirty, busy, onGuardChange])

  useEffect(() => {
    if (!menuOpen) return undefined
    function handleOutsideClick(event) {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false)
    }
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
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
    setSheet((current) => ({ ...current, periods: update(current.periods || []) }))
    setDirty(true)
  }

  function changePeriod(index, patch) {
    if (patch.practiceScriptId === CREATE_PRACTICE_SCRIPT_OPTION) {
      onCreatePracticeScript?.(eventId)
      return
    }
    changePeriods((periods) => {
      const next = periods.map((period, current) => current === index ? { ...period, ...patch } : period)
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
    const sourceId = event.dataTransfer.getData('text/plain') || draggingPeriodId
    const sourceIndex = periods.findIndex((period, index) => (period.id || String(index)) === sourceId)
    if (sourceIndex >= 0) {
      const rect = event.currentTarget.getBoundingClientRect()
      const insertionIndex = targetIndex + (event.clientY > rect.top + rect.height / 2 ? 1 : 0)
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
    if (!dirty || window.confirm('Discard unsaved practice sheet changes?')) action()
  }

  function refreshPractice() {
    setMenuOpen(false)
    leave(() => setRevision((value) => value + 1))
  }

  if (!event) return <section className="practice-sheet"><ErrorDialog error={error} message="We couldn't load this practice." />{error ? <button type="button" className="schedule-secondary-button" onClick={() => setRevision((value) => value + 1)}>Retry</button> : <LoadingIndicator label="Loading practice..." />}</section>

  const periods = sheet.periods || []
  const lastPeriod = periods[periods.length - 1]
  const canAddPeriod = !lastPeriod || Boolean(practicePeriodEndTime(lastPeriod.startTime, lastPeriod.duration))
  const linkedScripts = scripts ?? scheduleScripts
  const availableScripts = onCreatePracticeScript
    ? [...linkedScripts, { id: CREATE_PRACTICE_SCRIPT_OPTION, name: '(create new Practice Script)' }]
    : linkedScripts
  const gridRows = practicePlanGridRows(periods, linkedScripts)
  const gridColumns = PRACTICE_PLAN_GRID_COLUMNS
  return <section className="practice-sheet" aria-label="Practice sheet" aria-busy={busy}>
    {canEdit && breadcrumbSettingsTarget && createPortal(<button type="button" className="breadcrumb-settings breadcrumb-settings-icon-only" onClick={() => leave(() => onEditEvent(event))} disabled={busy} title="Edit Event" aria-label="Edit Event"><Pencil size={18} aria-hidden="true" /></button>, breadcrumbSettingsTarget)}
    <header className="practice-sheet-header">
      <div className="practice-sheet-header-details"><p className="practice-sheet-eyebrow">Practice Sheet</p><h1>{event.name}</h1><div className="practice-sheet-header-meta-overlay"><p className="practice-sheet-meta"><CalendarDays size={16} />{event.eventDate}{event.startTime && ` · ${event.startTime}`}{event.endTime && ` - ${event.endTime}`}{event.location && ` · ${event.location}`}</p>{(event.dress || event.notes) && <div className="practice-sheet-dress-row">{event.dress && <p className="practice-sheet-dress"><strong>Dress</strong><span>{event.dress}</span></p>}{event.notes && <p className="practice-sheet-event-notes" title={event.notes}><strong>Notes</strong><span>{event.notes}</span></p>}</div>}</div></div>
      <div className="practice-sheet-actions">{canEdit && <button type="button" className="schedule-primary-button" onClick={save} disabled={!dirty || busy}><Save size={16} />{busy ? 'Saving...' : 'Save Sheet'}</button>}</div>
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
    <div className="practice-sheet-content">
      <div className="practice-sheet-section-heading"><div className="practice-plan-controls">{canEdit && practicePlanView === 'planning' && <button type="button" className="schedule-primary-button" title={canAddPeriod ? 'Add period' : 'Set the previous period Start and Minutes first'} onClick={() => changePeriods((current) => [...current, current.length ? newPeriod(practicePeriodEndTime(lastPeriod?.startTime, lastPeriod?.duration)) : newPeriod('15:30', '15', 'STRETCH')])} disabled={busy || !canAddPeriod}><Plus size={16} />Add Period</button>}<div className="toolbar-menu practice-plan-menu" ref={menuRef}>
        <button type="button" className="hamburger-button" aria-label="Practice Plan options" aria-haspopup="true" aria-expanded={menuOpen} title="Practice Plan options" onClick={() => setMenuOpen((open) => !open)}><Menu size={19} aria-hidden="true" /></button>
        {menuOpen && <div className="toolbar-dropdown data-grid-toolbar-dropdown practice-plan-dropdown" role="menu" aria-label="Practice Plan options"><div className="data-grid-menu-panes">
          <div className="data-grid-status-filter" role="group" aria-label="Practice Plan view"><div className="account-menu-section-label">View</div>{[{ id: 'planning', label: 'Planning View', icon: ClipboardList }, { id: 'grid', label: 'Grid View', icon: Table2 }].map(({ id, label, icon: Icon }) => <button key={id} type="button" role="menuitemradio" aria-checked={practicePlanView === id} onClick={() => { setPracticePlanView(id); setMenuOpen(false) }}><Icon size={16} className="data-grid-option-icon" aria-hidden="true" /><span>{label}</span><Check size={16} className="data-grid-status-check" aria-hidden="true" /></button>)}</div>
          <div className="data-grid-menu-actions" role="group" aria-label="Practice Plan actions"><div className="account-menu-section-label">Actions</div><button type="button" role="menuitem" onClick={refreshPractice}><RefreshCw className="menu-item-icon" aria-hidden="true" /><span className="data-grid-menu-action-label">Refresh</span></button><button type="button" role="menuitem" onClick={() => { setMenuOpen(false); window.print() }}><Printer className="menu-item-icon" aria-hidden="true" /><span className="data-grid-menu-action-label">Print</span></button></div>
        </div></div>}
      </div></div></div>
      {practicePlanView === 'grid' ? <DataGrid title="Practice Plan" rowIcon={Clock3} rowType="Period" columns={gridColumns} items={gridRows} hideToolbar hidePager /> : <>
      {!periods.length && <p className="practice-sheet-empty">No periods added.</p>}
      {periods.map((period, periodIndex) => {
        const periodId = period.id || String(periodIndex)
        const selectedScript = availableScripts.find((script) => script.id === period.practiceScriptId)
        const periodContentId = `practice-period-content-${periodIndex}`
        const groupBreakdown = practicePeriodGroupBreakdown(period)
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
          <label><span>Period</span><input aria-label={`Period ${periodIndex + 1} name`} value={period.name || ''} placeholder="Period name" disabled={!canEdit || busy} onChange={(input) => changePeriod(periodIndex, { name: input.target.value })} /><span className="practice-print-value">{period.name || '-'}</span></label>
          <div className="practice-period-script-control">
            <label className="practice-period-script-select"><span>Practice Script</span><select aria-label={`Practice Script for period ${periodIndex + 1}`} value={period.practiceScriptId || ''} disabled={!canEdit || busy || !availableScripts.length} onChange={(input) => changePeriod(periodIndex, { practiceScriptId: input.target.value })}><option value=""></option>{period.practiceScriptId && !availableScripts.some((script) => script.id === period.practiceScriptId) && <option value={period.practiceScriptId}>Unavailable script</option>}{availableScripts.map((script) => <option key={script.id} value={script.id}>{script.name}</option>)}</select><span className="practice-print-value">{selectedScript?.name || '—'}</span></label>
            {selectedScript && onOpenScript && <button type="button" className="practice-script-launcher" title="Open Practice Script" aria-label={`Open Practice Script ${selectedScript.name}`} onClick={() => onOpenScript(selectedScript)}><BookOpen size={17} aria-hidden="true" /></button>}
          </div>
          <label className="practice-period-group-breakdown"><span>Group Breakdown</span><select aria-label={`Group Breakdown for period ${periodIndex + 1}`} value={groupBreakdown} disabled={!canEdit || busy} onChange={(input) => changePeriod(periodIndex, { groupBreakdown: input.target.value })}><option value="No">No</option><option value="Yes">Yes</option></select><span className="practice-print-value">{groupBreakdown}</span></label>
          {canEdit && <div className="practice-period-tools"><button type="button" title="Move period up" aria-label={`Move period ${periodIndex + 1} up`} disabled={busy || periodIndex === 0} onClick={() => movePeriod(periodIndex, -1)}><ArrowUp size={16} /></button><button type="button" title="Move period down" aria-label={`Move period ${periodIndex + 1} down`} disabled={busy || periodIndex === periods.length - 1} onClick={() => movePeriod(periodIndex, 1)}><ArrowDown size={16} /></button><button type="button" title="Delete period" aria-label={`Delete period ${periodIndex + 1}`} disabled={busy} onClick={() => { if (window.confirm('Delete this period and its activities?')) changePeriods((current) => cascadePracticePeriodStarts(current.filter((_, index) => index !== periodIndex))) }}><Trash2 size={16} /></button></div>}
        </div>
        <div id={periodContentId} className="practice-period-content" hidden={periodCollapsed}>
        <div className="practice-activities-grid">
          <div className="data-grid-toolbar practice-activities-grid-toolbar"><div className="data-grid-toolbar-actions"><button type="button" className="toolbar-new-button" disabled={!canEdit || busy} onClick={() => changePeriod(periodIndex, { activities: [...(period.activities || []), newActivity()] })}><Plus className="toolbar-icon" aria-hidden="true" />Add Activity</button></div></div>
          <DataGrid title={`Period ${periodIndex + 1} Activities`} className="editable-data-grid" columns={activityColumns} items={activityRows} showPage pageLabel="Order" hidePager hideToolbar onReorder={canEdit ? (ids) => {
            const rowsById = new Map(activityRows.map((row) => [row.id, row]))
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
  </section>
}

export function practicePeriodEndTime(startTime, duration) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(startTime || '')
  const minutes = Number(duration)
  if (!match || !Number.isInteger(minutes) || minutes < 1) return ''
  const total = (Number(match[1]) * 60 + Number(match[2]) + minutes) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function cascadePracticePeriodStarts(periods, fromIndex = 1) {
  const next = periods.map((period) => ({ ...period }))
  for (let index = Math.max(1, fromIndex); index < next.length; index += 1) {
    next[index].startTime = practicePeriodEndTime(next[index - 1].startTime, next[index - 1].duration)
  }
  return next
}

export function reorderPracticePeriods(periods, fromIndex, toIndex) {
  if (fromIndex < 0 || fromIndex >= periods.length || toIndex < 0 || toIndex >= periods.length || fromIndex === toIndex) return periods
  const firstStartTime = periods[0]?.startTime || ''
  const reordered = [...periods]
  const [period] = reordered.splice(fromIndex, 1)
  reordered.splice(toIndex, 0, period)
  if (reordered.length) reordered[0] = { ...reordered[0], startTime: firstStartTime }
  return cascadePracticePeriodStarts(reordered)
}

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

export function summarizePracticeActivities(activities = []) {
  return groupPracticeActivities(activities)
    .map(({ group, activities: items }) => `${group}: ${items.map(({ name, coach }) => `${name}${coach ? ` (${coach})` : ''}`).join(', ')}`)
    .join('\n') || '—'
}

export function practicePlanGridRows(periods = [], scripts = []) {
  return periods.map((period, periodIndex) => ({
    id: period.id || String(periodIndex),
    period: period.name || `Period ${periodIndex + 1}`,
    start: period.startTime || '',
    minutes: period.duration || '',
    activities: groupPracticeActivities(period.activities || []),
    practiceScript: scripts.find((script) => script.id === period.practiceScriptId)?.name || '',
  }))
}