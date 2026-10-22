import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Archive, ArchiveRestore, BookOpen, CalendarDays, Check, ChevronRight, ClipboardList, Copy, CreditCard, Folder, FolderOpen, FolderPlus, LoaderCircle, LogOut, Pencil, Play, Plus, Printer, Save, ScanSearch, Settings, Trash2, UserRound, Users, X } from 'lucide-react'
import { api } from './api'
import { createApi, isDevelopmentAuth, isSignedOut, signIn, signOut } from './api/client'
import { AccountViews } from './components/AccountViews'
import { renderCategoryBadge } from './components/CategoryBadge'
import { DataGrid } from './components/DataGrid'
import { COLLECTION_CATEGORIES, NewCollectionDialog } from './components/NewCollectionDialog'
import { NewPlayDialog, playCategoriesForCollection } from './components/NewPlayDialog'
import { PlayFieldView } from './components/PlayFieldView'
import { PlayDesigner } from './components/PlayDesigner'
import { PrintPreviewDialog } from './components/PrintPreviewDialog'
import { TeamSchedule } from './components/TeamSchedule'
import { buildMarkersFromTemplate, DEFAULT_PLAY_TEMPLATE, findPlayTemplate } from './utils/formations'
import { formatDate } from './utils/formatDate'
import { defaultPlayPerspective, PLAY_PERSPECTIVES } from './utils/playGeometry'
import './App.css'

function PlayDiagramIcon({ size = 24, strokeWidth = 2, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="5" cy="19" r="2.8" />
      <path d="M8 18.5h9.8q1.2 0 1.2-1.2V10.5" />
      <path d="M15.5 10.5H22.5" />
      <path d="m16.5 2.5 5 5m0-5-5 5" />
    </svg>
  )
}

const STATUS_COLUMN = { key: 'recordStatus', header: 'Status', render: (value) => value ?? 'Active' }

const GRID_COLUMNS = [
  { key: 'name', header: 'Name' },
  { key: 'category', header: 'Category', render: renderCategoryBadge },
  { key: 'playCount', header: 'Plays' },
  { key: 'updatedAt', header: 'Last Modified', render: formatDate },
]

const ADJUSTMENTS_COLUMN = { key: 'adjustments', header: 'Adjustments', render: (value) => value?.length ? value.join(', ') : '—' }

const PLAYBOOK_GRID_COLUMNS = [GRID_COLUMNS[0], { key: 'year', header: 'Year' }, ...GRID_COLUMNS.slice(1), { key: 'ownerName', header: 'Owner' }, STATUS_COLUMN]
function formatGameDate(value) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString() : '—'
}

const GAME_PLAN_GRID_COLUMNS = [
  GRID_COLUMNS[0],
  { key: 'year', header: 'Year' },
  { key: 'opponent', header: 'Opponent' },
  { key: 'gameDate', header: 'Game Date', render: formatGameDate },
  ...GRID_COLUMNS.slice(1),
  { key: 'ownerName', header: 'Owner' },
  STATUS_COLUMN,
]

const PLAY_GRID_COLUMNS = [
  { key: 'name', header: 'Name' },
  ADJUSTMENTS_COLUMN,
  { key: 'category', header: 'Category', render: renderCategoryBadge },
  { key: 'updatedAt', header: 'Last Modified', render: formatDate },
  { key: 'ownerName', header: 'Owner' },
  STATUS_COLUMN,
]

const GAME_CARD_VIEWS = [
  { id: 'offense-installs', unit: 'Offense', tab: 'installs', title: 'Offense - Installs', description: 'Offensive plays to install' },
  { id: 'offense-scout', unit: 'Offense', tab: 'scout', title: 'Offense - Practice Scripts', description: 'Practice script plays for our scout defense to run' },
  { id: 'defense-installs', unit: 'Defense', tab: 'installs', title: 'Defense - Installs', description: 'Defensive plays to install' },
  { id: 'defense-scout', unit: 'Defense', tab: 'scout', title: 'Defense - Practice Scripts', description: 'Practice scripts for our scout offense to run' },
  { id: 'special-teams-installs', unit: 'Special Teams', tab: 'installs', title: 'Special Teams - Installs', description: 'Special teams plays to install' },
  { id: 'special-teams-scout', unit: 'Special Teams', tab: 'scout', title: 'Special Teams - Practice Scripts', description: 'Practice scripts for our scout special teams' },
]
const GAME_PLAN_UNITS = ['Offense', 'Defense', 'Special Teams']
const GAME_PLAN_TABS = [
  { id: 'installs', label: 'Installs' },
  { id: 'practiceScripts', label: 'Practice Scripts' },
  { id: 'scoutingReports', label: 'Scouting Reports' },
]
const GAME_PLAN_ITEM_COLUMNS = [
  { key: 'name', header: 'Name' },
  { key: 'playCount', header: 'Plays', render: (_, item) => item.gameCardId?.endsWith('-installs') ? item.installPlays?.length ?? 0 : item.playCount ?? 0 },
  { key: 'year', header: 'Year' },
  { key: 'updatedAt', header: 'Last Modified', render: formatDate },
]
const GAME_SCOUT_PLAY_COLUMNS = [
  { key: 'name', header: 'Play Name' },
  { key: 'template', header: 'Formation', render: (value) => findPlayTemplate(value)?.label || value || '—' },
  { key: 'category', header: 'Category' },
  { key: 'preview', header: 'Plays', render: (_, play) => <div className="schedule-grid-play-preview" role="img" aria-label={`${play.name} play diagram`}><PlayFieldView play={play} /></div> },
]

async function withAdjustmentTitles(api, playbookId, rows) {
  return Promise.all(rows.map(async (row) => {
    if (row.rowType === 'grouping' || Array.isArray(row.adjustments)) return row
    const sourcePlaybookId = row.sourcePlaybookId || playbookId
    if (!sourcePlaybookId) return { ...row, adjustments: [] }
    try {
      const { items = [] } = await api.listSlides(sourcePlaybookId, row.id, true)
      return { ...row, adjustments: items.map((slide) => slide.title || 'Adjustment') }
    } catch {
      return { ...row, adjustments: [] }
    }
  }))
}

function withoutGridOnlyFields(row, preserveTheme = false) {
  const gridRow = { ...row }
  delete gridRow.createdAt
  if (!preserveTheme) delete gridRow.theme
  return gridRow
}

function gameBreadcrumbLabel(game) {
  const opponent = game.opponent || game.name
  const date = game.gameDate
    ? new Date(`${game.gameDate}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : ''
  return `Game vs. ${opponent}${date ? ` - ${date}` : ''}`
}

function BreadcrumbLabel({ icon: Icon, children }) {
  return <><Icon size={17} strokeWidth={1.8} aria-hidden="true" /><span className="breadcrumb-label-text">{children}</span></>
}

function GamePlanBanner({ game, onEdit, disabled }) {
  const opponent = (game.opponent || game.name || '').replace(/^Game vs\.\s*/i, '').trim() || '\u2014'
  const date = game.gameDate
    ? new Date(`${game.gameDate}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : '\u2014'
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)/.exec(game.startTime || '')
  const time = timeMatch
    ? new Date(2000, 0, 1, Number(timeMatch[1]), Number(timeMatch[2])).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : game.startTime || '\u2014'
  const details = [
    ['Opponent', opponent],
    ['Date', date],
    ['Time', time],
    ['Location', game.location || game.gameSite || '\u2014'],
  ]

  return <section className="game-plan-banner" aria-label="Game plan details">
    <dl className="game-plan-banner-details">
      {details.map(([label, value]) => <div key={label}>
        <dt>{label}</dt>
        <dd>{value}</dd>
      </div>)}
    </dl>
    <button type="button" className="schedule-primary-button game-plan-banner-edit" onClick={onEdit} disabled={disabled} title="Edit game settings" aria-label="Edit game settings">
      <Pencil size={16} aria-hidden="true" /> Edit
    </button>
  </section>
}

function PlaybookBanner({ playbook, onEdit, disabled }) {
  const details = [
    ['Name', playbook.name || '\u2014'],
    ['Category', playbook.category || '\u2014'],
    ['Year', playbook.year || '\u2014'],
  ]

  return <section className="game-plan-banner playbook-banner" aria-label="Playbook details">
    <dl className="game-plan-banner-details">
      {details.map(([label, value]) => <div key={label}>
        <dd>{value}</dd>
      </div>)}
    </dl>
    <button type="button" className="schedule-primary-button game-plan-banner-edit" onClick={onEdit} disabled={disabled} title="Edit playbook settings" aria-label="Edit playbook settings">
      <Pencil size={16} aria-hidden="true" /> Edit
    </button>
  </section>
}

function PlaybooksBanner({ teamName, counts }) {
  const details = [
    { id: 'team', label: 'Team', value: teamName || '\u2014' },
    { id: 'offense', label: 'Offense Playbooks', value: counts?.Offense ?? '\u2014' },
    { id: 'defense', label: 'Defense Playbooks', value: counts?.Defense ?? '\u2014' },
    { id: 'special-teams', label: 'Special Teams Playbooks', value: counts?.['Special Teams'] ?? '\u2014' },
  ]

  return <section className="game-plan-banner playbooks-banner" aria-label="Playbooks summary">
    <dl className="game-plan-banner-details">
      {details.map(({ id, label, value }) => <div key={id}>
        <dd>{label && `${label}: `}{value}</dd>
      </div>)}
    </dl>
  </section>
}

function gameCardItemDefaultName(game, card) {
  const opponent = (game.opponent || game.name || '').replace(/^Game vs\.\s*/i, '').trim()
  const label = card.tab === 'installs'
    ? card.unit
    : card.unit === 'Special Teams' ? 'Special Teams Scout' : card.title.split(' - ')[1]
  return [opponent, label, game.year || new Date().getFullYear()].filter(Boolean).join(' ')
}

function GameCardItemDialog({ card, initialName, onCancel, onCreate }) {
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function submit(event) {
    event.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      await onCreate(name.trim())
    } catch (failure) {
      setError(failure.message)
    } finally {
      setSaving(false)
    }
  }

  return <div className="dialog-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onCancel() }}>
    <form className="dialog-panel" onSubmit={submit} aria-busy={saving}>
      <h2><Plus size={22} aria-hidden="true" />Add {card.tab === 'installs' ? 'Install' : 'Practice Script'}</h2>
      <label className="dialog-field"><span>Name</span><input autoFocus required value={name} onChange={(event) => setName(event.target.value)} /></label>
      {error && <p role="alert" className="data-grid-status data-grid-error">Unable to create item: {error}</p>}
      <div className="dialog-actions">
        <button type="button" className="dialog-cancel" disabled={saving} onClick={onCancel}>Cancel</button>
        <button type="submit" className="dialog-create" disabled={saving || !name.trim()}>{saving ? 'Creating...' : 'Create'}</button>
      </div>
    </form>
  </div>
}

function GroupingDialog({ grouping, onCancel, onSave }) {
  const [name, setName] = useState(grouping?.name || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function submit(event) {
    event.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      await onSave(name.trim())
    } catch (failure) {
      setError(failure.message)
    } finally {
      setSaving(false)
    }
  }

  return <div className="dialog-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onCancel() }}>
    <form className="dialog-panel" onSubmit={submit} aria-busy={saving}>
      <h2>{grouping ? <Folder className="data-grid-grouping-icon" size={22} aria-hidden="true" /> : <FolderPlus size={22} aria-hidden="true" />}{grouping ? 'Edit Group Name' : 'New Grouping'}</h2>
      <label className="dialog-field"><span>Name</span><input autoFocus required value={name} onChange={(event) => setName(event.target.value)} /></label>
      {error && <p role="alert" className="data-grid-status data-grid-error">Unable to save grouping: {error}</p>}
      <div className="dialog-actions">
        <button type="button" className="dialog-cancel" disabled={saving} onClick={onCancel}>Cancel</button>
        <button type="submit" className="dialog-create" disabled={saving || !name.trim()}>{saving ? 'Saving...' : grouping ? 'Save' : 'Add'}</button>
      </div>
    </form>
  </div>
}

function playTags(play) {
  const value = play.tags ?? play.tag
  if (Array.isArray(value)) return value.map((tag) => String(tag).trim()).filter(Boolean)
  return typeof value === 'string' ? value.split(/[;,]/).map((tag) => tag.trim()).filter(Boolean) : []
}

function formationLabel(play) {
  const value = play.formation || play.template
  return findPlayTemplate(value)?.label || value || '—'
}

function timezoneColumns(columns, timezone) {
  return columns.map((column) => column.render === formatDate ? { ...column, render: (value) => formatDate(value, timezone) } : column)
}

function AppBar({ activeView, onNavigate, user, workspace, onWorkspaceChange, onSignOut, busy, switchingSubscription }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function navigate(event, view) {
    event.preventDefault()
    setMenuOpen(false)
    onNavigate(view)
  }

  function menuKeys(event) {
    if (event.key === 'Escape') {
      setMenuOpen(false)
      menuRef.current?.querySelector('.account-button')?.focus()
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      const items = [...menuRef.current.querySelectorAll('[role^="menuitem"]:not(:disabled)')]
      const index = items.indexOf(document.activeElement)
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length
      items[next]?.focus()
    }
  }

  return (
    <header className="app-bar">
      <div className="app-bar-brand">
        <img className="app-bar-logo" src="/blitzboard-mark.svg" alt="" aria-hidden="true" />
        <span className="app-bar-wordmark">BLITZBOARD <span className="app-bar-wordmark-accent">Studio</span></span>
      </div>
      <nav className="app-bar-nav" aria-label="Primary navigation">
        {user && (
          <>
        <a
          href="#playbooks"
          className={`app-bar-link${activeView === 'playbooks' ? ' active' : ''}`}
          onClick={(event) => navigate(event, 'playbooks')}
        >
          <BookOpen size={17} strokeWidth={1.8} aria-hidden="true" />
          Playbooks
        </a>
        <a
          href="#team-schedule"
          className={`app-bar-link${activeView === 'teamSchedule' ? ' active' : ''}`}
          onClick={(event) => navigate(event, 'teamSchedule')}
        >
          <CalendarDays size={17} strokeWidth={1.8} aria-hidden="true" />
          Team Schedule
        </a>
          </>
        )}
      </nav>
      {user && <div className="app-bar-account" ref={menuRef} onKeyDown={menuKeys}>
        <div className="app-bar-identity">
          <span className="app-bar-user-name" title={user.name}>{user.name}</span>
          {workspace && <span className="active-workspace-label"><span className="app-bar-workspace-name" title={workspace.name}>{workspace.name}</span></span>}
        </div>
        <span className="app-bar-subscription-status" role="status" title={switchingSubscription ? 'Switching subscription...' : undefined}>
          {switchingSubscription && <><LoaderCircle size={14} aria-hidden="true" /><span className="sr-only">Switching subscription...</span></>}
        </span>
        <button
          type="button"
          className="account-button"
          aria-haspopup="true"
          aria-expanded={menuOpen}
          aria-label={`Account menu for ${user.name}`}
          disabled={busy}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <UserRound className="account-icon" aria-hidden="true" />
        </button>
        {menuOpen && (
          <div className="account-menu" role="menu">
            <div className="account-menu-panes">
              <div className="account-menu-subscriptions" role="group" aria-label="Subscriptions">
                <div className="account-menu-section-label">Subscriptions</div>
                {user.workspaces?.map((item) => <button key={item.id} type="button" role="menuitemradio" aria-checked={workspace?.id === item.id} disabled={busy} onClick={() => { setMenuOpen(false); onWorkspaceChange(item.id) }}>
                  {item.kind === 'team' ? <Users className="menu-item-icon" aria-hidden="true" /> : <UserRound className="menu-item-icon" aria-hidden="true" />}
                  <span className="workspace-menu-name">{item.name}</span>{workspace?.id === item.id && <Check size={16} aria-hidden="true" />}
                </button>)}
              </div>
              <div className="account-menu-actions" role="group" aria-label="Account">
                <div className="account-menu-section-label">{user.name} (<span className="account-role">{workspace?.role || user.roles.join(', ')}</span>)</div>
                <button type="button" role="menuitem" disabled={busy} onClick={(event) => navigate(event, 'profile')}><UserRound className="menu-item-icon" aria-hidden="true" />Profile</button>
                <button type="button" role="menuitem" disabled={busy} onClick={(event) => navigate(event, 'settings')}><Settings className="menu-item-icon" aria-hidden="true" />Settings</button>
                {workspace?.kind === 'team' && <button type="button" role="menuitem" disabled={busy} onClick={(event) => navigate(event, 'team')}><Users className="menu-item-icon" aria-hidden="true" />Team</button>}
                <button type="button" role="menuitem" disabled={busy} onClick={(event) => navigate(event, 'billing')}><CreditCard className="menu-item-icon" aria-hidden="true" />Membership &amp; Billing</button>
                <div className="account-menu-divider" role="separator" />
                <button type="button" role="menuitem" disabled={busy} onClick={() => { setMenuOpen(false); onSignOut() }}><LogOut className="menu-item-icon" aria-hidden="true" />Sign Out</button>
              </div>
            </div>
          </div>
        )}

      </div>}
    </header>
  )
}

function AddPlaysDialog({ api, category, installedPlays, onCancel, onAdd }) {
  const [playbooks, setPlaybooks] = useState([])
  const [playbookId, setPlaybookId] = useState('')
  const [plays, setPlays] = useState([])
  const [loadedPlaybookId, setLoadedPlaybookId] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [search, setSearch] = useState('')
  const [loadingPlaybooks, setLoadingPlaybooks] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    api.listPlaybooks(category)
      .then((result) => {
        if (!active) return
        const available = result.items.filter((book) => book.recordStatus !== 'Archived' && !book.gameCardId)
        setPlaybooks(available)
        setPlaybookId(available[0]?.id || '')
      })
      .catch((failure) => { if (active) setError(failure.message) })
      .finally(() => { if (active) setLoadingPlaybooks(false) })
    return () => { active = false }
  }, [api, category])

  useEffect(() => {
    if (!playbookId) return undefined
    let active = true
    api.listPlays(playbookId)
      .then((result) => { if (active) setPlays(result.items.filter((play) => play.recordStatus !== 'Archived')) })
      .catch((failure) => { if (active) { setPlays([]); setError(failure.message) } })
      .finally(() => { if (active) setLoadedPlaybookId(playbookId) })
    return () => { active = false }
  }, [api, playbookId])

  const loadingPlays = Boolean(playbookId) && loadedPlaybookId !== playbookId
  const installedIds = new Set(installedPlays.map((selection) => `${selection.playbookId}:${selection.playId}`))
  const visiblePlays = plays.filter((play) => play.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))

  async function submit(event) {
    event.preventDefault()
    if (submitting || !selectedIds.length) return
    const selectedBook = playbooks.find((book) => book.id === playbookId)
    const selections = plays.filter((play) => selectedIds.includes(play.id)).map((play) => ({
      playbookId,
      playId: play.id,
      playbookName: selectedBook?.name || '',
      playName: play.name,
    }))
    setSubmitting(true)
    setError(null)
    try {
      await onAdd(selections)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="dialog-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onCancel() }}>
    <form className="dialog-panel install-play-picker-dialog" onSubmit={submit} aria-busy={submitting}>
      <h2><Plus size={22} aria-hidden="true" />Add Plays</h2>
      <label className="dialog-field"><span>Playbook</span><select value={playbookId} onChange={(event) => { setPlaybookId(event.target.value); setSelectedIds([]); setError(null) }} disabled={loadingPlaybooks || !playbooks.length}>
        {loadingPlaybooks && <option value="">Loading playbooks...</option>}
        {!loadingPlaybooks && !playbooks.length && <option value="">No {category.toLowerCase()} playbooks available</option>}
        {playbooks.map((book) => <option key={book.id} value={book.id}>{book.name}</option>)}
      </select></label>
      <label className="dialog-field"><span>Search plays</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name" /></label>
      <div className="install-play-picker-list" aria-label="Available plays">
        {loadingPlays ? <p className="schedule-muted">Loading plays...</p> : visiblePlays.map((play) => {
          const key = `${playbookId}:${play.id}`
          const alreadyAdded = installedIds.has(key)
          return <label key={play.id} className="install-play-picker-item">
            <input type="checkbox" checked={alreadyAdded || selectedIds.includes(play.id)} disabled={alreadyAdded || submitting} onChange={() => setSelectedIds((current) => current.includes(play.id) ? current.filter((id) => id !== play.id) : [...current, play.id])} />
            <span>{play.name}</span>
            {alreadyAdded && <small>Added</small>}
          </label>
        })}
        {!loadingPlays && playbookId && !visiblePlays.length && <p className="schedule-muted">No matching plays.</p>}
      </div>
      {error && <p role="alert" className="data-grid-status data-grid-error">Unable to add plays: {error}</p>}
      <div className="dialog-actions">
        <button type="button" className="dialog-cancel" disabled={submitting} onClick={onCancel}>Cancel</button>
        <button type="submit" className="dialog-create" disabled={submitting || !selectedIds.length}>{submitting ? 'Adding...' : 'Add Selected Plays'}</button>
      </div>
    </form>
  </div>
}

function PlaysDrillthroughView({ parentRecord, parentLabel, onParentUpdated, updateParent, api, title, rowIcon, rowType, fetchRows, reloadToken, busy, onReorder, onNew, onNewGrouping, onEditGrouping, onDeleteGrouping, newLabel, onOpenPlay, onPrintAll, rowActions, onGuardChange, readOnly, timezone, breadcrumbActionsTarget, breadcrumbSettingsTarget, gameCard, gamePlanUnit, gamePlanTab, onGamePlanSelectionChange, onAddGameCardItem, onOpenGameCardItem, onDuplicateGameCardItem, onDeleteGameCardItem, canAddGameCardItem, canDuplicateGameCardItem, canDeleteGameCardItem }) {
  const isGamePlan = parentRecord.kind === 'gamePlan'
  const installMode = !isGamePlan && Boolean(parentRecord.gameCardId) && gameCard?.tab === 'installs'
  const selectedUnit = isGamePlan ? gamePlanUnit : gameCard?.unit || 'Offense'
  const gameTab = isGamePlan ? gamePlanTab : gameCard?.tab || 'scout'
  const selectedGameCard = GAME_CARD_VIEWS.find((card) => card.unit === selectedUnit && card.tab === (gameTab === 'installs' ? 'installs' : 'scout'))
  const [name, setName] = useState(parentRecord.name)
  const [category, setCategory] = useState(parentRecord.category || 'Defense')
  const [year, setYear] = useState(String(parentRecord.year || new Date().getFullYear()))
  const [opponent, setOpponent] = useState(parentRecord.opponent || '')
  const [gameDate, setGameDate] = useState(parentRecord.gameDate || '')
  const [startTime, setStartTime] = useState(parentRecord.startTime || '')
  const [gameSite, setGameSite] = useState(parentRecord.gameSite || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [draftName, setDraftName] = useState(name)
  const [draftCategory, setDraftCategory] = useState(category)
  const [draftYear, setDraftYear] = useState(year)
  const [draftOpponent, setDraftOpponent] = useState(opponent)
  const [draftGameDate, setDraftGameDate] = useState(gameDate)
  const [draftStartTime, setDraftStartTime] = useState(startTime)
  const [draftGameSite, setDraftGameSite] = useState(gameSite)
  const [playbooks, setPlaybooks] = useState([])
  const [playbooksLoading, setPlaybooksLoading] = useState(isGamePlan || installMode)
  const [playbooksError, setPlaybooksError] = useState(null)
  const [gamePlanScoutPlays, setGamePlanScoutPlays] = useState(null)
  const [gamePlanScoutPlaysLoading, setGamePlanScoutPlaysLoading] = useState(isGamePlan)
  const [playbookPlays, setPlaybookPlays] = useState({})
  const [loadedPlaybookKey, setLoadedPlaybookKey] = useState('')
  const [playbookPlaysError, setPlaybookPlaysError] = useState(null)
  const [installGroupings, setInstallGroupings] = useState([])
  const [installGroupingsError, setInstallGroupingsError] = useState(null)
  const [selectedPlaybookId, setSelectedPlaybookId] = useState('')
  const [formationFilter, setFormationFilter] = useState('')
  const [collapsedGamePlanFolders, setCollapsedGamePlanFolders] = useState(() => new Set())
  const [installCategoryFilter, setInstallCategoryFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [playSearchDraft, setPlaySearchDraft] = useState('')
  const [playSearchTerm, setPlaySearchTerm] = useState('')
  const [selectedInstallPlays, setSelectedInstallPlays] = useState(() => Array.isArray(parentRecord.installPlays) ? parentRecord.installPlays : [])
  const [savedInstallSignature, setSavedInstallSignature] = useState(() => JSON.stringify(Array.isArray(parentRecord.installPlays) ? parentRecord.installPlays : []))
  const [installSaving, setInstallSaving] = useState(false)
  const [installError, setInstallError] = useState(null)
  const [installPickerOpen, setInstallPickerOpen] = useState(false)
  const [installPickerGroupingId, setInstallPickerGroupingId] = useState(null)
  const [gameCardActionBusy, setGameCardActionBusy] = useState(false)
  const [gameCardToast, setGameCardToast] = useState('')
  const selectedGameCardItems = playbooks.filter((item) => item.recordStatus !== 'Archived' && item.gamePlanId === parentRecord.id && item.gameCardId === selectedGameCard?.id)

  useEffect(() => {
    if (!installMode) return undefined
    let active = true
    api.listPlaybookRows(parentRecord.id)
      .then(({ items }) => {
        if (active) {
          setInstallGroupings(items.filter((item) => item.rowType === 'grouping'))
          setInstallGroupingsError(null)
        }
      })
      .catch((failure) => { if (active) setInstallGroupingsError(failure.message) })
    return () => { active = false }
  }, [api, installMode, parentRecord.id, reloadToken])

  useEffect(() => {
    if (!isGamePlan && !installMode) return undefined
    let active = true
    api.listPlaybooks()
      .then((result) => {
        if (active) {
          setPlaybooks(result.items.filter((item) => item.recordStatus !== 'Archived'))
          setPlaybooksError(null)
        }
      })
      .catch((failure) => {
        if (active) setPlaybooksError(failure.message)
      })
      .finally(() => {
        if (active) setPlaybooksLoading(false)
      })
    return () => { active = false }
  }, [api, installMode, isGamePlan, reloadToken])

  useEffect(() => {
    if (!isGamePlan) return undefined
    let active = true
    api.listScoutPlays(parentRecord.id)
      .then((result) => {
        if (active) setGamePlanScoutPlays(result.items)
      })
      .catch(() => {
        if (active) setGamePlanScoutPlays(null)
      })
      .finally(() => {
        if (active) setGamePlanScoutPlaysLoading(false)
      })
    return () => { active = false }
  }, [api, isGamePlan, parentRecord.id, reloadToken])

  const unitPlaybooks = playbooks.filter((playbook) => playbook.category === selectedUnit)
  const activePlaybookId = unitPlaybooks.some((playbook) => playbook.id === selectedPlaybookId)
    ? selectedPlaybookId
    : unitPlaybooks[0]?.id || ''
  const selectedBookIds = [...new Set(selectedInstallPlays.map((selection) => selection.playbookId).filter(Boolean))]
  const playbookKey = isGamePlan && gameCard?.tab === 'installs'
    ? [...new Set([activePlaybookId, ...selectedBookIds].filter(Boolean))].join('|')
    : installMode ? selectedBookIds.join('|') : ''

  useEffect(() => {
    if ((!isGamePlan && !installMode) || !playbookKey) return undefined
    let active = true
    const ids = playbookKey.split('|')
    Promise.all(ids.map(async (id) => [id, await withAdjustmentTitles(api, id, (await api.listPlays(id)).items)]))
      .then((results) => {
        if (!active) return
        setPlaybookPlays((current) => ({ ...current, ...Object.fromEntries(results) }))
        setPlaybookPlaysError(null)
      })
      .catch((failure) => {
        if (active) setPlaybookPlaysError(failure.message)
      })
      .finally(() => {
        if (active) setLoadedPlaybookKey(playbookKey)
      })
    return () => { active = false }
  }, [api, installMode, isGamePlan, playbookKey])

  const availablePlays = (playbookPlays[activePlaybookId] || []).filter((play) => play.recordStatus !== 'Archived')
  const selectedInstallSignature = JSON.stringify(selectedInstallPlays)
  const installDirty = selectedInstallSignature !== savedInstallSignature
  const playbooksForInstall = playbooks.filter((playbook) => playbook.category === selectedUnit)
  const playsLoading = Boolean(playbookKey) && loadedPlaybookKey !== playbookKey
  const currentTags = [...new Set(availablePlays.flatMap(playTags))].sort((a, b) => a.localeCompare(b))
  const currentFormations = [...new Set(availablePlays.map((play) => play.formation || play.template).filter(Boolean))]
  const currentCategories = [...new Set(availablePlays.map((play) => play.category).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  const filteredInstallPlays = availablePlays.filter((play) =>
    (!formationFilter || (play.formation || play.template) === formationFilter)
    && (!installCategoryFilter || play.category === installCategoryFilter)
    && (!tagFilter || playTags(play).includes(tagFilter))
    && (!playSearchTerm || play.name.toLocaleLowerCase().includes(playSearchTerm.toLocaleLowerCase())))
  const selectedInstallCards = selectedInstallPlays.map((selection) => ({
    selection,
    play: (playbookPlays[selection.playbookId] || []).find((play) => play.id === selection.playId),
    playbook: playbooks.find((item) => item.id === selection.playbookId),
  })).filter((item) => item.play && item.playbook?.category === (installMode ? parentRecord.category : selectedUnit))
  const installPlayRows = selectedInstallCards.map(({ selection, play, playbook }) => ({
    ...play,
    sourcePlaybookId: selection.playbookId,
    sourcePlaybookName: playbook?.name || selection.playbookName || '',
    installGroupingId: selection.groupingId,
  }))
  const installGroupingIds = new Set(installGroupings.map((grouping) => grouping.id))
  const installGridItems = [
    ...installGroupings.flatMap((grouping) => [
      { ...grouping, rowType: 'grouping' },
      ...installPlayRows.filter((play) => play.installGroupingId === grouping.id),
    ]),
    ...installPlayRows.filter((play) => !installGroupingIds.has(play.installGroupingId)),
  ].map((row, index) => ({ ...withoutGridOnlyFields(row), page: index + 1 }))

  function toggleInstallPlay(play) {
    const playbook = playbooks.find((item) => item.id === activePlaybookId)
    const exists = selectedInstallPlays.some((item) => item.playbookId === activePlaybookId && item.playId === play.id)
    setSelectedInstallPlays((current) => exists
      ? current.filter((item) => item.playbookId !== activePlaybookId || item.playId !== play.id)
      : [...current, { playbookId: activePlaybookId, playId: play.id, playbookName: playbook?.name || '', playName: play.name }])
    setInstallError(null)
  }

  async function saveInstallSelection(nextPlays) {
    if (readOnly || installSaving) return
    setInstallSaving(true)
    setInstallError(null)
    try {
      const updated = await updateParent(parentRecord.id, { installPlays: nextPlays })
      onParentUpdated(updated)
      const savedPlays = updated.installPlays || nextPlays
      setSelectedInstallPlays(savedPlays)
      setSavedInstallSignature(JSON.stringify(savedPlays))
    } catch (failure) {
      setInstallError(failure.message)
      throw failure
    } finally {
      setInstallSaving(false)
    }
  }

  async function reorderInstallPlays(ids) {
    const rowsById = new Map(installGridItems.map((row) => [row.id, row]))
    const orderedSelections = ids
      .map((id) => rowsById.get(id))
      .filter((row) => row && row.rowType !== 'grouping')
      .map((row) => selectedInstallPlays.find((selection) => selection.playId === row.id && selection.playbookId === row.sourcePlaybookId))
      .filter(Boolean)
    const orderedKeys = new Set(orderedSelections.map((selection) => `${selection.playbookId}:${selection.playId}`))
    let orderedIndex = 0
    const nextPlays = selectedInstallPlays.map((selection) => orderedKeys.has(`${selection.playbookId}:${selection.playId}`)
      ? orderedSelections[orderedIndex++]
      : selection)
    if (JSON.stringify(nextPlays) !== selectedInstallSignature) await saveInstallSelection(nextPlays)
  }

  async function moveInstallPlayToGrouping(row, groupingId) {
    const nextPlays = selectedInstallPlays.map((selection) =>
      selection.playId === row.id && selection.playbookId === row.sourcePlaybookId
        ? { ...selection, groupingId }
        : selection,
    )
    try {
      await saveInstallSelection(nextPlays)
    } catch {
      return
    }
  }

  function installRowActions(row) {
    if (row.rowType === 'grouping') return [
      ...(!readOnly ? [{ key: 'add-play', label: 'Add Plays', icon: Plus, onClick: () => {
        setInstallPickerGroupingId(row.id)
        setInstallPickerOpen(true)
      } }] : []),
      ...(!readOnly && onEditGrouping ? [{ key: 'edit-group-name', label: 'Edit Group Name', icon: Pencil, onClick: onEditGrouping }] : []),
      ...(onDeleteGrouping ? [{ key: 'delete-grouping', label: 'Delete', icon: Trash2, destructive: true, onClick: onDeleteGrouping }] : []),
    ]
    return [
      { key: 'open', label: 'View Play', icon: FolderOpen, onClick: onOpenPlay },
      ...(!readOnly ? installGroupings.map((grouping) => ({
        key: `move-to-${grouping.id}`,
        label: `Move to ${grouping.name}`,
        icon: Folder,
        onClick: () => moveInstallPlayToGrouping(row, grouping.id),
      })) : []),
      ...(row.installGroupingId && !readOnly ? [{ key: 'remove-from-group', label: 'Remove from Group', icon: FolderOpen, onClick: () => moveInstallPlayToGrouping(row, undefined) }] : []),
      { key: 'remove', label: 'Remove from Install', icon: Trash2, destructive: true, onClick: async () => {
        try {
          await saveInstallSelection(selectedInstallPlays.filter((selection) => selection.playId !== row.id || selection.playbookId !== row.sourcePlaybookId))
        } catch {
          return
        }
      } },
    ]
  }

  async function saveInstall() {
    if (readOnly || installSaving || !installDirty) return
    try {
      await saveInstallSelection(selectedInstallPlays)
    } catch {
      return
    }
  }

  async function handleGameCardItemAction(action, card, item) {
    if (action === 'open') {
      onOpenGameCardItem(card, item)
      return
    }
    setGameCardActionBusy(true)
    try {
      if (action === 'duplicate') {
        await onDuplicateGameCardItem(item)
        setGameCardToast(`Duplicated ${item.name}`)
      } else {
        await onDeleteGameCardItem(item)
        setGameCardToast(`Deleted ${item.name}`)
      }
    } catch (failure) {
      setGameCardToast(`Unable to ${action} ${item.name}: ${failure.message}`)
    } finally {
      setGameCardActionBusy(false)
      window.setTimeout(() => setGameCardToast(''), 4000)
    }
  }
  async function handleSettingsSave(event) {
    event.preventDefault()
    if (!draftName.trim() || readOnly || saving || busy) return
    setSaving(true)
    setError(null)
    try {
      const payload = { name: draftName.trim(), year: Number(draftYear) }
      if (parentRecord.kind === 'gamePlan') {
        payload.opponent = draftOpponent.trim()
        payload.gameDate = draftGameDate
        payload.startTime = draftStartTime
        if (draftGameSite) payload.gameSite = draftGameSite
      } else {
        payload.category = draftCategory
      }
      const updated = await updateParent(parentRecord.id, payload)
      setName(updated.name)
      if (!isGamePlan) setCategory(updated.category ?? draftCategory)
      setYear(String(updated.year ?? draftYear))
      if (parentRecord.kind === 'gamePlan') {
        setOpponent(updated.opponent ?? payload.opponent)
        setGameDate(updated.gameDate ?? draftGameDate)
        setStartTime(updated.startTime ?? draftStartTime)
        setGameSite(updated.gameSite ?? gameSite)
      }
      onParentUpdated(updated)
      setSettingsOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    onGuardChange({ dirty: settingsOpen, saving, canSave: false })
    return () => onGuardChange(null)
  })

  function openSettings() {
    setError(null)
    setDraftName(name)
    setDraftCategory(category)
    setDraftYear(year)
    setDraftOpponent(opponent)
    setDraftGameDate(gameDate)
    setDraftStartTime(startTime)
    setDraftGameSite(gameSite)
    setSettingsOpen(true)
  }

  return (
    <main className="plays-drillthrough-view">
      {isGamePlan && <GamePlanBanner game={parentRecord} onEdit={openSettings} disabled={readOnly || saving || busy} />}
      {parentRecord.kind === 'playbook' && !parentRecord.gameCardId && <PlaybookBanner playbook={parentRecord} onEdit={openSettings} disabled={readOnly || saving || busy} />}
      {breadcrumbSettingsTarget && createPortal(
        <button type="button" className="breadcrumb-settings" onClick={openSettings} disabled={readOnly || saving || busy} title={`Edit ${parentLabel} Settings`} aria-label={`Edit ${parentLabel} Settings`}>
          <Pencil size={18} aria-hidden="true" />
          <span>Edit</span>
        </button>,
        breadcrumbSettingsTarget,
      )}
      {settingsOpen && (
        <div className="dialog-overlay" onClick={() => { if (!saving) setSettingsOpen(false) }}>
          <form className="dialog-panel" aria-busy={saving} onClick={(event) => event.stopPropagation()} onSubmit={handleSettingsSave}>
            <h2><Settings size={26} strokeWidth={1.8} aria-hidden="true" />{parentLabel} Settings</h2>
            <label className="dialog-field">
              <span>{parentLabel} name</span>
              <input type="text" value={draftName} onChange={(event) => setDraftName(event.target.value)} required />
            </label>
            {!isGamePlan && <label className="dialog-field">
              <span>Category</span>
              <select value={draftCategory} onChange={(event) => setDraftCategory(event.target.value)}>
                {COLLECTION_CATEGORIES.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>}
            <label className="dialog-field">
              <span>Year</span>
              <input
                type="number"
                min="1000"
                max="9999"
                step="1"
                value={draftYear}
                onChange={(event) => setDraftYear(event.target.value)}
                required
              />
            </label>
            {parentRecord.kind === 'gamePlan' && (
              <>
                <div className="dialog-field-row">
                  <label className="dialog-field">
                    <span>Opponent</span>
                    <input type="text" value={draftOpponent} onChange={(event) => setDraftOpponent(event.target.value)} />
                  </label>
                  <label className="dialog-field">
                    <span>Game Site</span>
                    <select value={draftGameSite} onChange={(event) => setDraftGameSite(event.target.value)}>
                      <option value="">Select game site</option>
                      <option value="Home">Home</option>
                      <option value="Away">Away</option>
                      <option value="Neutral">Neutral</option>
                    </select>
                  </label>
                </div>
                <div className="dialog-field-row">
                  <label className="dialog-field">
                    <span>Game Date</span>
                    <input type="date" value={draftGameDate} onChange={(event) => setDraftGameDate(event.target.value)} />
                  </label>
                  <label className="dialog-field">
                    <span>Start Time</span>
                    <input type="time" value={draftStartTime} onChange={(event) => setDraftStartTime(event.target.value)} />
                  </label>
                </div>
              </>
            )}
            {error && <p className="data-grid-status data-grid-error" role="alert">Unable to save: {error}</p>}
            <div className="dialog-actions">
              <button type="button" className="dialog-cancel" disabled={saving} onClick={() => setSettingsOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="dialog-create" disabled={readOnly || saving || busy || !draftName.trim()}><Save size={16} aria-hidden="true" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
      {isGamePlan && !gameCard ? <section className="game-plan-workspace" aria-label="Game plan">
        <nav className="game-plan-folder-tree" aria-label="Game plan folders">
          {GAME_PLAN_TABS.map((tab) => <section className="game-plan-folder-group" key={tab.id}>
            <h3><button
                type="button"
                className="game-plan-folder-toggle"
                aria-expanded={!collapsedGamePlanFolders.has(tab.id)}
                onClick={() => setCollapsedGamePlanFolders((current) => {
                  const next = new Set(current)
                  if (next.has(tab.id)) next.delete(tab.id)
                  else next.add(tab.id)
                  return next
                })}
              >
                {collapsedGamePlanFolders.has(tab.id)
                  ? <Folder className="game-plan-folder-toggle-icon" size={18} aria-hidden="true" />
                  : <FolderOpen className="game-plan-folder-toggle-icon" size={18} aria-hidden="true" />}
                {tab.label}
              </button></h3>
            {!collapsedGamePlanFolders.has(tab.id) && <ul>
              {GAME_PLAN_UNITS.map((unit) => {
                const selected = gameTab === tab.id && selectedUnit === unit
                const FolderIcon = selected ? FolderOpen : Folder
                const gameCard = GAME_CARD_VIEWS.find((card) => card.unit === unit && card.tab === (tab.id === 'installs' ? 'installs' : 'scout'))
                const countLoading = tab.id === 'scoutingReports' ? gamePlanScoutPlaysLoading : playbooksLoading
                const count = tab.id === 'scoutingReports'
                  ? gamePlanScoutPlays?.filter((play) => play.recordStatus !== 'Archived' && (play.unit || parentRecord.category || (selectedUnit === unit ? unit : '')) === unit).length ?? null
                  : playbooks.filter((item) => item.gamePlanId === parentRecord.id && item.gameCardId === gameCard?.id).length
                return <li key={unit}>
                  <button type="button" className={selected ? 'is-selected' : undefined} aria-current={selected ? 'page' : undefined} onClick={() => onGamePlanSelectionChange(unit, tab.id)}>
                    <FolderIcon size={19} aria-hidden="true" />{unit}
                    <span className={`game-plan-folder-count${count > 0 ? ' has-records' : ''}`} aria-label={countLoading ? `${tab.label} count loading` : count === null ? `${tab.label} count unavailable` : `${count} ${tab.label.toLowerCase()}`} title={countLoading ? `Loading ${tab.label.toLowerCase()} count` : count === null ? 'Count unavailable' : `${count} ${tab.label.toLowerCase()}`}>
                      {countLoading ? <LoaderCircle className="game-plan-folder-count-spinner" size={13} aria-hidden="true" /> : count ?? '\u2014'}
                    </span>
                  </button>
                </li>
              })}
            </ul>}
          </section>)}
        </nav>
        <div className="game-plan-content">
          <header className="game-plan-content-heading">
            <h2>{GAME_PLAN_TABS.find((tab) => tab.id === gameTab)?.label}<ChevronRight size={18} aria-hidden="true" />{selectedUnit}</h2>
          </header>
          {playbooksError && gameTab !== 'scoutingReports' && <p className="schedule-error" role="alert">Unable to load game plan items: {playbooksError}</p>}
          {gameTab === 'scoutingReports' ? <DataGrid
            key={`game-reports-${parentRecord.id}-${selectedUnit}`}
            title={`${selectedUnit} Scouting Reports`}
            columns={GAME_SCOUT_PLAY_COLUMNS}
            filterRows={(row) => (row.unit || parentRecord.category || selectedUnit) === selectedUnit}
            statusFilter
            reloadToken={reloadToken}
            busy={busy}
            fetchRows={fetchRows}
            onNew={onNew ? () => onNew(selectedUnit, 'scoutingReports') : undefined}
            newLabel="Add Scouting Report"
            onRowDoubleClick={onOpenPlay}
            rowActions={rowActions}
          /> : playbooksLoading ? <p className="schedule-muted" role="status">Loading {gameTab === 'installs' ? 'installs' : 'practice scripts'}...</p> : <DataGrid
            key={`game-items-${parentRecord.id}-${selectedUnit}-${gameTab}`}
            title={`${selectedUnit} ${gameTab === 'installs' ? 'Installs' : 'Practice Scripts'}`}
            columns={GAME_PLAN_ITEM_COLUMNS}
            items={selectedGameCardItems.map((item) => withoutGridOnlyFields(item))}
            busy={busy || gameCardActionBusy}
            onNew={onAddGameCardItem && canAddGameCardItem ? () => onAddGameCardItem(selectedGameCard) : undefined}
            newLabel={gameTab === 'installs' ? 'Add Install' : 'Add Practice Script'}
            onRowDoubleClick={(item) => onOpenGameCardItem(selectedGameCard, item)}
            rowActions={() => [
              { key: 'open', label: 'Open', icon: FolderOpen, onClick: (item) => handleGameCardItemAction('open', selectedGameCard, item) },
              ...(canDuplicateGameCardItem ? [{ key: 'duplicate', label: 'Duplicate', icon: Copy, onClick: (item) => handleGameCardItemAction('duplicate', selectedGameCard, item) }] : []),
              ...(canDeleteGameCardItem ? [{ key: 'delete', label: 'Delete', icon: Trash2, destructive: true, onClick: (item) => handleGameCardItemAction('delete', selectedGameCard, item) }] : []),
            ]}
          />}
          {gameCardToast && <div className="schedule-game-card-toast" role="status">{gameCardToast}</div>}
        </div>
      </section> : <>
      {isGamePlan && gameCard && <header className="schedule-game-card-page-header"><h2>{gameCard.title}</h2><p>{gameCard.description}</p></header>}
      {isGamePlan && gameTab === 'installs' ? <section className="schedule-install-page">
        <header><h2>{gameCard?.title || `${selectedUnit} - Installs`}</h2><p>Select plays from your <strong>Playbooks</strong> to install for this game.</p></header>
        {playbooksError && <p className="schedule-error" role="alert">Unable to load playbooks: {playbooksError}</p>}
        {playbookPlaysError && <p className="schedule-error" role="alert">Unable to load plays: {playbookPlaysError}</p>}
        <form className="schedule-install-filters" onSubmit={(event) => { event.preventDefault(); setPlaySearchTerm(playSearchDraft.trim()) }}>
          <label><span className="sr-only">Playbook</span><select aria-label="Playbook" value={activePlaybookId} onChange={(event) => setSelectedPlaybookId(event.target.value)} disabled={playbooksLoading || !playbooksForInstall.length}>
            {playbooksLoading && <option value="">Loading playbooks...</option>}
            {!playbooksLoading && !playbooksForInstall.length && <option value="">No {selectedUnit.toLowerCase()} playbooks</option>}
            {playbooksForInstall.map((playbook) => <option key={playbook.id} value={playbook.id}>{playbook.name}</option>)}
          </select></label>
          <label><span className="sr-only">Formation</span><select aria-label="Formation" value={formationFilter} onChange={(event) => setFormationFilter(event.target.value)} disabled={!availablePlays.length}>
            <option value="">Formation: All</option>
            {currentFormations.map((formation) => <option key={formation} value={formation}>Formation: {findPlayTemplate(formation)?.label || formation}</option>)}
          </select></label>
          <label><span className="sr-only">Category</span><select aria-label="Category" value={installCategoryFilter} onChange={(event) => setInstallCategoryFilter(event.target.value)} disabled={!availablePlays.length}>
            <option value="">Category: All</option>
            {currentCategories.map((option) => <option key={option} value={option}>Category: {option}</option>)}
          </select></label>
          <label><span className="sr-only">Tag</span><select aria-label="Tag" value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
            <option value="">Tag: All</option>
            {currentTags.map((tag) => <option key={tag} value={tag}>Tag: {tag}</option>)}
          </select></label>
          <label className="schedule-install-search"><span className="sr-only">Search plays</span><input type="search" aria-label="Search plays" placeholder="Search plays" value={playSearchDraft} onChange={(event) => setPlaySearchDraft(event.target.value)} /></label>
          <button type="submit" className="schedule-install-search-button" disabled={!activePlaybookId}>Search Plays</button>
        </form>
        {playbooksLoading ? <p className="schedule-muted">Loading playbooks...</p>
          : !playbooksForInstall.length ? <p className="schedule-muted">No {selectedUnit.toLowerCase()} playbooks available.</p>
            : playsLoading ? <p className="schedule-muted">Loading plays...</p>
              : <DataGrid
                key={`install-grid-${activePlaybookId}`}
                title={`${selectedUnit} install plays`}
                columns={[
                  { key: 'name', header: 'Play Name' },
                  ADJUSTMENTS_COLUMN,
                  { key: 'formation', header: 'Formation', render: (_, play) => formationLabel(play) },
                  { key: 'category', header: 'Category' },
                  { key: 'tags', header: 'Tags', render: (_, play) => playTags(play).join(', ') || '—' },
                  { key: 'install', header: 'Add to Install', render: (_, play) => {
                    const selected = selectedInstallPlays.some((item) => item.playbookId === activePlaybookId && item.playId === play.id)
                    return <button type="button" className={`schedule-install-add${selected ? ' is-selected' : ''}`} aria-label={`${selected ? 'Remove' : 'Add'} ${play.name} ${selected ? 'from' : 'to'} install`} aria-pressed={selected} onDoubleClick={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); toggleInstallPlay(play) }}><span className="schedule-install-add-preview"><PlayFieldView play={play} /></span><span className="schedule-install-add-state">{selected ? <Check size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}</span></button>
                  } },
                ]}
                items={filteredInstallPlays.map((play) => withoutGridOnlyFields(play, true))}
                compact
                suppressOpenHint
                statusFilter
                onRowDoubleClick={onOpenPlay}
              />}
        <section className="schedule-selected-installs" aria-label="Selected plays">
          <h3>Selected Plays</h3>
          <div className="schedule-selected-install-list">
            {selectedInstallCards.map(({ selection, play }) => <button key={`${selection.playbookId}-${selection.playId}`} type="button" className="schedule-selected-install" aria-label={`Remove ${play.name} from selected plays`} onClick={() => setSelectedInstallPlays((current) => current.filter((item) => item.playbookId !== selection.playbookId || item.playId !== selection.playId))}>
              <span className="schedule-selected-install-preview"><PlayFieldView play={play} /></span><span>{play.name}<X size={14} aria-hidden="true" /></span>
            </button>)}
            {!selectedInstallCards.length && <p className="schedule-muted">No plays selected.</p>}
          </div>
          <button type="button" className="schedule-primary-button" disabled={readOnly || installSaving || !installDirty} onClick={saveInstall}>{installSaving ? 'Saving...' : 'Save Install'}</button>
        </section>
        {installError && <p className="schedule-error" role="alert">{installError}</p>}
      </section> : installMode ? <section className="schedule-install-library">
        {playbooksError && <p className="schedule-error" role="alert">Unable to load playbooks: {playbooksError}</p>}
        {playbookPlaysError && <p className="schedule-error" role="alert">Unable to load selected plays: {playbookPlaysError}</p>}
        {installGroupingsError && <p className="schedule-error" role="alert">Unable to load install groupings: {installGroupingsError}</p>}
        {installError && <p className="schedule-error" role="alert">Unable to update install: {installError}</p>}
        {playbooksLoading || playsLoading ? <p className="schedule-muted" role="status">Loading installed plays...</p> : <DataGrid
          key={`install-library-${parentRecord.id}`}
          title={`${parentRecord.name} plays`}
          columns={[
            { key: 'name', header: 'Play Name' },
            ADJUSTMENTS_COLUMN,
            { key: 'sourcePlaybookName', header: 'Playbook' },
            { key: 'formation', header: 'Formation', render: (_, play) => formationLabel(play) },
            { key: 'category', header: 'Category' },
          ]}
          items={installGridItems}
          showPage
          onReorder={readOnly ? undefined : reorderInstallPlays}
          canReorderRows={(source, target) => source?.rowType !== 'grouping' && target?.rowType !== 'grouping' && source?.installGroupingId === target?.installGroupingId}
          onNew={() => { setInstallPickerGroupingId(null); setInstallPickerOpen(true) }}
          newLabel="Add Plays"
          onSecondaryNew={onNewGrouping}
          secondaryNewLabel="New Grouping"
          busy={busy || installSaving}
          rowActions={installRowActions}
          onRowDoubleClick={onOpenPlay}
        />}
        {installPickerOpen && <AddPlaysDialog
          api={api}
          category={parentRecord.category}
          installedPlays={selectedInstallPlays}
          onCancel={() => setInstallPickerOpen(false)}
          onAdd={async (additions) => {
            const known = new Set(selectedInstallPlays.map((selection) => `${selection.playbookId}:${selection.playId}`))
            await saveInstallSelection([...selectedInstallPlays, ...additions
              .filter((selection) => !known.has(`${selection.playbookId}:${selection.playId}`))
              .map((selection) => installPickerGroupingId ? { ...selection, groupingId: installPickerGroupingId } : selection)])
            setInstallPickerOpen(false)
            setInstallPickerGroupingId(null)
          }}
        />}
      </section> : <DataGrid
        key={isGamePlan ? `game-${parentRecord.id}-${selectedUnit}` : `collection-${parentRecord.id}`}
        title={isGamePlan ? gameCard?.title || `${selectedUnit} Scout Plays` : title}
        columns={isGamePlan ? GAME_SCOUT_PLAY_COLUMNS : timezoneColumns(PLAY_GRID_COLUMNS, timezone)}
        rowIcon={isGamePlan ? undefined : rowIcon}
        rowType={rowType}
        categoryOptions={isGamePlan ? undefined : playCategoriesForCollection(parentRecord.category)}
        filterRows={isGamePlan ? (row) => (row.unit || parentRecord.category || selectedUnit) === selectedUnit : undefined}
        statusFilter
        reloadToken={reloadToken}
        busy={busy}
        fetchRows={fetchRows}
        showPage={!isGamePlan}
        onReorder={readOnly ? undefined : onReorder}
        onNew={isGamePlan && onNew ? () => onNew(selectedUnit) : onNew}
        newLabel={isGamePlan ? 'Add Play' : newLabel}
        onSecondaryNew={!isGamePlan ? onNewGrouping : undefined}
        secondaryNewLabel="New Grouping"
        menuItems={[{ label: `Print ${parentLabel}...`, icon: Printer, onClick: onPrintAll }]}
        onRowDoubleClick={onOpenPlay}
        rowActions={rowActions}
      />}
      </>}
    </main>
  )
}

function WorkspaceApp({ authUser, workspace, api, onWorkspaceChange, onUserUpdated, onWorkspaceUpdated, onGuardChange, onSignOut, requestLeave, busy, switchingSubscription }) {
  const [breadcrumbActionsTarget, setBreadcrumbActionsTarget] = useState(null)
  const [breadcrumbSettingsTarget, setBreadcrumbSettingsTarget] = useState(null)
  const [view, setView] = useState('playbooks')
  const [accountDialog, setAccountDialog] = useState(null)
  const [parent, setParent] = useState(null)
  const [gameCard, setGameCard] = useState(null)
  const [gamePlanUnit, setGamePlanUnit] = useState('Offense')
  const [gamePlanTab, setGamePlanTab] = useState('practiceScripts')
  const [cardPlaybook, setCardPlaybook] = useState(null)
  const [designer, setDesigner] = useState(null)
  const [newDialog, setNewDialog] = useState(null)
  const [groupingDialog, setGroupingDialog] = useState(null)
  const [newCollection, setNewCollection] = useState(null)
  const [printPlay, setPrintPlay] = useState(null)
  const [printCollection, setPrintCollection] = useState(null)
  const [playbooksReloadToken, setPlaybooksReloadToken] = useState(0)
  const [playbookCounts, setPlaybookCounts] = useState(null)
  const [gamePlansReloadToken, setGamePlansReloadToken] = useState(0)
  const [playsReloadToken, setPlaysReloadToken] = useState(0)
  const [scoutPlaysReloadToken, setScoutPlaysReloadToken] = useState(0)
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusError, setStatusError] = useState(null)

  const writable = workspace.capabilities.edit
  const defaults = { ...workspace.defaults, ...authUser.preferences }
  const fetchPlaybooks = useCallback(({ namePrefix }) => api.listPlaybooks(undefined, namePrefix, true).then((result) => result.items), [api])
  const fetchGamePlans = useCallback(({ namePrefix }) => api.listGamePlans(undefined, namePrefix, true).then((result) => result.items), [api])

  useEffect(() => {
    let active = true
    api.listPlaybooks().then(({ items }) => {
      const counts = { Offense: 0, Defense: 0, 'Special Teams': 0 }
      for (const playbook of items.filter((item) => item.recordStatus !== 'Archived' && !item.gameCardId)) {
        if (Object.prototype.hasOwnProperty.call(counts, playbook.category)) counts[playbook.category] += 1
      }
      if (active) setPlaybookCounts(counts)
    }).catch(() => {
      if (active) setPlaybookCounts(null)
    })
    return () => { active = false }
  }, [api, playbooksReloadToken])

  const parentId = parent?.id
  const fetchPlays = useCallback(async ({ namePrefix }) => withAdjustmentTitles(api, parentId, (await api.listPlaybookRows(parentId, namePrefix, true)).items), [api, parentId])
  const fetchScoutPlays = useCallback(({ namePrefix }) => api.listScoutPlays(parentId, undefined, namePrefix, true).then((result) => result.items), [api, parentId])
  const cardPlaybookId = cardPlaybook?.id
  const fetchCardPlaybookPlays = useCallback(async ({ namePrefix }) => withAdjustmentTitles(api, cardPlaybookId, (await api.listPlays(cardPlaybookId, undefined, namePrefix, true, true)).items), [api, cardPlaybookId])

  async function handleCreateCollection(payload) {
    if (newCollection === 'playbook') {
      await api.createPlaybook(payload)
      setPlaybooksReloadToken((t) => t + 1)
    } else {
      await api.createGamePlan(payload)
      setGamePlansReloadToken((t) => t + 1)
    }
    setNewCollection(null)
    onWorkspaceUpdated(await api.workspace())
  }

  async function handleCreateScheduleGame(payload) {
    const game = await api.createGamePlan(payload)
    setGamePlansReloadToken((token) => token + 1)
    return game
  }

  async function handleCreateGameCardItem(name) {
    const card = newDialog.card
    await api.createPlaybook({
      name,
      category: card.unit,
      year: Number(parent.year || new Date().getFullYear()),
      gamePlanId: parent.id,
      gameCardId: card.id,
    })
    setPlaybooksReloadToken((token) => token + 1)
    setNewDialog(null)
    onWorkspaceUpdated(await api.workspace())
  }

  async function handleDeleteGameCardItem(item) {
    await api.deletePlaybook(item.id)
    setPlaybooksReloadToken((token) => token + 1)
    onWorkspaceUpdated(await api.workspace())
  }

  async function handleDuplicateGameCardItem(item) {
    const duplicate = await api.createPlaybook({
      name: `${item.name} (Copy)`,
      category: item.category,
      year: item.year,
      gamePlanId: item.gamePlanId,
      gameCardId: item.gameCardId,
      ...(Array.isArray(item.installPlays) && { installPlays: item.installPlays }),
    })
    try {
      const card = GAME_CARD_VIEWS.find((viewItem) => viewItem.id === item.gameCardId)
      if (card?.tab === 'scout') {
        const { items: plays } = await api.listPlays(item.id)
        for (const play of plays.filter((record) => record.recordStatus !== 'Archived')) {
          await api.createPlay(duplicate.id, {
            name: play.name,
            template: play.template,
            theme: play.theme,
            category: play.category,
            fieldDecoration: play.fieldDecoration,
            fieldOrientation: play.fieldOrientation,
            fieldZone: play.fieldZone,
            perspective: play.perspective || defaultPlayPerspective(item.category),
            markers: play.markers,
            drawings: play.drawings,
            textAnnotations: play.textAnnotations,
            zones: play.zones,
          })
        }
      }
    } catch (failure) {
      await api.deletePlaybook(duplicate.id).catch(() => {})
      throw failure
    }
    setPlaybooksReloadToken((token) => token + 1)
    onWorkspaceUpdated(await api.workspace())
  }

  async function handleCopyCollection(kind, row) {
    const payload = {
      name: `${row.name} (Copy)`,
      category: row.category,
      year: row.year,
      ...(kind === 'gamePlan' && { opponent: row.opponent, gameDate: row.gameDate }),
    }
    if (kind === 'playbook') {
      await api.createPlaybook(payload)
      setPlaybooksReloadToken((t) => t + 1)
    } else {
      await api.createGamePlan(payload)
      setGamePlansReloadToken((t) => t + 1)
    }
  }

  async function handleDeleteCollection(kind, row) {    if (!window.confirm(`Delete "${row.name}"?`)) return
    if (kind === 'playbook') {
      await api.deletePlaybook(row.id)
      setPlaybooksReloadToken((t) => t + 1)
    } else {
      await api.deleteGamePlan(row.id)
      setGamePlansReloadToken((t) => t + 1)
    }
  }

  async function handlePrintCollection(kind, row) {
    const result = kind === 'playbook' ? await api.listPlays(row.id) : await api.listScoutPlays(row.id)
    setPrintCollection({ collection: { ...row, kind }, plays: result.items })
  }

  async function handleRecordStatus(kind, row, parentId) {
    const restoring = row.recordStatus === 'Archived'
    if (!restoring && !window.confirm(`Archive "${row.name}"? It will be hidden from the default Active grid view. Its data will remain intact in the database and can be restored later.`)) return
    setStatusSaving(true)
    setStatusError(null)
    try {
      const payload = { recordStatus: restoring ? 'Active' : 'Archived' }
      if (kind === 'playbook') {
        await api.updatePlaybook(row.id, payload)
        setPlaybooksReloadToken((token) => token + 1)
      } else if (kind === 'gamePlan') {
        await api.updateGamePlan(row.id, payload)
        setGamePlansReloadToken((token) => token + 1)
      } else if (kind === 'play') {
        await api.updatePlay(parentId, row.id, payload)
        setPlaysReloadToken((token) => token + 1)
      } else {
        await api.updateScoutPlay(parentId, row.id, payload)
        setScoutPlaysReloadToken((token) => token + 1)
      }
    } catch (error) {
      setStatusError(`Unable to ${restoring ? 'restore' : 'archive'} "${row.name}": ${error.message}`)
    } finally {
      setStatusSaving(false)
    }
  }

  function recordStatusAction(kind, row, parentId) {
    const restoring = row.recordStatus === 'Archived'
    return { key: restoring ? 'restore' : 'archive', label: restoring ? 'Restore' : 'Archive', icon: restoring ? ArchiveRestore : Archive, onClick: (item) => handleRecordStatus(kind, item, parentId) }
  }

  function collectionRowActions(kind) {
    return (row) => [
      { key: 'open', label: 'Open', icon: FolderOpen, onClick: (item) => { setGameCard(null); setParent({ ...item, kind }) } },
      ...(writable ? [{ key: 'copy', label: 'Duplicate', icon: Copy, onClick: (item) => handleCopyCollection(kind, item) }] : []),
      { key: 'print', label: 'Print...', icon: Printer, onClick: (item) => handlePrintCollection(kind, item) },
      ...(writable ? [recordStatusAction(kind, row)] : []),
      ...(workspace.capabilities.delete ? [{ key: 'delete', label: 'Delete', icon: Trash2, destructive: true, onClick: (item) => handleDeleteCollection(kind, item) }] : []),
    ]
  }

  async function appendPlayToGrouping(parentId, groupingId, playId) {
    const { items } = await api.listPlaybookRows(parentId)
    const rows = items.filter((item) => item.id !== playId)
    const groupingIndex = rows.findIndex((item) => item.id === groupingId)
    const play = items.find((item) => item.id === playId)
    if (groupingIndex < 0 || !play) return
    const nextGroupingIndex = rows.findIndex((item, index) => index > groupingIndex && item.rowType === 'grouping')
    const insertAt = nextGroupingIndex < 0 ? rows.length : nextGroupingIndex
    rows.splice(insertAt, 0, play)
    await api.reorderPlays(parentId, rows.map((item) => item.id))
  }

  async function handleCreatePlay(name, gameType, templateId, theme, category, fieldDecoration, fieldOrientation, fieldZone) {
    const { target, parentId, unit, groupingId } = newDialog
    setNewDialog(null)
    const collectionCategory = newDialog.category || parent?.category
    const perspective = defaultPlayPerspective(target === 'scoutPlay' || newDialog.practiceScript ? 'Offense' : collectionCategory)
    const playUnit = target === 'scoutPlay' ? unit || collectionCategory : undefined
    const designerParentCategory = target === 'scoutPlay' ? playUnit : collectionCategory
    const template = findPlayTemplate(templateId) || DEFAULT_PLAY_TEMPLATE
    const initialMarkers = buildMarkersFromTemplate(template).map((marker) =>
      perspective === PLAY_PERSPECTIVES[1] ? { ...marker, y: 100 - marker.y } : marker,
    )
    const record =
      target === 'play'
        ? await api.createPlay(parentId, {
            name,
          gameType,
            template: templateId,
            theme,
            category,
            fieldDecoration,
            fieldOrientation,
            fieldZone,
            perspective,
            markers: initialMarkers,
          })
        : await api.createScoutPlay(parentId, {
            name,
          gameType,
            template: templateId,
            theme,
            category,
            fieldDecoration,
            fieldOrientation,
            fieldZone,
            perspective,
            unit: playUnit,
          })
    if (target === 'play' && groupingId) {
          await appendPlayToGrouping(parentId, groupingId, record.id)
      setPlaysReloadToken((token) => token + 1)
    }
    setDesigner({
      kind: target,
      parentId,
      id: record.id,
      name: record.name,
      gameType: record.gameType || template.gameType,
      initialMarkers: record.markers || initialMarkers,
      initialDrawings: record.drawings,
      initialTextAnnotations: record.textAnnotations,
      initialZones: record.zones,
      initialTheme: record.theme,
      template: record.template,
      category: record.category,
      parentCategory: designerParentCategory,
      fieldDecoration: record.fieldDecoration,
      fieldOrientation: record.fieldOrientation,
      fieldZone: record.fieldZone,
        perspective: record.perspective || perspective,
    })
  }

  async function handleSaveGrouping(name) {
    const { parentId, grouping } = groupingDialog
    if (grouping) await api.updateGrouping(parentId, grouping.id, { name })
    else await api.createGrouping(parentId, { name })
    setGroupingDialog(null)
    setPlaysReloadToken((token) => token + 1)
  }

  async function handleDeleteGrouping(parentId, grouping) {
    if (!window.confirm(`Delete grouping "${grouping.name}"?`)) return
    await api.deleteGrouping(parentId, grouping.id)
    setPlaysReloadToken((token) => token + 1)
  }

  async function loadPlayDetails(kind, parentId, row) {
    if (kind !== 'play' || (row.markers !== undefined && row.theme !== undefined)) return row
    try {
      return await api.getPlay(parentId, row.id)
    } catch (error) {
      setStatusError(`Unable to load play: ${error.message}`)
      return null
    }
  }

  async function openDesignerForRow(kind, parentId, row, collection = parent, readOnly = false) {
    row = await loadPlayDetails(kind, parentId, row)
    if (!row) return
    const template = findPlayTemplate(row.template) || DEFAULT_PLAY_TEMPLATE
    setDesigner({
      kind,
      parentId,
      id: row.id,
      name: row.name,
      gameType: row.gameType || template.gameType,
      readOnly,
      initialMarkers: row.markers || buildMarkersFromTemplate(template),
      initialDrawings: row.drawings,
      initialTextAnnotations: row.textAnnotations,
      initialZones: row.zones,
      initialTheme: row.theme,
      template: row.template,
      category: row.category,
      parentCategory: collection?.kind === 'gamePlan' ? row.unit || collection.category : collection?.category,
      fieldDecoration: row.fieldDecoration,
      fieldOrientation: row.fieldOrientation,
      fieldZone: row.fieldZone,
        perspective: row.perspective || defaultPlayPerspective(collection?.category),
    })
  }

  async function handleCopyPlay(kind, parentId, row) {
    row = await loadPlayDetails(kind, parentId, row)
    if (!row) return
    let groupingId
    if (kind === 'play') {
      const { items } = await api.listPlaybookRows(parentId)
      const rowIndex = items.findIndex((item) => item.id === row.id)
      groupingId = items.slice(0, rowIndex).reverse().find((item) => item.rowType === 'grouping')?.id
    }
    const payload = {
      name: `${row.name} (Copy)`,
      gameType: row.gameType || findPlayTemplate(row.template)?.gameType,
      template: row.template,
      theme: row.theme,
      category: row.category,
      fieldDecoration: row.fieldDecoration,
      fieldOrientation: row.fieldOrientation,
      fieldZone: row.fieldZone,
      perspective: row.perspective || defaultPlayPerspective(parent?.category),
      markers: row.markers,
      drawings: row.drawings,
      textAnnotations: row.textAnnotations,
      zones: row.zones,
    }
    if (kind === 'play') {
      const duplicate = await api.createPlay(parentId, payload)
      if (groupingId) await appendPlayToGrouping(parentId, groupingId, duplicate.id)
      setPlaysReloadToken((t) => t + 1)
    } else {
      await api.createScoutPlay(parentId, payload)
      setScoutPlaysReloadToken((t) => t + 1)
    }
  }

  async function handleDeletePlay(kind, parentId, row) {
    if (!window.confirm(`Delete "${row.name}"?`)) return
    if (kind === 'play') {
      await api.deletePlay(parentId, row.id)
      setPlaysReloadToken((t) => t + 1)
    } else {
      await api.deleteScoutPlay(parentId, row.id)
      setScoutPlaysReloadToken((t) => t + 1)
    }
  }

  function playRowActions(kind, parentId) {
    const collection = cardPlaybook?.id === parentId ? cardPlaybook : parent
    return (row) => row.rowType === 'grouping' ? [
      ...(writable ? [{ key: 'add-play', label: 'Add Play', icon: Plus, onClick: (item) => setNewDialog({ target: 'play', parentId, groupingId: item.id }) }] : []),
      ...(writable ? [{ key: 'edit-group-name', label: 'Edit Group Name', icon: Pencil, onClick: (item) => setGroupingDialog({ parentId, grouping: item }) }] : []),
      ...(workspace.capabilities.delete ? [{ key: 'delete-grouping', label: 'Delete', icon: Trash2, destructive: true, onClick: (item) => handleDeleteGrouping(parentId, item) }] : []),
    ] : [
      { key: 'open', label: 'Open', icon: FolderOpen, onClick: (r) => openDesignerForRow(kind, parentId, r, collection) },
      ...(writable ? [{ key: 'copy', label: 'Duplicate', icon: Copy, onClick: (r) => handleCopyPlay(kind, parentId, r) }] : []),
      { key: 'print', label: 'Print...', icon: Printer, onClick: async (r) => {
        const play = await loadPlayDetails(kind, parentId, r)
        if (play) setPrintPlay({ ...play, perspective: play.perspective || defaultPlayPerspective(collection?.category) })
      } },
      ...(writable ? [recordStatusAction(kind, row, parentId)] : []),
      ...(workspace.capabilities.delete ? [{ key: 'delete', label: 'Delete', icon: Trash2, destructive: true, onClick: (r) => handleDeletePlay(kind, parentId, r) }] : []),
    ]
  }

  return (
    <>
      <AppBar
        activeView={view}
        user={authUser}
        workspace={workspace}
        busy={busy}
        switchingSubscription={switchingSubscription}
        onWorkspaceChange={onWorkspaceChange}
        onSignOut={onSignOut}
        onNavigate={(nextView) => requestLeave(() => {
          if (['settings', 'profile', 'billing', 'team'].includes(nextView)) {
            setDesigner(null)
            setParent(null)
            setGameCard(null)
            setCardPlaybook(null)
            if (['profile', 'team', 'billing'].includes(view)) setView('playbooks')
            setAccountDialog(nextView)
          } else {
            setAccountDialog(null)
            setDesigner(null)
            setParent(null)
            setGameCard(null)
            setCardPlaybook(null)
            setView(nextView)
          }
        }, ['settings', 'profile', 'billing'].includes(nextView) ? `Open ${nextView}` : 'Leave this view')}
      />

      <nav className="breadcrumb-bar" aria-label="Breadcrumb">
        <ol>
          <li>
            {parent ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => requestLeave(() => {
                  setDesigner(null)
                  setParent(null)
                  setGameCard(null)
                  setCardPlaybook(null)
                  setView(parent.kind === 'playbook' ? 'playbooks' : 'teamSchedule')
                }, parent.kind === 'playbook' ? 'Leave playbook' : 'Leave game')}
              >
                <BreadcrumbLabel icon={parent.kind === 'playbook' ? BookOpen : CalendarDays}>
                  {parent.kind === 'playbook' ? 'Playbooks' : 'Team Schedule'}
                </BreadcrumbLabel>
              </button>
            ) : (
              <span aria-current="page">
                <BreadcrumbLabel icon={view === 'teamSchedule' ? CalendarDays : view === 'gamePlans' ? ClipboardList : BookOpen}>
                  {view === 'teamSchedule' ? 'Team Schedule' : view === 'gamePlans' ? 'Game Plans' : 'Playbooks'}
                </BreadcrumbLabel>
              </span>
            )}
          </li>
          {parent && <li>
            {parent.kind === 'gamePlan' && gameCard ? (
              <button type="button" disabled={busy} onClick={() => requestLeave(() => { setDesigner(null); setGameCard(null); setCardPlaybook(null) }, 'Return to game cards')}>
                <BreadcrumbLabel icon={CalendarDays}>{gameBreadcrumbLabel(parent)}</BreadcrumbLabel>
              </button>
            ) : designer ? (
              <button type="button" disabled={busy} onClick={() => requestLeave(() => setDesigner(null), 'Close play')}>
                <BreadcrumbLabel icon={parent.kind === 'gamePlan' ? CalendarDays : BookOpen}>
                  {parent.kind === 'gamePlan' ? gameBreadcrumbLabel(parent) : parent.name}
                </BreadcrumbLabel>
              </button>
            ) : (
              <span aria-current="page">
                <BreadcrumbLabel icon={parent.kind === 'gamePlan' ? CalendarDays : BookOpen}>
                  {parent.kind === 'gamePlan' ? gameBreadcrumbLabel(parent) : parent.name}
                </BreadcrumbLabel>
              </span>
            )}
          </li>}
          {cardPlaybook && <li>
            {designer
              ? <button type="button" disabled={busy} onClick={() => requestLeave(() => setDesigner(null), 'Close play')}><BreadcrumbLabel icon={BookOpen}>{cardPlaybook.name}</BreadcrumbLabel></button>
              : <span aria-current="page"><BreadcrumbLabel icon={BookOpen}>{cardPlaybook.name}</BreadcrumbLabel></span>}
            {!designer && <div className="breadcrumb-settings-target" ref={setBreadcrumbSettingsTarget} />}
          </li>}
          {designer && <li>
            <span aria-current="page"><BreadcrumbLabel icon={designer.kind === 'scoutPlay' ? ScanSearch : PlayDiagramIcon}>{designer.name}</BreadcrumbLabel></span>
            <div className="breadcrumb-settings-target" ref={setBreadcrumbSettingsTarget} />
          </li>}
        </ol>
        <div className="breadcrumb-actions" ref={setBreadcrumbActionsTarget} />
      </nav>

      {view === 'playbooks' && !parent && !designer && !accountDialog && <PlaybooksBanner teamName={workspace.name} counts={playbookCounts} />}

      {!writable && <div className="workspace-read-only" role="status">{workspace.name}: read-only</div>}
      {statusError && <p className="data-grid-status data-grid-error" role="alert">{statusError}</p>}

      <NewPlayDialog
        key={`${workspace.id}:${parent?.category}:${newDialog?.category}:${newDialog?.unit}:${defaults.theme}:${defaults.fieldOrientation}`}
        open={newDialog?.target === 'play' || newDialog?.target === 'scoutPlay'}
        titleLabel={newDialog?.scoutingReport ? 'New Scouting Report' : newDialog?.target === 'scoutPlay' || newDialog?.practiceScript ? 'New Scout Play' : 'New Play'}
        titleIcon={newDialog?.target === 'scoutPlay' ? ScanSearch : Play}
        onCancel={() => setNewDialog(null)}
        onCreate={handleCreatePlay}
        defaultTheme={defaults.theme}
        defaultFieldOrientation={defaults.fieldOrientation}
        categoryOptions={playCategoriesForCollection(newDialog?.unit || newDialog?.category || parent?.category)}
      />
      {groupingDialog && <GroupingDialog key={groupingDialog.grouping?.id || 'new-grouping'} grouping={groupingDialog.grouping} onCancel={() => setGroupingDialog(null)} onSave={handleSaveGrouping} />}
      {newDialog?.target === 'gameCardItem' && <GameCardItemDialog card={newDialog.card} initialName={gameCardItemDefaultName(parent, newDialog.card)} onCancel={() => setNewDialog(null)} onCreate={handleCreateGameCardItem} />}
      {newCollection && (
        <NewCollectionDialog
          title={newCollection === 'playbook' ? 'Add New Playbook' : 'Add New Game Plan'}
          titleIcon={newCollection === 'playbook' ? BookOpen : ClipboardList}
          isPlaybook={newCollection === 'playbook'}
          onCancel={() => setNewCollection(null)}
          onCreate={handleCreateCollection}
        />
      )}
      {printPlay && <PrintPreviewDialog play={printPlay} onClose={() => setPrintPlay(null)} />}
      {printCollection && (
        <PrintPreviewDialog
          plays={printCollection.plays}
          collection={printCollection.collection}
          onClose={() => setPrintCollection(null)}
        />
      )}

      {designer ? (
        <PlayDesigner
          key={`${designer.kind}-${designer.id}`}
          record={designer}
          api={api}
          readOnly={!writable || designer.readOnly}
          canDelete={workspace.capabilities.delete}
          breadcrumbActionsTarget={breadcrumbActionsTarget}
          breadcrumbSettingsTarget={breadcrumbSettingsTarget}
          onGuardChange={onGuardChange}
          onNameSaved={(name) => setDesigner((current) => current ? { ...current, name } : current)}
        />
      ) : cardPlaybook ? (
        <PlaysDrillthroughView
          key={`card-playbook-${cardPlaybook.id}`}
          reloadToken={playsReloadToken}
          busy={statusSaving}
          parentRecord={cardPlaybook}
          parentLabel={gameCard?.tab === 'installs' ? 'Install' : 'Practice Script'}
          gameCard={gameCard}
          breadcrumbActionsTarget={breadcrumbActionsTarget}
          breadcrumbSettingsTarget={breadcrumbSettingsTarget}
          onParentUpdated={(updated) => setCardPlaybook((current) => ({ ...current, ...updated, kind: 'playbook' }))}
          readOnly={!writable}
          timezone={authUser.preferences?.timezone}
          onGuardChange={onGuardChange}
          updateParent={api.updatePlaybook}
          api={api}
          title="Plays"
          rowIcon={PlayDiagramIcon}
          rowType="Play"
          fetchRows={fetchCardPlaybookPlays}
          onReorder={(ids) => api.reorderPlays(cardPlaybook.id, ids)}
          onNew={writable && gameCard?.tab === 'scout' ? () => setNewDialog({ target: 'play', parentId: cardPlaybook.id, category: cardPlaybook.category, practiceScript: true }) : undefined}
          onNewGrouping={writable && gameCard?.tab === 'installs' ? () => setGroupingDialog({ parentId: cardPlaybook.id }) : undefined}
          onEditGrouping={(grouping) => setGroupingDialog({ parentId: cardPlaybook.id, grouping })}
          onDeleteGrouping={workspace.capabilities.delete ? (grouping) => handleDeleteGrouping(cardPlaybook.id, grouping) : undefined}
          newLabel="New Scout Play"
          onOpenPlay={(row) => requestLeave(() => openDesignerForRow('play', row.sourcePlaybookId || cardPlaybook.id, row, cardPlaybook, gameCard?.tab === 'installs'), gameCard?.tab === 'installs' ? 'View installed play' : 'Open scout play')}
          onPrintAll={() => handlePrintCollection('playbook', cardPlaybook)}
          rowActions={playRowActions('play', cardPlaybook.id)}
        />
      ) : parent?.kind === 'playbook' ? (
        <PlaysDrillthroughView
          key={`plays-${parent.id}`}
          reloadToken={playsReloadToken}
          busy={statusSaving}
          parentRecord={parent}
          parentLabel="Playbook"
          breadcrumbActionsTarget={breadcrumbActionsTarget}
          breadcrumbSettingsTarget={breadcrumbSettingsTarget}
          onParentUpdated={(updated) => setParent((current) => ({ ...current, ...updated, kind: 'playbook' }))}
          readOnly={!writable}
          timezone={authUser.preferences?.timezone}
          onGuardChange={onGuardChange}
          updateParent={api.updatePlaybook}
          title="Plays"
          rowIcon={PlayDiagramIcon}
          rowType="Play"
          fetchRows={fetchPlays}
          onReorder={(ids) => api.reorderPlays(parent.id, ids)}
          onNew={writable ? () => setNewDialog({ target: 'play', parentId: parent.id }) : undefined}
          onNewGrouping={writable ? () => setGroupingDialog({ parentId: parent.id }) : undefined}
          newLabel="New Play"
          onOpenPlay={(row) => requestLeave(() => openDesignerForRow('play', parent.id, row), 'Open play')}
          onPrintAll={() => handlePrintCollection('playbook', parent)}
          rowActions={playRowActions('play', parent.id)}
        />
      ) : parent?.kind === 'gamePlan' ? (
        <PlaysDrillthroughView
          key={`scoutPlays-${parent.id}`}
          busy={statusSaving}
          parentRecord={parent}
          parentLabel="Game"
          gameCard={gameCard}
          gamePlanUnit={gamePlanUnit}
          gamePlanTab={gamePlanTab}
          onGamePlanSelectionChange={(unit, tab) => { setGamePlanUnit(unit); setGamePlanTab(tab) }}
          breadcrumbActionsTarget={breadcrumbActionsTarget}
          breadcrumbSettingsTarget={breadcrumbSettingsTarget}
          onParentUpdated={(updated) => setParent((current) => ({ ...current, ...updated, kind: 'gamePlan' }))}
          readOnly={!writable}
          timezone={authUser.preferences?.timezone}
          onGuardChange={onGuardChange}
          updateParent={api.updateGamePlan}
          api={api}
          title="Scout Plays"
          rowIcon={ScanSearch}
          rowType="Scout Play"
          fetchRows={fetchScoutPlays}
          onReorder={(ids) => api.reorderScoutPlays(parent.id, ids)}
          onNew={writable ? (unit, tab) => setNewDialog({ target: 'scoutPlay', parentId: parent.id, unit, scoutingReport: tab === 'scoutingReports' }) : undefined}
          newLabel="Add Play"
          onOpenPlay={(row) => requestLeave(() => openDesignerForRow('scoutPlay', parent.id, row), 'Open scouting play')}
          onPrintAll={() => handlePrintCollection('gamePlan', parent)}
          rowActions={playRowActions('scoutPlay', parent.id)}
          reloadToken={scoutPlaysReloadToken + playbooksReloadToken}
          onAddGameCardItem={writable && workspace.usage.playbooks < workspace.limits.playbooks ? (card) => setNewDialog({ target: 'gameCardItem', card }) : undefined}
          onOpenGameCardItem={(card, item) => {
            setGamePlanUnit(card.unit)
            setGamePlanTab(card.tab === 'installs' ? 'installs' : 'practiceScripts')
            setGameCard(card)
            setCardPlaybook({ ...item, kind: 'playbook' })
          }}
          onDuplicateGameCardItem={handleDuplicateGameCardItem}
          onDeleteGameCardItem={handleDeleteGameCardItem}
          canAddGameCardItem={writable && workspace.usage.playbooks < workspace.limits.playbooks}
          canDuplicateGameCardItem={writable && workspace.usage.playbooks < workspace.limits.playbooks}
          canDeleteGameCardItem={workspace.capabilities.delete}
        />
      ) : (
        <>
      {view === 'teamSchedule' && (
        <TeamSchedule
          key="teamSchedule"
          api={api}
          canEdit={writable}
          canDelete={workspace.capabilities.delete}
          canCreateGame={writable && workspace.usage.gamePlans < workspace.limits.gamePlans}
          onCreateGame={handleCreateScheduleGame}
          onOpenGame={(game) => { setGameCard(null); setParent({ ...game, kind: 'gamePlan' }) }}
          onWorkspaceUpdated={() => api.workspace().then(onWorkspaceUpdated)}
        />
      )}

      {view === 'playbooks' && (
        <DataGrid
          key="playbooks"
          reloadToken={playbooksReloadToken}
          busy={statusSaving}
          title="Playbooks"
          columns={timezoneColumns(PLAYBOOK_GRID_COLUMNS, authUser.preferences?.timezone)}
          rowIcon={BookOpen}
          rowType="Playbook"
          categoryOptions={COLLECTION_CATEGORIES}
          filterRows={(row) => !row.gameCardId}
          statusFilter
          fetchRows={fetchPlaybooks}
          onNew={writable && workspace.usage.playbooks < workspace.limits.playbooks ? () => setNewCollection('playbook') : undefined}
          newLabel="New Playbook"
          rowActions={collectionRowActions('playbook')}
          onRowDoubleClick={(row) => { setGameCard(null); setParent({ ...row, kind: 'playbook' }) }}
        />
      )}

      {view === 'gamePlans' && (
        <DataGrid
          key="gamePlans"
          reloadToken={gamePlansReloadToken}
          busy={statusSaving}
          title="Game Plans"
          columns={timezoneColumns(GAME_PLAN_GRID_COLUMNS, authUser.preferences?.timezone)}
          rowIcon={ClipboardList}
          rowType="Game Plan"
          categoryOptions={COLLECTION_CATEGORIES}
          statusFilter
          fetchRows={fetchGamePlans}
          onNew={writable && workspace.usage.gamePlans < workspace.limits.gamePlans ? () => setNewCollection('gamePlan') : undefined}
          newLabel="New Game Plan"
          rowActions={collectionRowActions('gamePlan')}
          onRowDoubleClick={(row) => { setGameCard(null); setParent({ ...row, kind: 'gamePlan' }) }}
        />
      )}

        </>
      )}
      {accountDialog && <AccountViews
        key={accountDialog}
        view={accountDialog}
        user={authUser}
        workspace={workspace}
        api={api}
        onUserUpdated={onUserUpdated}
        onWorkspaceUpdated={onWorkspaceUpdated}
        onGuardChange={onGuardChange}
        onDismiss={() => requestLeave(() => setAccountDialog(null), `Close ${accountDialog}`)}
        onSaved={() => setAccountDialog(null)}
      />}
    </>
  )
}

function App() {
  const [signedOut, setSignedOut] = useState(isSignedOut)
  const [user, setUser] = useState(null)
  const [entry, setEntry] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mutations, setMutations] = useState(0)
  const [leave, setLeave] = useState(null)
  const [savingLeave, setSavingLeave] = useState(false)
  const [inviteToken, setInviteToken] = useState(() => new URLSearchParams(location.hash.slice(1)).get('invite'))
  const guard = useRef(null)
  const generation = useRef(0)
  const pending = useRef(0)
  const entryRef = useRef(null)
  const selectedWorkspaceId = entry?.workspace.id

  function mutationState(delta) {
    pending.current += delta
    setMutations(pending.current)
  }

  async function loadWorkspace(id) {
    const current = ++generation.current
    setLoading(true)
    setError(null)
    try {
      const client = createApi(id, mutationState)
      const workspace = await client.workspace()
      if (current !== generation.current) return
      const next = { workspace, api: client }
      entryRef.current = next
      setEntry(next)
      setUser((identity) => ({ ...identity, workspaces: identity.workspaces.map((item) => item.id === id ? workspace : item) }))
      try { sessionStorage.setItem('blitzboard:workspace', id) } catch { return }
    } catch (failure) {
      if (current === generation.current) {
        setError(failure.message)
        if (failure.status === 403) await recoverWorkspace(id)
      }
    } finally {
      if (current === generation.current) setLoading(false)
    }
  }

  async function recoverWorkspace(unavailableId) {
    entryRef.current = null
    setEntry(null)
    guard.current = null
    setLeave(null)
    const identity = await api.me()
    setUser(identity)
    const fallback = identity.workspaces.find((item) => item.kind === 'individual' && item.id !== unavailableId)
    if (fallback) await loadWorkspace(fallback.id)
  }

  useEffect(() => {
    if (signedOut) return
    let active = true
    api.me().then((identity) => {
      if (!active) return
      setUser(identity)
      let stored
      try { stored = sessionStorage.getItem('blitzboard:workspace') } catch { stored = null }
      const workspace = identity.workspaces.find((item) => item.id === stored) || identity.workspaces[0]
      if (!workspace) throw new Error('No accessible workspace')
      return loadWorkspace(workspace.id)
    }).catch((failure) => { if (active) { setError(failure.message); setLoading(false) } })
    return () => { active = false; generation.current += 1 }
  }, [signedOut])

  function handleSignOut() {
    requestLeave(() => {
      signOut()
      generation.current += 1
      entryRef.current = null
      guard.current = null
      setEntry(null)
      setUser(null)
      setError(null)
      setLeave(null)
      setInviteToken(null)
      setLoading(false)
      setSignedOut(true)
      history.replaceState(null, '', location.pathname + location.search)
    }, 'Sign Out')
  }

  function handleSignIn() {
    signIn()
    setError(null)
    setLoading(true)
    setSignedOut(false)
  }

  function requestLeave(action, title) {
    if (pending.current || savingLeave || loading) return
    if (guard.current?.dirty) setLeave({ action, title, canSave: Boolean(guard.current.save) && guard.current.canSave !== false })
    else action()
  }

  function updateWorkspace(workspace) {
    if (entryRef.current?.workspace.id !== workspace.id) return
    const next = { ...entryRef.current, workspace }
    entryRef.current = next
    setEntry(next)
    setUser((identity) => ({ ...identity, workspaces: identity.workspaces.map((item) => item.id === workspace.id ? workspace : item) }))
  }

  const refreshWorkspace = useEffectEvent(async () => {
    const selected = entryRef.current
    if (!selected || pending.current || loading) return
    try {
      const workspace = await selected.api.workspace()
      if (entryRef.current?.api === selected.api) updateWorkspace(workspace)
    } catch (failure) {
      if (entryRef.current?.api === selected.api) {
        setError(failure.message)
        if (failure.status === 403) {
          try { await recoverWorkspace(selected.workspace.id) } catch (recoveryFailure) { setError(recoveryFailure.message) }
        }
      }
    }
  })

  useEffect(() => {
    if (!selectedWorkspaceId || mutations) return
    const initial = setTimeout(refreshWorkspace, 0)
    const timer = setInterval(refreshWorkspace, 60000)
    return () => { clearTimeout(initial); clearInterval(timer) }
  }, [selectedWorkspaceId, mutations])

  useEffect(() => {
    function beforeUnload(event) {
      if (guard.current?.dirty) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [])

  async function saveAndLeave() {
    setSavingLeave(true)
    try {
      const saved = await guard.current?.save()
      if (saved !== false) { setLeave(null); leave.action() }
    } finally {
      setSavingLeave(false)
    }
  }

  async function acceptInvite() {
    setSavingLeave(true)
    setError(null)
    try {
      const workspace = await api.acceptInvitation(inviteToken)
      setUser(await api.me())
      setInviteToken(null)
      history.replaceState(null, '', location.pathname + location.search)
      await loadWorkspace(workspace.id)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setSavingLeave(false)
    }
  }

  return <>
    {signedOut ? <><AppBar user={null} /><main className="auth-state"><h1>Signed out</h1>{isDevelopmentAuth && <button type="button" className="dialog-create" onClick={handleSignIn}>Sign In</button>}</main></> : inviteToken && user ? <><AppBar user={null} /><main className="account-view"><div className="account-view-heading"><Users size={24} /><h1>Team Invitation</h1></div>
      <div className="account-section"><p>{user.email || user.name}</p><div className="account-form-actions"><button type="button" className="dialog-cancel" disabled={savingLeave} onClick={() => { setInviteToken(null); history.replaceState(null, '', location.pathname + location.search) }}>Cancel</button><button type="button" className="dialog-create" disabled={savingLeave} onClick={acceptInvite}>{savingLeave ? 'Accepting...' : 'Accept Invitation'}</button></div></div>
    </main></> : entry && user ? <WorkspaceApp key={entry.workspace.id} authUser={user} workspace={entry.workspace} api={entry.api}
      onWorkspaceChange={(id) => { if (id !== entry.workspace.id) requestLeave(() => loadWorkspace(id), 'Switch subscription') }}
      onUserUpdated={setUser} onWorkspaceUpdated={updateWorkspace} onGuardChange={(value) => { guard.current = value }}
      onSignOut={handleSignOut}
      requestLeave={requestLeave} busy={loading || mutations > 0 || savingLeave} switchingSubscription={loading} />
      : <><AppBar user={null} /><main className="auth-state"><h1>{error ? 'Unable to sign in' : 'Signing in...'}</h1></main></>}
    {error && <p className="account-error" role="alert">{error}</p>}
    {leave && <div className="dialog-overlay leave-confirmation-overlay"><section className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby="leave-title">
      <h2 id="leave-title"><Save size={22} aria-hidden="true" />{leave.title}</h2><p>Save your changes before leaving?</p>
      <div className="dialog-actions">
        <button type="button" className="dialog-cancel" disabled={savingLeave} autoFocus onClick={() => setLeave(null)}>Cancel</button>
        <button type="button" className="dialog-cancel" disabled={savingLeave} onClick={() => { setLeave(null); leave.action() }}>Discard</button>
        <button type="button" className="dialog-create" disabled={savingLeave || !leave.canSave} onClick={saveAndLeave}><Save size={16} aria-hidden="true" />{savingLeave ? 'Saving...' : 'Save'}</button>
      </div>
    </section></div>}
  </>
}

export default App
