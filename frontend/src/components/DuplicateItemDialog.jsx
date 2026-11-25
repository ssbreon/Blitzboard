import { useEffect, useState } from 'react'
import { Copy } from 'lucide-react'
import { DialogCloseButton } from './DialogCloseButton'
import { ErrorDialog } from './ErrorDialog'

export function DuplicateItemDialog({ onCancel, onDuplicate }) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !submitting) onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, submitting])

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onDuplicate(trimmedName)
      onCancel()
    } catch (failure) {
      setError(failure)
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="dialog-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onCancel() }}>
    <form className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby="duplicate-item-title" aria-busy={submitting} onSubmit={handleSubmit}>
      <h2 id="duplicate-item-title"><Copy size={22} aria-hidden="true" />Duplicate Item</h2>
      <DialogCloseButton onClick={onCancel} disabled={submitting} />
      <label className="dialog-field">
        <span>Name</span>
        <input type="text" value={name} onChange={(event) => setName(event.target.value)} autoFocus required disabled={submitting} />
      </label>
      <ErrorDialog error={error} message="We couldn't duplicate this item. Your name is still here so you can try again." />
      <div className="dialog-actions">
        <button type="button" className="dialog-cancel secondary-button" onClick={onCancel} disabled={submitting}>Cancel</button>
        <button type="submit" className="dialog-create primary-button" disabled={submitting || !name.trim()}>{submitting ? 'Duplicating...' : 'Duplicate'}</button>
      </div>
    </form>
  </div>
}