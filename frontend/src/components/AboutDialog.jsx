/*
 * Blitzboard Studio
 * Copyright (c) 2027 Breon Technologies LLC
 * All Rights Reserved
 */
import { useEffect } from 'react'
import { Info } from 'lucide-react'
import { DialogCloseButton } from './DialogCloseButton'

export function AboutDialog({ onClose }) {
  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return <div className="dialog-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="dialog-panel about-dialog" role="dialog" aria-modal="true" aria-labelledby="about-dialog-title">
      <h2 id="about-dialog-title"><Info size={22} aria-hidden="true" />Blitzboard Studio</h2>
      <DialogCloseButton onClick={onClose} />
      <div className="about-dialog-content">
        <p>Version 1.0</p>
        <p>© 2027 Breon Technologies LLC</p>
        <p>Football Coaching, Playbook,<br />Scouting and Game Planning Software</p>
      </div>
      <section className="about-support" aria-labelledby="about-support-title">
        <h3 id="about-support-title">Contact Technical Support</h3>
        <p>For help with Blitzboard Studio, email our technical support team.</p>
        <a href="mailto:breontechllc@hotmail.com">breontechllc@hotmail.com</a>
      </section>
    </section>
  </div>
}
