import { X } from 'lucide-react'

export function DialogCloseButton({ onClick, disabled }) {
  return <button type="button" className="schedule-icon-button dialog-close-button" aria-label="Close" onClick={onClick} disabled={disabled}><X size={20} aria-hidden="true" /></button>
}
