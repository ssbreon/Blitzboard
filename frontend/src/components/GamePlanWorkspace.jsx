import { useEffect, useState } from 'react'
import { Archive, ArchiveRestore, ArrowLeft, BookOpen, BookOpenCheck, CalendarDays, ClipboardList, Copy, Link, Plus, Presentation, ScanSearch, Trash2, Unlink } from 'lucide-react'
import { ErrorDialog } from './ErrorDialog'
import { LoadingIndicator } from './LoadingIndicator'
import { DataGrid } from './DataGrid'
import { DialogCloseButton } from './DialogCloseButton'
import { getCategoryBadgeStyle } from './CategoryBadge'
import { EVENT_TYPE_ICONS, ScheduleEventDialog } from './TeamSchedule'
import { PracticeSheet } from './PracticeSheet'
import { GAME_UNITS, gamePreparation, generatedPracticeScriptPayload, linkableGamePlanActivities, linkedPracticeEventIds, playEntryCount } from '../utils/gamePlanWorkspace'
import { findPlayTemplate } from '../utils/formations'
import './GamePlanWorkspace.css'
import './PracticeSheet.css'

const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const dateLabel = (value) => value ? new Date(`${value}T00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'Date not set'
const timeLabel = (value) => value ? new Date(`2000-01-01T${value}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : 'Time not set'
const byEventStart = (a, b) => `${a.eventDate || ''} ${a.startTime || ''}`.localeCompare(`${b.eventDate || ''} ${b.startTime || ''}`)
function EventTypeIcon({ type, size }) {
  const Icon = EVENT_TYPE_ICONS[type] || CalendarDays
  return <span role="img" aria-label={type} title={type} className="gp-event-icon"><Icon size={size} aria-hidden="true" /></span>
}
function ToolButton({ icon: Icon, label, onClick, disabled, destructive }) {
  return <button type="button" className={`gp-tool${destructive ? ' is-destructive' : ''}`} title={label} aria-label={label} onClick={onClick} disabled={disabled}><Icon size={17} aria-hidden="true" /></button>
}

export function GamePlanHeader({ game, onBack }) {
  const days = game.gameDate ? Math.round((new Date(`${game.gameDate}T00:00`) - new Date(`${today()}T00:00`)) / 86400000) : null
  const opponent = (game.opponent || game.name || '').replace(/^Game vs\.\s*/i, '')

  return <header className="gp-header"><div><p className="gp-eyebrow">Game Plan {game.gameSite && ` / ${game.gameSite}`}</p><h1>{game.gameSite === 'Away' ? '@' : 'vs.'} {opponent}</h1><div className="gp-header-info-overlay"><p className="gp-game-details"><CalendarDays size={16} aria-hidden="true" />{dateLabel(game.gameDate)}<span>{timeLabel(game.startTime)}</span>{game.location && <span>{game.location}</span>}{days !== null && <span className="gp-countdown">{days > 0 ? `${days} ${days === 1 ? 'day' : 'days'} to game time!` : days === 0 ? 'Game day' : 'Past game'}</span>}{days < 0 && game.result && <span className={`gp-result gp-result-${game.result[0].toLowerCase()}`} aria-label={`Result: ${game.result}`}>{game.result}</span>}</p></div></div><div className="gp-header-right">{onBack && <button type="button" className="gp-back-button" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" />Back to Game Plan</button>}</div></header>
}

export function GamePlanUnitFilter({ selectedUnits, onToggle }) {
  return <div className="data-grid-category-filter gp-unit-filter" role="group" aria-label="Filter by unit">{GAME_UNITS.map((unit) => {
    const active = selectedUnits.includes(unit)
    return <button key={unit} type="button" className={`category-badge category-filter-badge${active ? ' is-active' : ''}`} style={getCategoryBadgeStyle(unit)} aria-pressed={active} onClick={() => onToggle(unit)}>{unit}</button>
  })}</div>
}

export function GamePlanWorkspace({ api, game, reloadToken, readOnly, canCreate, canDuplicate, canDelete, cards, onAdd, onOpen, onSlideshow, onDuplicate, onDelete, onNewReport, onOpenReport, reportActions, practiceId, practiceBreadcrumbSettingsTarget, onOpenPractice, onGuardChange, onPracticeLoaded, onCreateScoutPlay, onOpenScoutPlay, onPrintPracticeAttachments, practiceSheetRevisionToken }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [activityDialog, setActivityDialog] = useState(null)
  const [practiceRevision, setPracticeRevision] = useState(0)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkIds, setLinkIds] = useState(new Set())
  const [reportUnit, setReportUnit] = useState(null)
  const [selectedUnits, setSelectedUnits] = useState([])

  useEffect(() => {
    let active = true
    Promise.all([api.listPlaybooks(), api.listScoutPlays(game.id), api.listScheduleEvents()])
      .then(([books, reports, events]) => {
        if (active) { setData({ books: books.items.filter((item) => !item._gridDeleted), reports: reports.items.filter((item) => !item._gridDeleted), events: events.items.filter((item) => !item._gridDeleted) }); setError(null) }
      })
      .catch((failure) => { if (active) setError(failure) })
    return () => { active = false }
  }, [api, game.id, reloadToken, revision])

  async function mutate(action) {
    if (busy) return
    setBusy(true)
    try { await action(); setRevision((value) => value + 1); setError(null) }
    catch (failure) { setError(failure) }
    finally { setBusy(false) }
  }

  const prep = gamePreparation(game.id, data?.books || [], data?.events || [], data?.reports || [])
  const activeItems = (items) => items.filter((item) => item.recordStatus !== 'Archived')
  const practices = prep.activities.filter((event) => event.eventType === 'Practice')
  const practiceEvent = prep.activities.find((event) => event.id === practiceId)
  const practiceGamePlanIds = new Set(practiceEvent?.gamePlanIds || [game.id])
  const practicePlaybooks = (data?.books || []).filter((item) => {
    const isInstallOrScript = item.gameCardId?.endsWith('-installs') || item.gameCardId?.endsWith('-scout')
    return isInstallOrScript && (practiceGamePlanIds.has(item.gamePlanId) || linkedPracticeEventIds(item).includes(practiceId))
  })
  const scriptedPlayEntries = (eventId) => activeItems(prep.scripts).filter((script) => linkedPracticeEventIds(script).includes(eventId)).reduce((total, script) => total + playEntryCount(script), 0)
  const selectedUnit = selectedUnits.length === 1 ? selectedUnits[0] : 'Offense'
  const cardFor = (item) => cards.find((card) => card.id === item.gameCardId)

  function addItem(kind, practiceEventId) {
    if (kind === 'scout' && !practices.length) { setLinkOpen(true); return }
    const card = cards.find((item) => item.unit === selectedUnit && item.tab === kind)
    onAdd?.(card, practices, practiceEventId)
  }

  function toggleUnit(unit) {
    setSelectedUnits((current) => current.includes(unit)
      ? current.filter((value) => value !== unit)
      : [...current, unit])
  }

  const availableEvents = linkableGamePlanActivities(game.gameDate, data?.events || [])

  function closeLinkDialog() {
    setLinkOpen(false)
    setLinkIds(new Set())
  }
  const groups = [{ id: 'installs', label: 'Installs', items: prep.installs }, { id: 'practiceScripts', label: 'Practice Scripts', items: prep.scripts }, { id: 'scoutingReports', label: 'Scouting Reports', items: prep.reports }]
  const summaryItems = groups.flatMap((group) => {
    const groupItems = activeItems(group.items).filter((item) => !selectedUnits.length || selectedUnits.includes(item.unit || item.category || game.category))
    if (selectedUnits.length && !groupItems.length) return []
    const header = {
      id: group.id,
      name: group.label,
      description: `${groupItems.length} items`,
      rowType: 'grouping',
    }
    return [header, ...groupItems.map((item) => ({
      ...item,
      unit: item.unit || item.category || game.category || 'Unit not set',
      details: group.id === 'scoutingReports'
        ? findPlayTemplate(item.template)?.label || item.template || 'Formation not set'
        : `${playEntryCount(item)} play entries`,
      gamePlanGroup: group.id,
      rowType: undefined,
    }))]
  })

  function summaryRowActions(item) {
    if (item.rowType === 'grouping') return []
    if (item.gamePlanGroup === 'scoutingReports') return reportActions(item)
    const card = cardFor(item)
    return [
      { key: 'open', label: 'Open', icon: BookOpen, onClick: (row) => onOpen(card, row) },
      { key: 'slideshow', label: 'Slideshow', icon: Presentation, onClick: (row) => onSlideshow(card, row) },
      ...(canDuplicate ? [{ key: 'duplicate', label: 'Duplicate', icon: Copy, onClick: onDuplicate }] : []),
      ...(!readOnly ? [{
        key: item.recordStatus === 'Archived' ? 'restore' : 'archive',
        label: item.recordStatus === 'Archived' ? 'Restore' : 'Archive',
        icon: item.recordStatus === 'Archived' ? ArchiveRestore : Archive,
        onClick: (row) => mutate(() => api.updatePlaybook(row.id, { recordStatus: item.recordStatus === 'Archived' ? 'Active' : 'Archived' })),
      }] : []),
      ...(canDelete ? [{ key: 'delete', label: 'Delete', icon: Trash2, destructive: true, onClick: onDelete }] : []),
    ]
  }

  const summaryColumns = [
    { key: 'name', header: 'Content' },
    { key: 'unit', header: 'Unit' },
    { key: 'details', header: 'Details' },
    ...practices.map((practice) => ({
      key: `practice-${practice.id}`,
      header: `Practice - ${dateLabel(practice.eventDate)} - ${practice.name}`,
      render: (_, item) => {
        if (!['installs', 'practiceScripts'].includes(item.gamePlanGroup)) return '\u2014'
        const practiceEventIds = linkedPracticeEventIds(item)
        return <label className="gp-practice-checkbox-cell"><input
          className="gp-practice-checkbox"
          type="checkbox"
          aria-label={`Link ${item.name} to ${practice.name}`}
          checked={practiceEventIds.includes(practice.id)}
          disabled={readOnly || busy}
          onChange={(event) => {
            const nextPracticeEventIds = event.target.checked
              ? [...practiceEventIds, practice.id]
              : practiceEventIds.filter((eventId) => eventId !== practice.id)
            mutate(() => api.updatePlaybook(item.id, { practiceEventIds: nextPracticeEventIds, gamePlanId: game.id }))
          }}
        /></label>
      },
    })),
    { key: 'updatedAt', header: 'Last Modified', render: (_, item) => item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '\u2014' },
    { key: 'ownerName', header: 'Owner', render: (value) => value || '\u2014' },
  ]

  function openActivity(event) {
    if (event.eventType === 'Practice') onOpenPractice(event)
    else setActivityDialog(event)
  }

  if (practiceId) return <section className="gp-workspace">
    <PracticeSheet key={`${practiceId}-${practiceRevision}-${practiceSheetRevisionToken}`} api={api} eventId={practiceId} canEdit={!readOnly} breadcrumbSettingsTarget={practiceBreadcrumbSettingsTarget} onGuardChange={onGuardChange} onEventLoaded={onPracticeLoaded} onCreateScoutPlay={(request) => onCreateScoutPlay?.({ ...request, gamePlanId: game.id })} onCreatePracticeScript={canCreate ? (practiceEventId) => addItem('scout', practiceEventId) : undefined} onOpenScoutPlay={onOpenScoutPlay} onEditEvent={setActivityDialog} onSaved={() => setRevision((value) => value + 1)} playbooks={practicePlaybooks} playbooksLoading={!data} onOpenScript={(item) => onOpen(cardFor(item), item)} onPrintAttachments={onPrintPracticeAttachments} />
    {activityDialog && <ScheduleEventDialog api={api} initialEvent={activityDialog} canEdit={!readOnly} canCreateGame={false} canDelete={false} onCancel={() => setActivityDialog(null)} onSave={async (payload) => {
      await api.updateScheduleEvent(activityDialog.id, payload)
      setActivityDialog(null)
      setPracticeRevision((value) => value + 1)
      setRevision((value) => value + 1)
    }} />}
  </section>

  return <section className="gp-workspace gp-workspace-overview" aria-label="Game week workspace" aria-busy={busy}>
    <GamePlanHeader game={game} />
    <ErrorDialog error={error} message="We couldn't complete the workspace action. Your existing records are unchanged unless the action succeeded." />
    {!data ? <div className="gp-empty">{error ? <button type="button" onClick={() => setRevision((value) => value + 1)}>Retry</button> : <LoadingIndicator compact label="Loading Game Plan..." />}</div> : <div className="gp-overview">
      <section className="gp-section gp-summary-section"><DataGrid id="gp-summary-grid" title="Game Plan" columns={summaryColumns} items={summaryItems} hidePager hideToolbarMenu busy={busy} suppressOpenHint toolbarContent={<div className="gp-summary-toolbar-content"><GamePlanUnitFilter selectedUnits={selectedUnits} onToggle={toggleUnit} /><div className="data-grid-toolbar-actions gp-quick-actions">{!readOnly && <><button type="button" className="primary-button" onClick={() => addItem('installs')} disabled={busy || !canCreate} title={!canCreate ? 'Playbook limit reached' : undefined}><Plus size={16} />Install</button><button type="button" className="primary-button" onClick={() => addItem('scout')} disabled={busy || !canCreate} title={!canCreate ? 'Playbook limit reached' : undefined}><Plus size={16} />Practice Script</button></>}{onNewReport && <button type="button" className="primary-button" onClick={() => setReportUnit(selectedUnit)} disabled={busy}><Plus size={16} />Scouting Report</button>}</div></div>} getRowIcon={(item) => ({ installs: BookOpenCheck, practiceScripts: ClipboardList, scoutingReports: ScanSearch })[item.gamePlanGroup || item.id]} rowActions={summaryRowActions} onRowDoubleClick={(item) => {
        if (item.rowType === 'grouping') return
        if (item.gamePlanGroup === 'scoutingReports') onOpenReport(item)
        else onOpen(cardFor(item), item)
      }} /></section>
      <aside className="gp-overview-sidebar" aria-label="Linked events">
        <section className="gp-section gp-linked-section"><header><p className="gp-eyebrow">Linked Events</p>{!readOnly && <button type="button" className="secondary-button" onClick={() => setLinkOpen(true)}><Link size={16} />Link Event</button>}</header>{prep.activities.length ? <div className="gp-activities">{[...prep.activities].sort(byEventStart).map((event) => <article className="gp-event-card gp-linked-event-card" key={event.id}><button type="button" className="gp-linked-event-open" onClick={() => openActivity(event)}><EventTypeIcon type={event.eventType} size={20} /><span className="gp-event-copy"><small>{dateLabel(event.eventDate)} · {timeLabel(event.startTime)}</small><strong>{event.name}</strong>{event.eventType === 'Practice' && <span>{scriptedPlayEntries(event.id)} scripted play entries</span>}</span></button>{!readOnly && <ToolButton icon={Unlink} label={`Unlink ${event.name}`} disabled={busy} onClick={() => mutate(() => api.updateScheduleEvent(event.id, { gamePlanIds: event.gamePlanIds.filter((id) => id !== game.id) }))} />}</article>)}</div> : <p className="gp-empty">No events linked to this Game Plan.</p>}</section>
        </aside>
      </div>}
    {reportUnit !== null && <div className="schedule-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setReportUnit(null) }}><form className="schedule-dialog" role="dialog" aria-modal="true" aria-labelledby="new-scouting-report-title" onSubmit={(event) => { event.preventDefault(); onNewReport(reportUnit, 'scoutingReports'); setReportUnit(null) }}>
      <header className="schedule-dialog-header"><div><ScanSearch size={20} aria-hidden="true" /><h2 id="new-scouting-report-title">New Scouting Report</h2></div><DialogCloseButton onClick={() => setReportUnit(null)} /></header>
      <div className="schedule-dialog-body"><label className="schedule-field"><span>Unit</span><select autoFocus value={reportUnit} onChange={(event) => setReportUnit(event.target.value)}>{GAME_UNITS.map((value) => <option key={value}>{value}</option>)}</select></label></div>
      <footer className="schedule-dialog-actions"><button type="button" className="secondary-button" onClick={() => setReportUnit(null)}>Cancel</button><button type="submit" className="primary-button">Continue</button></footer>
    </form></div>}
    {linkOpen && <div className="schedule-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) closeLinkDialog() }}><form className="schedule-dialog practice-sheet-attachment-dialog" role="dialog" aria-modal="true" aria-labelledby="link-game-plan-event-title" aria-busy={busy} onSubmit={(event) => { event.preventDefault(); const activities = availableEvents.filter((item) => linkIds.has(item.id)); if (activities.length) mutate(async () => { await Promise.all(activities.map((activity) => api.updateScheduleEvent(activity.id, { gamePlanIds: [...(activity.gamePlanIds || []), game.id] }))); closeLinkDialog() }) }}>
      <header className="schedule-dialog-header"><div><Link size={20} aria-hidden="true" /><h2 id="link-game-plan-event-title">Link Game Plan Events</h2></div><DialogCloseButton onClick={closeLinkDialog} disabled={busy} /></header>
      <div className="schedule-dialog-body practice-sheet-attachment-options">{availableEvents.length ? availableEvents.map((event) => <label className="practice-sheet-attachment-option" key={event.id}><input type="checkbox" checked={linkIds.has(event.id)} disabled={busy} onChange={(input) => setLinkIds((current) => { const next = new Set(current); if (input.target.checked) next.add(event.id); else next.delete(event.id); return next })} /><span><strong>{event.name}</strong><small>{dateLabel(event.eventDate)} · {event.eventType}</small></span></label>) : <p className="practice-sheet-empty">No events are available to link to this Game Plan.</p>}</div>
      <footer className="schedule-dialog-actions"><button type="button" className="secondary-button gp-link-new-event-button" onClick={() => { closeLinkDialog(); setActivityDialog('new') }} disabled={busy}><Plus size={16} />New Event</button><button type="button" className="secondary-button" onClick={closeLinkDialog} disabled={busy}>Cancel</button><button type="submit" className="primary-button" disabled={!linkIds.size || busy}>{busy ? 'Linking...' : 'Link'}</button></footer>
    </form></div>}
    {activityDialog && <ScheduleEventDialog api={api} key={activityDialog.id || 'new'} initialEvent={activityDialog === 'new' ? undefined : activityDialog} initialDate={today()} canEdit={!readOnly} canCreateGame={false} canDelete={false} onCancel={() => setActivityDialog(null)} onSave={async (payload) => {
      if (activityDialog === 'new') {
        const createdEvent = await api.createScheduleEvent({ ...payload, gamePlanIds: [game.id] })
        const scriptPayload = generatedPracticeScriptPayload(createdEvent, payload.practiceScriptUnit)
        setActivityDialog(null)
        if (scriptPayload) {
          try { await api.createPlaybook(scriptPayload) }
          catch (failure) { setError(new Error(`Practice created, but its Practice Script could not be created: ${failure.message}`)) }
        }
      } else {
        await api.updateScheduleEvent(activityDialog.id, payload)
        setActivityDialog(null)
      }
      setRevision((value) => value + 1)
    }} />}
  </section>
}