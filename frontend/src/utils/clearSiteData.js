export async function clearSiteData(browser = globalThis) {
  let incomplete = false

  for (const storageName of ['localStorage', 'sessionStorage']) {
    try { browser[storageName].clear() } catch { incomplete = true }
  }

  try {
    const paths = ['/']
    const segments = browser.location.pathname.split('/').filter(Boolean)
    for (let index = 0; index < segments.length; index += 1) {
      paths.push(`/${segments.slice(0, index + 1).join('/')}`)
      paths.push(`/${segments.slice(0, index + 1).join('/')}/`)
    }
    const hostParts = browser.location.hostname.split('.')
    const domains = [null]
    for (let index = 0; index < hostParts.length - 1; index += 1) domains.push(hostParts.slice(index).join('.'))
    for (const cookie of browser.document.cookie.split(';')) {
      const name = cookie.trim().split('=')[0]
      if (!name) continue
      for (const path of paths) {
        for (const domain of domains) {
          browser.document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${domain ? `; domain=${domain}` : ''}`
        }
      }
    }
  } catch { incomplete = true }

  try {
    if (browser.caches) {
      for (const key of await browser.caches.keys()) {
        if (!await browser.caches.delete(key)) incomplete = true
      }
    }
  } catch { incomplete = true }

  try {
    if (browser.navigator?.serviceWorker) {
      for (const registration of await browser.navigator.serviceWorker.getRegistrations()) {
        if (!await registration.unregister()) incomplete = true
      }
    }
  } catch { incomplete = true }

  try {
    if (browser.indexedDB) {
      if (!browser.indexedDB.databases) incomplete = true
      else {
        for (const database of await browser.indexedDB.databases()) {
          if (!database.name) continue
          const deleted = await new Promise((resolve) => {
            const request = browser.indexedDB.deleteDatabase(database.name)
            request.onsuccess = () => resolve(true)
            request.onerror = request.onblocked = () => resolve(false)
          })
          if (!deleted) incomplete = true
        }
      }
    }
  } catch { incomplete = true }

  return { incomplete }
}