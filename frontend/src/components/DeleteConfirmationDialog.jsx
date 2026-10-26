import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'

export function DeleteConfirmationDialog({ message, onCancel, onConfirm }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !deleting) onCancel()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [deleting, onCancel])

  async function confirmDelete() {
    if (deleting) return
    setDeleting(true)
    setError(null)
    try {
      await onConfirm()
      onCancel()
    } catch (failure) {
      setError(failure.message || 'Unable to delete item.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="dialog-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) onCancel() }}>
      <section className="dialog-panel delete-confirmation-panel" role="alertdialog" aria-modal="true" aria-labelledby="delete-confirmation-title" aria-describedby="delete-confirmation-message">
        <h2 id="delete-confirmation-title"><Trash2 size={22} aria-hidden="true" />Delete item?</h2>
        <p id="delete-confirmation-message">{message}</p>
        {error && <p className="delete-confirmation-error" role="alert">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="dialog-cancel" autoFocus disabled={deleting} onClick={onCancel}>Cancel</button>
          <button type="button" className="dialog-delete" disabled={deleting} onClick={confirmDelete}>{deleting ? 'Deleting...' : 'Delete'}</button>
        </div>
      </section>
    </div>
  )
}