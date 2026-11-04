import { useState } from 'react'
import { DialogCloseButton } from './DialogCloseButton'
import { ErrorDialog } from './ErrorDialog'

export const COLLECTION_CATEGORIES = ['Offense', 'Defense', 'Special Teams']

export function NewCollectionDialog({ title, titleIcon: TitleIcon, onCancel, onCreate }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Defense')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onCreate({
        name: trimmedName,
        category,
        year: Number(year),
      })
    } catch (saveError) {
      setError(saveError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <form className="dialog-panel" onClick={(event) => event.stopPropagation()} onSubmit={handleSubmit}>
        <h2>{TitleIcon && <TitleIcon size={26} strokeWidth={1.8} aria-hidden="true" />}{title}</h2>
        <DialogCloseButton onClick={onCancel} />
        <label className="dialog-field">
          <span>Name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
            required
          />
        </label>
        <label className="dialog-field">
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {COLLECTION_CATEGORIES.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="dialog-field">
          <span>Year</span>
          <input
            type="number"
            min="1000"
            max="9999"
            step="1"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            required
          />
        </label>
        <ErrorDialog error={error} message="We couldn't create this playbook. Your changes are still here so you can try again." />
        <div className="dialog-actions">
          <button type="button" className="dialog-cancel" onClick={onCancel}>Cancel</button>
          <button type="submit" className="dialog-create" disabled={submitting}>Create</button>
        </div>
      </form>
    </div>
  )
}