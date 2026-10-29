import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Archive, ArrowDown, ArrowUp, Check, Folder, FolderOpen, FolderPlus, GripVertical, Info, LoaderCircle, MoreVertical, RefreshCw, Search, X } from 'lucide-react'
import { getCategoryBadgeStyle } from './CategoryBadge'

const PAGE_SIZE = 50

export function DataGrid({ title, columns, rowIcon: RowIcon, rowType, categoryOptions, filterRows, statusFilter = false, reloadToken = 0, fetchRows, onNew, newLabel = 'New', onSecondaryNew, secondaryNewLabel = 'New', menuItems = [], rowActions, onRowDoubleClick, items, compact = false, busy = false, rowActionLabel, showPage = false, suppressOpenHint = false, onReorder, canReorderRows }) {
  const openHintStorageKey = `blitzboard:data-grid-open-hint:${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  const [fetchedRows, setRows] = useState([])
  const rows = items ?? fetchedRows
  const [loading, setLoading] = useState(true)
  const isLoading = items === undefined && loading
  const [error, setError] = useState(null)
  const [page, setPage] = useState(0)
  const [showAllPages, setShowAllPages] = useState(false)
  const [selectedRowIds, setSelectedRowIds] = useState(() => new Set())
  const [selectionAnchorId, setSelectionAnchorId] = useState(null)
  const [selectedCategories, setSelectedCategories] = useState([])
  const [selectedStatus, setSelectedStatus] = useState('Active')
  const [collapsedGroupingIds, setCollapsedGroupingIds] = useState(() => new Set())
  const [searchName, setSearchName] = useState('')
  const [namePrefix, setNamePrefix] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [openRowMenuId, setOpenRowMenuId] = useState(null)
  const [rowMenuPosition, setRowMenuPosition] = useState(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const [dragId, setDragId] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const [reordering, setReordering] = useState(false)
  const [pendingPageIds, setPendingPageIds] = useState([])
  const [reorderError, setReorderError] = useState(null)
  const [showOpenHint, setShowOpenHint] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage.getItem(openHintStorageKey) !== 'dismissed'
    } catch {
      return true
    }
  })
  const menuRef = useRef(null)
  const rowMenuRef = useRef(null)
  const rowMenuTriggerRef = useRef(null)
  const rowMenuPortalTargetRef = useRef(null)

  function dismissOpenHint() {
    setShowOpenHint(false)
    try {
      window.localStorage.setItem(openHintStorageKey, 'dismissed')
    } catch {
      return
    }
  }

  function closeRowMenu() {
    setOpenRowMenuId(null)
    setRowMenuPosition(null)
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
      if (!event.target.closest('.row-actions') && !event.target.closest('.row-actions-dropdown')) {
        closeRowMenu()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Closes the portaled menu on scroll since its fixed position is only computed on open.
  useEffect(() => {
    if (openRowMenuId === null) return undefined
    const focusTarget = rowMenuRef.current?.querySelector('button:not(:disabled)') || rowMenuRef.current
    focusTarget?.focus({ preventScroll: true })
    window.addEventListener('scroll', closeRowMenu, true)
    window.addEventListener('resize', closeRowMenu)
    return () => {
      window.removeEventListener('scroll', closeRowMenu, true)
      window.removeEventListener('resize', closeRowMenu)
    }
  }, [openRowMenuId])

  useEffect(() => {
    const timeout = setTimeout(() => setNamePrefix(searchName), 250)
    return () => clearTimeout(timeout)
  }, [searchName])

  // Loading/error/rows are driven by an async fetch, not derivable from props during render.
  useEffect(() => {
    if (items !== undefined) return undefined
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchRows({ namePrefix })
      .then((items) => {
        if (!cancelled) setRows(items)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fetchRows, refreshToken, reloadToken, namePrefix, items])

  function toggleCategory(option) {
    setSelectedCategories((current) => current.includes(option) ? current.filter((c) => c !== option) : [...current, option])
    setSelectedRowIds(new Set())
    setSelectionAnchorId(null)
    setPage(0)
  }

  function selectRow(event, row) {
    if (event.target.closest?.('button, a, input, select, textarea, [role="button"], [data-grid-no-select]')) return
    const rowIndex = pageRows.findIndex((item) => item.id === row.id)
    const modified = event.ctrlKey || event.metaKey
    if (event.shiftKey) {
      const anchorIndex = pageRows.findIndex((item) => item.id === selectionAnchorId)
      const start = anchorIndex < 0 ? rowIndex : Math.min(anchorIndex, rowIndex)
      const end = anchorIndex < 0 ? rowIndex : Math.max(anchorIndex, rowIndex)
      const next = new Set(modified ? selectedRowIds : [])
      pageRows.slice(start, end + 1).forEach((item) => next.add(item.id))
      setSelectedRowIds(next)
      if (anchorIndex < 0) setSelectionAnchorId(row.id)
    } else if (modified) {
      setSelectedRowIds((current) => {
        const next = new Set(current)
        if (next.has(row.id)) next.delete(row.id)
        else next.add(row.id)
        return next
      })
      setSelectionAnchorId(row.id)
    } else {
      setSelectedRowIds(new Set([row.id]))
      setSelectionAnchorId(row.id)
    }
  }

  function toggleGrouping(groupingId) {
    setCollapsedGroupingIds((current) => {
      const next = new Set(current)
      if (next.has(groupingId)) next.delete(groupingId)
      else next.add(groupingId)
      return next
    })
  }

  const filteredRows = rows.filter((row) => (!filterRows || filterRows(row))
    && (!selectedCategories.length || !row.category || selectedCategories.includes(row.category))
    && (!statusFilter || selectedStatus === (row.recordStatus ?? 'Active')))
  const visibleRows = []
  let followingCollapsedGroup = false
  for (const row of filteredRows) {
    if (row.rowType === 'grouping') {
      visibleRows.push(row)
      followingCollapsedGroup = collapsedGroupingIds.has(row.id)
    } else if (!followingCollapsedGroup) {
      visibleRows.push(row)
    }
  }
  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages - 1)
  const pageRows = showAllPages ? visibleRows : visibleRows.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)
  const firstVisibleRow = showAllPages ? (visibleRows.length ? 1 : 0) : currentPage * PAGE_SIZE + 1
  const lastVisibleRow = showAllPages ? visibleRows.length : Math.min(visibleRows.length, (currentPage + 1) * PAGE_SIZE)
  // Page order is only meaningful against the full, unfiltered list.
  const canReorder = Boolean(onReorder) && !busy && !reordering && !selectedCategories.length && !namePrefix && !searchName && filteredRows.length === rows.length
  const leadingColumns = (showPage ? 1 : 0) + (RowIcon ? 1 : 0)

  async function moveRow(rowId, toIndex) {
    const fromIndex = rows.findIndex((row) => row.id === rowId)
    if (fromIndex < 0 || toIndex < 0 || toIndex >= rows.length || fromIndex === toIndex) return
    const previous = rows
    const next = [...rows]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    if (items === undefined) setRows(next.map((row, index) => ({ ...row, page: index + 1 })))
    setPendingPageIds(next.filter((row, index) => row.page !== index + 1).map((row) => row.id))
    setReordering(true)
    setReorderError(null)
    try {
      await onReorder(next.map((row) => row.id))
    } catch (err) {
      setRows(previous)
      setReorderError(err.message)
    } finally {
      setPendingPageIds([])
      setReordering(false)
    }
  }

  function handleDrop(event, targetRow) {
    event.preventDefault()
    const sourceId = dragId
    const after = dropTarget?.after
    setDragId(null)
    setDropTarget(null)
    if (!sourceId || sourceId === targetRow.id) return
    const sourceRow = rows.find((row) => row.id === sourceId)
    if (canReorderRows && !canReorderRows(sourceRow, targetRow)) return
    const fromIndex = rows.findIndex((row) => row.id === sourceId)
    const insertAt = rows.findIndex((row) => row.id === targetRow.id) + (after ? 1 : 0)
    moveRow(sourceId, fromIndex < insertAt ? insertAt - 1 : insertAt)
  }

  function rowMenuItems(row) {
    const selectedRows = rows.filter((item) => selectedRowIds.has(item.id))
    if (selectedRowIds.has(row.id) && selectedRows.length > 1) {
      const deleteActions = selectedRows.map((item) => {
        const actions = rowActions ? rowActions(item) : []
        return actions.find((action) => action.label === 'Delete')
      })
      const deleteKey = deleteActions[0]?.key
      if (deleteActions.every((action) => action && action.key === deleteKey)) {
        return [{
          key: 'delete-selected',
          label: 'Delete',
          icon: deleteActions[0].icon,
          destructive: true,
          disabled: deleteActions.some((action) => action.disabled),
          bulk: true,
          onClick: () => deleteActions[0].onClick(selectedRows),
        }]
      }
      return []
    }
    const actions = rowActions ? rowActions(row) : []
    if (!onReorder) return actions
    const index = rows.findIndex((item) => item.id === row.id)
    const moves = [
      { key: 'move-up', label: 'Move Up', icon: ArrowUp, disabled: !canReorder || index <= 0 || Boolean(canReorderRows && !canReorderRows(row, rows[index - 1])), onClick: () => moveRow(row.id, index - 1) },
      { key: 'move-down', label: 'Move Down', icon: ArrowDown, disabled: !canReorder || index >= rows.length - 1 || Boolean(canReorderRows && !canReorderRows(row, rows[index + 1])), onClick: () => moveRow(row.id, index + 1) },
    ]
    const destructiveIndex = actions.findIndex((item) => item.destructive)
    const insertAt = row.rowType === 'grouping' || destructiveIndex < 0 ? actions.length : destructiveIndex
    return [...actions.slice(0, insertAt), ...moves, ...actions.slice(insertAt)]
  }

  function openRowMenu(row, trigger, point) {
    if (!trigger || trigger.disabled) return false
    const items = rowMenuItems(row)
    if (!items.length) return false
    const rect = point ? { top: point.y, bottom: point.y, right: point.x } : trigger.getBoundingClientRect()
    const menuHeight = items.length * 44 + 12
    const top = rect.bottom + 4 + menuHeight <= window.innerHeight
      ? rect.bottom + 4 : Math.max(8, rect.top - menuHeight - 4)
    rowMenuTriggerRef.current = trigger
    rowMenuPortalTargetRef.current = trigger.closest('[role="dialog"]') || document.body
    setRowMenuPosition({ top, right: Math.max(8, window.innerWidth - rect.right) })
    setOpenRowMenuId(row.id)
    return true
  }

  const dropdownItems = [{ label: 'Refresh', icon: RefreshCw, onClick: () => setRefreshToken((t) => t + 1) }, ...menuItems]
  const dropdownActions = dropdownItems.map((item) => (
    <button
      key={item.label}
      type="button"
      role="menuitem"
      onClick={() => {
        item.onClick()
        setMenuOpen(false)
      }}
    >
      {item.icon && <item.icon className="menu-item-icon" aria-hidden="true" />}
      <span className="data-grid-menu-action-label">{item.label}</span>
    </button>
  ))

  return (
    <section className={`data-grid${compact ? ' data-grid-compact' : ''}`} aria-label={title}>
      {!compact && <div className="data-grid-toolbar">
        <div className="data-grid-toolbar-actions">
          <button type="button" className="toolbar-new-button" onClick={onNew} disabled={!onNew}>
            <svg className="toolbar-icon" viewBox="0 0 24 24" role="presentation" aria-hidden="true">
              <path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
            </svg>
            {newLabel}
          </button>
          {onSecondaryNew && <button type="button" className="toolbar-new-button" onClick={onSecondaryNew}>
            <FolderPlus className="toolbar-icon" aria-hidden="true" />
            {secondaryNewLabel}
          </button>}
          <label className="data-grid-name-filter">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              aria-label="Search by name"
              value={searchName}
              onChange={(event) => {
                setSearchName(event.target.value)
                setSelectedRowIds(new Set())
                setSelectionAnchorId(null)
                setPage(0)
              }}
              placeholder="Search name"
            />
          </label>
          {categoryOptions && (
            <div className="data-grid-category-filter" role="group" aria-label="Filter by category">
              {categoryOptions.map((option) => {
                const active = selectedCategories.includes(option)
                return (
                  <button
                    key={option}
                    type="button"
                    className={`category-badge category-filter-badge${active ? ' is-active' : ''}`}
                    style={getCategoryBadgeStyle(option)}
                    aria-pressed={active}
                    onClick={() => toggleCategory(option)}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <div className="toolbar-menu data-grid-toolbar-menu" ref={menuRef}>
          {statusFilter && selectedStatus === 'Archived' && (
            <span className="data-grid-archived-indicator" role="status" aria-label="Viewing archived records" title="Viewing archived records">
              <Archive size={18} aria-hidden="true" />
              <span>Viewing Archived</span>
            </span>
          )}
          <button
            type="button"
            className="hamburger-button"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            aria-label="More actions"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg className="hamburger-icon" viewBox="0 0 24 24" role="presentation" aria-hidden="true">
              <path fill="currentColor" d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
            </svg>
          </button>
          {menuOpen && (
            <div className={`toolbar-dropdown${statusFilter ? ' data-grid-toolbar-dropdown' : ''}`} role="menu">
              {statusFilter ? (
                <div className="data-grid-menu-panes">
                  <div className="data-grid-status-filter" role="group" aria-label="Filter by status">
                    <div className="account-menu-section-label">View</div>
                    {['Active', 'Archived'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        role="menuitemradio"
                        aria-checked={selectedStatus === status}
                        onClick={() => {
                          setSelectedStatus(status)
                          setSelectedRowIds(new Set())
                          setSelectionAnchorId(null)
                          setPage(0)
                          setMenuOpen(false)
                        }}
                      >
                        <Check size={16} className="data-grid-status-check" aria-hidden="true" />
                        {status}
                      </button>
                    ))}
                  </div>
                  <div className="data-grid-menu-actions" role="group" aria-label="Grid actions">
                    <div className="account-menu-section-label">Actions</div>
                    {dropdownActions}
                  </div>
                </div>
              ) : dropdownActions}
            </div>
          )}
        </div>
      </div>}
      {onRowDoubleClick && showOpenHint && !suppressOpenHint && pageRows.some((row) => row.rowType !== 'grouping') && (
        <div className="data-grid-open-hint" role="status">
          <Info size={16} aria-hidden="true" />
          <span className="data-grid-open-hint-desktop">Double-click a row to open it, or choose Open from its actions menu.</span>
          <span className="data-grid-open-hint-touch">Choose Open from a row actions menu to open it.</span>
          <button type="button" className="data-grid-open-hint-dismiss" aria-label="Dismiss open tip" onClick={dismissOpenHint}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}
      {isLoading && <p className="data-grid-status data-grid-loading" role="status">Loading {title.toLowerCase()}...</p>}
      {error && <p className="data-grid-status data-grid-error">Unable to load {title.toLowerCase()}: {error}</p>}
      {reorderError && <p className="data-grid-status data-grid-error" role="alert">Unable to reorder {title.toLowerCase()}: {reorderError}</p>}
      {!isLoading && !error && (
        <>
          <div className="data-grid-table-wrap">
            <table className="data-grid-table">
              <thead>
                <tr>
                  {showPage && <th className="data-grid-page-header" scope="col">Page</th>}
                  {RowIcon && <th className="data-grid-type-header" scope="col" aria-label="Type" />}
                  {columns.map((column) => (
                    <th key={column.key}>{column.header}</th>
                  ))}
                  {rowActions && <th className="data-grid-actions-header" aria-label="Actions" />}
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr>
                    <td className="data-grid-empty" colSpan={columns.length + leadingColumns + (rowActions ? 1 : 0)}>
                      {namePrefix ? `No ${title.toLowerCase()} match your search` : statusFilter || selectedCategories.length ? `No ${title.toLowerCase()} match the selected filters` : `No ${title.toLowerCase()} yet`}
                    </td>
                  </tr>
                )}
                {pageRows.map((row) => (
                  <tr
                    key={row.id}
                    aria-selected={selectedRowIds.has(row.id)}
                    aria-expanded={row.rowType === 'grouping' ? !collapsedGroupingIds.has(row.id) : undefined}
                    tabIndex={row.rowType === 'grouping' ? 0 : undefined}
                    onDoubleClick={row.rowType === 'grouping' ? () => toggleGrouping(row.id) : onRowDoubleClick ? () => {
                      onRowDoubleClick(row)
                      dismissOpenHint()
                    } : undefined}
                    onKeyDown={row.rowType === 'grouping' ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        toggleGrouping(row.id)
                      }
                    } : undefined}
                    onClick={(event) => selectRow(event, row)}
                    onContextMenu={rowActions ? (event) => {
                      const trigger = event.currentTarget.querySelector('.row-actions-button')
                      if (openRowMenu(row, trigger, { x: event.clientX, y: event.clientY })) event.preventDefault()
                    } : undefined}
                    style={row.rowType === 'grouping' || onRowDoubleClick ? { cursor: 'pointer' } : undefined}
                    className={[
                      row.rowType === 'grouping' && 'is-grouping-row',
                      selectedRowIds.has(row.id) && 'is-selected',
                      dragId === row.id && 'is-dragging',
                      dropTarget?.id === row.id && (dropTarget.after ? 'drop-after' : 'drop-before'),
                    ].filter(Boolean).join(' ') || undefined}
                    onDragOver={canReorder && dragId && (!canReorderRows || canReorderRows(rows.find((item) => item.id === dragId), row)) ? (event) => {
                      event.preventDefault()
                      event.dataTransfer.dropEffect = 'move'
                      const rect = event.currentTarget.getBoundingClientRect()
                      const after = event.clientY > rect.top + rect.height / 2
                      if (dropTarget?.id !== row.id || dropTarget.after !== after) setDropTarget({ id: row.id, after })
                    } : undefined}
                    onDrop={canReorder && dragId ? (event) => handleDrop(event, row) : undefined}
                    onDragEnd={canReorder ? () => {
                      setDragId(null)
                      setDropTarget(null)
                    } : undefined}
                  >
                    {showPage && (
                      <td
                        className="data-grid-page-cell"
                        aria-busy={pendingPageIds.includes(row.id) || undefined}
                        title={canReorder ? 'Drag to reorder' : undefined}
                        draggable={canReorder && (!canReorderRows || canReorderRows(row, row)) || undefined}
                        onDragStart={canReorder && (!canReorderRows || canReorderRows(row, row)) ? (event) => {
                          event.dataTransfer.effectAllowed = 'move'
                          event.dataTransfer.setData('text/plain', row.id)
                          setDragId(row.id)
                        } : undefined}
                      >
                        {pendingPageIds.includes(row.id) ? (
                          <span role="status" aria-label={`Saving page ${row.page}`}>
                            <LoaderCircle className="data-grid-page-grip data-grid-page-spinner" size={14} aria-hidden="true" />
                          </span>
                        ) : (canReorder || reordering) && <GripVertical className="data-grid-page-grip" size={14} aria-hidden="true" />}
                        {row.page}
                      </td>
                    )}
                    {row.rowType === 'grouping' ? (
                      <td className="data-grid-grouping-cell" colSpan={columns.length + (RowIcon ? 1 : 0)}>
                        <span className="data-grid-grouping-label">
                          {collapsedGroupingIds.has(row.id)
                            ? <Folder className="data-grid-grouping-icon" size={18} aria-hidden="true" />
                            : <FolderOpen className="data-grid-grouping-icon" size={18} aria-hidden="true" />}
                          {row.name}
                        </span>
                      </td>
                    ) : <>
                      {RowIcon && (
                        <td className="data-grid-type-cell" aria-label={rowType} title={rowType}>
                          <RowIcon size={17} strokeWidth={2} aria-hidden="true" />
                        </td>
                      )}
                      {columns.map((column) => (
                        <td key={column.key} className={column.key === 'name' ? 'data-grid-name-cell' : undefined}>
                          {column.render ? column.render(row[column.key], row) : row[column.key]}
                        </td>
                      ))}
                    </>}
                    {rowActions && (
                      <td className="data-grid-actions-cell">
                        <div className="row-actions">
                          <button
                            type="button"
                            className="row-actions-button"
                            disabled={busy}
                            title={rowActionLabel ? rowActionLabel(row) : 'Row actions'}
                            aria-haspopup="menu"
                            aria-expanded={openRowMenuId === row.id}
                            aria-label={rowActionLabel ? rowActionLabel(row) : 'Row actions'}
                            onClick={(event) => {
                              event.stopPropagation()
                              if (openRowMenuId === row.id) {
                                closeRowMenu()
                                return
                              }
                              openRowMenu(row, event.currentTarget)
                            }}
                          >
                            <MoreVertical size={18} aria-hidden="true" />
                          </button>
                          {openRowMenuId === row.id && rowMenuPosition &&
                            createPortal(
                              <div
                                className="toolbar-dropdown row-actions-dropdown"
                                ref={rowMenuRef}
                                role="menu"
                                tabIndex={-1}
                                style={{ position: 'fixed', top: rowMenuPosition.top, right: rowMenuPosition.right }}
                                onKeyDown={(event) => {
                                  if (event.key === 'Escape') {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    closeRowMenu()
                                    rowMenuTriggerRef.current?.focus()
                                  } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                                    event.preventDefault()
                                    const buttons = [...event.currentTarget.querySelectorAll('button:not(:disabled)')]
                                    const currentIndex = buttons.indexOf(document.activeElement)
                                    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
                                      : (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
                                    buttons[nextIndex]?.focus()
                                  } else if (event.key === 'Tab') {
                                    closeRowMenu()
                                    rowMenuTriggerRef.current?.focus()
                                  }
                                }}
                              >
                                {rowMenuItems(row).map((item) => (
                                  <button
                                    key={item.key}
                                    type="button"
                                    role="menuitem"
                                    disabled={busy || item.disabled}
                                    className={item.destructive ? 'row-actions-destructive' : undefined}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      closeRowMenu()
                                      rowMenuTriggerRef.current?.focus()
                                      item.onClick(row)
                                      if (item.bulk) {
                                        setSelectedRowIds(new Set())
                                        setSelectionAnchorId(null)
                                      }
                                      if (item.key === 'open') dismissOpenHint()
                                    }}
                                  >
                                    {item.icon && <item.icon className="menu-item-icon" aria-hidden="true" />}
                                    {item.label}
                                  </button>
                                ))}
                              </div>,
                              rowMenuPortalTargetRef.current || document.body
                            )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(!compact || totalPages > 1) && <div className="data-grid-pager">
            <span>
              {filteredRows.length === 0
                ? '0 rows'
                : `Rows ${firstVisibleRow}-${lastVisibleRow} of ${filteredRows.length}`}
            </span>
            <div className="data-grid-pager-controls">
              <button type="button" disabled={showAllPages || currentPage === 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <select
                id="go-to-page"
                aria-label="Go to page"
                value={showAllPages ? 'all' : currentPage}
                onChange={(event) => {
                  if (event.target.value === 'all') {
                    setPage(0)
                    setShowAllPages(true)
                  } else {
                    setShowAllPages(false)
                    setPage(Number(event.target.value))
                  }
                }}
              >
                {Array.from({ length: totalPages }, (_, index) => (
                  <option key={index} value={index}>Page {index + 1} of {totalPages}</option>
                ))}
                <option value="all">(Show All Pages)</option>
              </select>
              <button type="button" disabled={showAllPages || currentPage >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </div>}
        </>
      )}
    </section>
  )
}
