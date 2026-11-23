export function AccountTabs({ tabs, activeTab, onChange, idPrefix, label, className = '' }) {
  function handleKeyDown(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab)
    const nextIndex = event.key === 'Home' ? 0
      : event.key === 'End' ? tabs.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
    onChange(tabs[nextIndex].id)
    event.currentTarget.querySelectorAll('.account-tab')[nextIndex]?.focus()
  }

  return <div className={`account-billing-tabs${className ? ` ${className}` : ''}`} role="tablist" aria-label={label} onKeyDown={handleKeyDown}>
    {tabs.map(({ id, label: tabLabel, icon: Icon }) => <button
      key={id}
      id={`${idPrefix}-tab-${id}`}
      type="button"
      className="account-tab"
      role="tab"
      aria-selected={activeTab === id}
      aria-controls={`${idPrefix}-panel-${id}`}
      tabIndex={activeTab === id ? 0 : -1}
      onClick={() => onChange(id)}
    ><Icon size={16} aria-hidden="true" />{tabLabel}</button>)}
  </div>
}