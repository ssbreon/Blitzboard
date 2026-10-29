import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'

export function DeleteConfirmationDialog({ message, onCancel, onConfirm }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(null)

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
    setProgress(null)
    try {
      await onConfirm({ onProgress: (completed, total) => setProgress({ completed, total }) })
      onCancel()
    } catch (failure) {
      setError(failure.message || 'Unable to delete item.')
      setProgress(null)
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
          <button
            type="button"
            className="dialog-delete"
            disabled={deleting}
            onClick={confirmDelete}
            aria-label={deleting && progress?.total > 1 ? `Deleting ${progress.completed} of ${progress.total} items` : undefined}
          >
            {deleting && progress?.total > 1 && <span className="dialog-delete-progress" style={{ width: `${Math.min(100, (progress.completed / progress.total) * 100)}%` }} aria-hidden="true" />}
            <span className="dialog-delete-label">
              {deleting && progress?.total > 1 ? `Deleting ${progress.completed} of ${progress.total}...` : deleting ? 'Deleting...' : 'Delete'}
            </span>
          </button>
        </div>
      </section>
    </div>
  )
}