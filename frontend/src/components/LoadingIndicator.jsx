import { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export function LoadingIndicator({ label = 'Loading...', compact = false, className = '' }) {
  const anchorRef = useRef(null)
  const overlayRef = useRef(null)

  useLayoutEffect(() => {
    function updateVisibility() {
      overlayRef.current.hidden = Boolean(anchorRef.current.closest('[hidden]')) || !anchorRef.current.checkVisibility({ visibilityProperty: true })
    }
    updateVisibility()
    const observer = new MutationObserver(updateVisibility)
    for (let ancestor = anchorRef.current; ancestor; ancestor = ancestor.parentElement) {
      observer.observe(ancestor, { attributes: true, attributeFilter: ['hidden', 'class', 'style'] })
    }
    return () => observer.disconnect()
  }, [])

  const indicator = <div ref={overlayRef} className={`loading-indicator-overlay${compact ? ' loading-indicator-compact' : ''}`} role="status" aria-live="polite">
    <div className="loading-indicator-panel">
      <svg className="loading-football" viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
        <g transform="rotate(-35 24 24)">
          <ellipse cx="24" cy="24" rx="22" ry="13" fill="currentColor" />
          <path d="M10 14c3 6 3 14 0 20M38 14c-3 6-3 14 0 20" stroke="#fff" strokeWidth="3" />
          <path d="M17 24h14m-11-4v8m4-8v8m4-8v8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </g>
      </svg>
      <span>{label}</span>
    </div>
  </div>

  return <div ref={anchorRef} className={`loading-indicator${compact ? ' loading-indicator-compact' : ''}${className ? ` ${className}` : ''}`}>
    {typeof document === 'undefined' ? indicator : createPortal(indicator, document.body)}
  </div>
}