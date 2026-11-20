import { useEffect, useState } from 'react'
import { List, PencilRuler, Play, Plus, Trash2 } from 'lucide-react'
import { DataGrid } from './DataGrid'
import { ErrorDialog } from './ErrorDialog'
import { LoadingIndicator } from './LoadingIndicator'
import { PlayFieldView } from './PlayFieldView'
import { scoutPlayName } from '../utils/gamePlanWorkspace'
import './PracticeScriptPlayGrid.css'

const SCRIPT_FIELDS = [
  { key: 'hash', label: 'Hash' },
  { key: 'offFormation', label: 'OFF Formation', legacy: 'formation' },
  { key: 'offPlay', label: 'OFF Play', legacy: 'name' },
  { key: 'defFront', label: 'DEF Front', legacy: 'front' },
  { key: 'defStunt', label: 'DEF Stunt' },
  { key: 'defCoverage', label: 'DEF Coverage', legacy: 'cov' },
  { key: 'notes', label: 'Notes' },
]
const SUGGESTION_LIST_FIELDS = {
  offFormation: 'offFormation',
  offPlay: 'offPlay',
  defFront: 'defFront',
  defStunt: 'defStunt',
  defCoverage: 'defCoverage',
}
const HASHES = ['L', 'R', 'M']
// Read a script field, falling back to its legacy property name when needed.
const readField = (row, key) => row[key] ?? (SCRIPT_FIELDS.find((field) => field.key === key)?.legacy ? row[SCRIPT_FIELDS.find((field) => field.key === key).legacy] : '') ?? ''
// Load, edit, reorder, and render scout plays in a practice-script grid.
export function PracticeScriptPlayGrid({ api, playbookId, title, printTitle = title, fetchRows, reloadToken, busy, canEdit, suggestionLists = {}, onReorder, onOpenPlay, onCreatePlay, onNewGrouping, rowActions, menuItems = [] }) {
  const [scriptView, setScriptView] = useState('design')
  const [rows, setRows] = useState([])
  const [loadedToken, setLoadedToken] = useState(null)
  const [error, setError] = useState(null)
  const [drafts, setDrafts] = useState({})
  const [savingRows, setSavingRows] = useState({})
  const loading = loadedToken !== reloadToken

  useEffect(() => {
    let active = true
    fetchRows({ namePrefix: '' })
      .then((items) => { if (active) { setRows(items.filter((row) => !row._gridDeleted)); setDrafts({}); setError(null) } })
      .catch((failure) => { if (active) setError(failure) })
      .finally(() => { if (active) setLoadedToken(reloadToken) })
    return () => { active = false }
  }, [fetchRows, reloadToken])

  // Insert an unsaved scout-play row, optionally within a grouping.
  function addDraft(groupingId) {
    const draft = {
      id: `draft-${crypto.randomUUID()}`,
      isPracticeScriptDraft: true,
      ...(groupingId && { groupingId }),
      hash: 'M',
      offFormation: '',
      offPlay: '',
      defFront: '',
      defStunt: '',
      defCoverage: '',
      notes: '',
    }
    setRows((current) => {
      const next = [...current]
      if (groupingId) {
        const groupingIndex = next.findIndex((row) => row.id === groupingId)
        const nextGroupingIndex = next.findIndex((row, index) => index > groupingIndex && row.rowType === 'grouping')
        // Keep the new play contiguous with its group, before the next group header.
        next.splice(nextGroupingIndex < 0 ? next.length : nextGroupingIndex, 0, draft)
      } else next.push(draft)
      return next.map((row, index) => ({ ...row, page: index + 1 }))
    })
  }

  // Update a field directly on an unsaved draft row.
  function updateDraft(rowId, key, value) {
    setRows((current) => current.map((row) => row.id === rowId ? { ...row, [key]: value } : row))
  }

  // Stage a saved play's field change until it can be persisted.
  function updateSavedDraft(rowId, key, value) {
    setDrafts((current) => ({ ...current, [rowId]: { ...current[rowId], [key]: value } }))
  }

  // Persist staged field changes for a saved play.
  async function saveSavedDraft(row) {
    const changes = drafts[row.id]
    if (!canEdit || !changes || !Object.keys(changes).length) return row
    setSavingRows((current) => ({ ...current, [row.id]: true }))
    setError(null)
    try {
      // Use the current ETag so the update respects the API's optimistic concurrency check.
      const currentRecord = await api.getPlay(playbookId, row.id)
      const merged = { ...row, ...changes }
      const scriptFields = Object.fromEntries(SCRIPT_FIELDS.map(({ key }) => [key, readField(merged, key) || (key === 'hash' ? 'M' : '')]))
      const saved = await api.updatePlay(playbookId, row.id, {
        ...scriptFields,
        name: scoutPlayName({ ...merged, ...scriptFields }),
        _etag: currentRecord._etag,
      })
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, ...saved } : item))
      setDrafts((current) => { const next = { ...current }; delete next[row.id]; return next })
      return saved
    } catch (failure) {
      setError(failure)
      return null
    } finally {
      setSavingRows((current) => { const next = { ...current }; delete next[row.id]; return next })
    }
  }

  // Save pending edits before opening the selected play.
  async function openSavedPlay(row) {
    const saved = await saveSavedDraft(row)
    if (saved) onOpenPlay?.(saved)
  }

  // Reorder rows locally and persist the order of saved plays.
  async function reorder(ids) {
    const previous = rows
    const next = ids.map((id) => rows.find((row) => row.id === id)).filter(Boolean).map((row, index) => ({ ...row, page: index + 1 }))
    setRows(next)
    // Draft rows have no server record yet, so only saved IDs can be persisted.
    const savedIds = next.filter((row) => !row.isPracticeScriptDraft).map((row) => row.id)
    if (!savedIds.length) return
    try { await onReorder(savedIds) }
    catch (failure) { setRows(previous); throw failure }
  }

  const columns = [
    ...SCRIPT_FIELDS.map(({ key, label }) => ({
      key,
      header: label,
      render: (value, row) => {
        const fieldValue = drafts[row.id]?.[key] ?? readField(row, key)
        const draft = row.isPracticeScriptDraft
        if (!draft && !canEdit) return fieldValue || '—'
        // Route each edit to its draft or saved-row state handler.
        const change = (newValue) => draft ? updateDraft(row.id, key, newValue) : updateSavedDraft(row.id, key, newValue)
        const saveOnBlur = draft ? undefined : () => { void saveSavedDraft(row) }
        const disabled = busy || savingRows[row.id]
        if (key === 'hash') return <select aria-label={`${label} for ${row.id}`} value={fieldValue || 'M'} disabled={disabled} onChange={(event) => change(event.target.value)} onBlur={saveOnBlur}>{HASHES.map((hash) => <option key={hash} value={hash}>{hash}</option>)}</select>
        return key === 'notes'
          ? <textarea aria-label={`${label} for ${row.id}`} rows="2" value={fieldValue} disabled={disabled} onChange={(event) => change(event.target.value)} onBlur={saveOnBlur} />
          : <input aria-label={`${label} for ${row.id}`} {...(SUGGESTION_LIST_FIELDS[key] ? { list: `scout-${key}-suggestions` } : {})} value={fieldValue} disabled={disabled} onChange={(event) => change(event.target.value)} onBlur={saveOnBlur} />
      },
    })),
    { key: 'thumbnail', header: 'Play Thumbnail', render: (_, row) => row.isPracticeScriptDraft
      ? <button type="button" className="practice-script-create-play" onClick={() => onCreatePlay?.(row, row.groupingId)}><PencilRuler size={16} aria-hidden="true" />Design Play</button>
      : <button type="button" className="practice-script-play-thumbnail" title={`Open ${row.name}`} aria-label={`Open ${row.name}`} onClick={() => { void openSavedPlay(row) }}><PlayFieldView play={{ ...row, name: readField(row, 'offPlay') || row.name, template: row.offFormation || row.template }} thumbnail /></button> },
  ]
  const visibleColumns = scriptView === 'script-only' ? columns.filter((column) => column.key !== 'thumbnail') : columns
  const effectiveMenuItems = menuItems.map((item) => ({
    ...item,
    onClick: scriptView === 'script-only' && item.onScriptOnlyClick ? item.onScriptOnlyClick : item.onClick,
  }))

  // Build actions appropriate to grouping, draft, and saved-play rows.
  function getRowActions(row) {
    if (row.rowType === 'grouping') return [
      ...(canEdit ? [{ key: 'add-scout-play', label: 'Add Scout Play', icon: Plus, onClick: () => addDraft(row.id) }] : []),
      ...(rowActions?.(row) || []).filter((action) => action.key !== 'add-play'),
    ]
    if (row.isPracticeScriptDraft) return [
      { key: 'create-play', label: 'Design Play', icon: PencilRuler, onClick: () => onCreatePlay?.(row, row.groupingId) },
      { key: 'remove-draft', label: 'Remove Draft', icon: Trash2, destructive: true, onClick: () => setRows((current) => current.filter((item) => item.id !== row.id)) },
    ]
    return (rowActions?.(row) || []).map((action) => action.key === 'open'
      ? { ...action, onClick: () => { void openSavedPlay(row) } }
      : action)
  }

  if (loading) return <LoadingIndicator compact label={`Loading ${title.toLowerCase()}...`} />

  return <section className={`practice-script-play-grid${scriptView === 'script-only' ? ' practice-script-only-view' : ''}`} aria-label={`${title} plays`}>
    <ErrorDialog error={error} message="We couldn't load this practice script. Please retry." />
    {Object.values(SUGGESTION_LIST_FIELDS).map((field) => <datalist id={`scout-${field}-suggestions`} key={field}>
      {(suggestionLists[field] || []).map((value) => <option key={value} value={value} />)}
    </datalist>)}
    <div className="practice-script-print-view" aria-hidden="true">
      <h2>{printTitle}</h2>
      <table>
        <thead><tr><th scope="col">#</th>{SCRIPT_FIELDS.map(({ key, label }) => <th key={key} scope="col">{label}</th>)}</tr></thead>
        <tbody>{rows.filter((row) => !row._gridDeleted).map((row, index) => row.rowType === 'grouping'
          ? <tr className="practice-script-print-grouping" key={row.id}><th colSpan={SCRIPT_FIELDS.length + 1}>{row.name}{row.description ? `: ${row.description}` : ''}</th></tr>
          : <tr key={row.id}><td>{row.page || index + 1}</td>{SCRIPT_FIELDS.map(({ key }) => <td key={key}>{readField(row, key)}</td>)}</tr>)}</tbody>
      </table>
    </div>
    <DataGrid
      title={title}
      className="editable-data-grid"
      columns={visibleColumns}
      items={rows}
      showPage
      pageLabel="#"
      hidePager
      busy={busy}
      onNew={canEdit ? () => addDraft() : undefined}
      newLabel="New Scout Play"
      onSecondaryNew={canEdit ? onNewGrouping : undefined}
      secondaryNewLabel="New Scout Grouping"
      onReorder={canEdit ? reorder : undefined}
      onRowDoubleClick={(row) => { if (!row.isPracticeScriptDraft) void openSavedPlay(row) }}
      rowActions={getRowActions}
      menuItems={effectiveMenuItems}
      viewMenuItems={[
        { label: 'Play Design View', icon: PencilRuler, checked: scriptView === 'design', onClick: () => setScriptView('design') },
        { label: 'Script-Only View', icon: List, checked: scriptView === 'script-only', onClick: () => setScriptView('script-only') },
      ]}
    />
  </section>
}