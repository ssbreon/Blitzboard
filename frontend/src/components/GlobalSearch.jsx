import { useEffect, useRef, useState } from 'react'
import { BookOpen, CalendarDays, ScanSearch, Search, X } from 'lucide-react'
import { DataGrid } from './DataGrid'
import { ErrorDialog } from './ErrorDialog'
import { LoadingIndicator } from './LoadingIndicator'
import { PlayDiagramIcon } from './PlayDiagramIcon'

const SEARCH_DEBOUNCE_MS = 400
const COLUMNS = [
  { key: 'name', header: 'Name' },
  { key: 'type', header: 'Type' },
  { key: 'year', header: 'Year', render: (value) => value == null || value === '' ? '--' : value },
]
const ICONS = { Playbook: BookOpen, Game: CalendarDays, Install: BookOpen, 'Practice Script': BookOpen, 'Scouting Report': ScanSearch, 'Scout Play': ScanSearch, Play: PlayDiagramIcon }

export function GlobalSearch({ api, onOpen, disabled }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState({ query: '', items: [], loading: false, error: null })
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const term = query.trim()
  const waitingForDebounce = Boolean(term) && result.query !== term
  const loading = Boolean(term) && result.query === term && result.loading
  const showResults = open && Boolean(term) && !waitingForDebounce && !loading && !result.error
    && (result.items.length > 0 || result.truncated)

  useEffect(() => {
    if (!term || !open) return undefined
    let active = true
    const timer = setTimeout(async () => {
      setResult({ query: term, items: [], loading: true, error: null })
      try {
        const { items, total, limit, truncated } = await api.search(term)
        if (active) setResult({ query: term, items, total, limit, truncated, loading: false, error: null })
      } catch (error) {
        if (active) setResult({ query: term, items: [], loading: false, error })
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => { active = false; clearTimeout(timer) }
  }, [api, term, open])

  useEffect(() => {
    function dismiss(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [])

  function openRow(row) {
    if (disabled) return
    setQuery('')
    setResult({ query: '', items: [], loading: false, error: null })
    setOpen(false)
    onOpen(row)
  }

  return <div className="global-search" ref={containerRef} onBlur={(event) => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget) && !event.relatedTarget.closest('.error-dialog-panel')) setOpen(false)
  }} onKeyDown={(event) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); inputRef.current?.focus(); setOpen(false) }
    if (event.key === 'ArrowDown' && event.target === inputRef.current && open && term && !waitingForDebounce && !loading) {
      event.preventDefault()
      containerRef.current?.querySelector('.global-search-results')?.focus()
    }
  }}>
    <div className="global-search-input">
      <Search size={17} aria-hidden="true" />
      <input id="global-search-input-field" ref={inputRef} type="search" maxLength={256} aria-label="Global search" aria-expanded={showResults} aria-controls="global-search-results" aria-haspopup="dialog" placeholder="Search" value={query} disabled={disabled} onFocus={() => { if (open) return; setResult({ query: '', items: [], loading: false, error: null }); setOpen(true) }} onChange={(event) => { setQuery(event.target.value); setOpen(true) }} />
      {query && <button type="button" title="Clear search" aria-label="Clear search" onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus() }}><X size={16} aria-hidden="true" /></button>}
    </div>
    <ErrorDialog error={result.error} message="We couldn't search right now. Please try again." />
    {open && term && loading && !result.error && <LoadingIndicator compact label="Searching..." className="global-search-loading-anchor" />}
    {showResults && <div id="global-search-results" className="global-search-results" role="dialog" aria-label="Search results" tabIndex={-1}>
      <p className="sr-only" role="status">{result.items.length} results</p>
      {result.truncated && <p className="data-grid-status" role="status">Showing the first {result.limit} of {result.total} matches. Refine your search.</p>}
      <DataGrid key={term} title="Search results" columns={COLUMNS} items={result.items} compact suppressOpenHint getRowIcon={(row) => ICONS[row.type] || BookOpen} onRowClick={openRow} busy={disabled} />
    </div>}
  </div>
}