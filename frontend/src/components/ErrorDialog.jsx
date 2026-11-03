import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CircleAlert } from 'lucide-react'

const ErrorQueueContext = createContext(null)
const ErrorVisibilityContext = createContext(true)

export function ErrorDialogScope({ active, children }) {
  return <ErrorVisibilityContext value={active}>{children}</ErrorVisibilityContext>
}

export function ErrorDialog({ error, message = 'Something went wrong. Please try again.' }) {
  const enqueue = useContext(ErrorQueueContext)
  const active = useContext(ErrorVisibilityContext)
  const id = useId()
  const reportedError = useRef(null)

  useEffect(() => {
    if (!error) reportedError.current = null
    else if (active && reportedError.current !== error) {
      reportedError.current = error
      enqueue({ id, error, message })
    }
  }, [active, enqueue, error, id, message])

  return null
}

export function ErrorDialogProvider({ children }) {
  const [queue, setQueue] = useState([])
  const buttonRef = useRef(null)
  const titleId = useId()
  const messageId = useId()
  const current = queue[0]
  const open = Boolean(current)
  const enqueue = useCallback((entry) => {
    setQueue((entries) => entries.some((item) => item.id === entry.id && item.error === entry.error)
      ? entries
      : [...entries, entry])
  }, [])
  const dismiss = useCallback(() => setQueue((entries) => entries.slice(1)), [])

  useEffect(() => {
    if (!open) return undefined
    const previousFocus = document.activeElement
    const root = document.getElementById('root')
    const wasInert = root?.inert
    if (root) root.inert = true
    buttonRef.current?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape' || event.key === 'Tab') {
        event.preventDefault()
        event.stopImmediatePropagation()
        if (event.key === 'Escape') dismiss()
        else buttonRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      if (root) root.inert = wasInert
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [open, dismiss])

  const details = current ? [
    current.error.message || String(current.error),
    current.error.code != null ? `Error code: ${current.error.code}` : '',
    current.error.status != null ? `HTTP status: ${current.error.status}` : '',
  ].filter(Boolean).join('\n') : ''

  return <ErrorQueueContext value={enqueue}>
    {children}
    {current && createPortal(
      <div className="dialog-overlay error-dialog-overlay" onMouseDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
        <section className="dialog-panel error-dialog-panel" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={messageId}>
          <h2 id={titleId}><CircleAlert size={22} aria-hidden="true" />Unable to complete request</h2>
          <p id={messageId}>{current.error.code === 'RECORD_CHANGED'
            ? 'This record was changed by someone else. Your edits have not been saved. Reopen the record to load the latest version before trying again.'
            : current.message}</p>
          <div className="error-dialog-details" role="region" aria-label="Error details">
            <h3>Error details</h3>
            <pre>{details}</pre>
          </div>
          <div className="dialog-actions">
            <button ref={buttonRef} type="button" className="dialog-create" onClick={dismiss}>OK</button>
          </div>
        </section>
      </div>, document.body,
    )}
  </ErrorQueueContext>
}