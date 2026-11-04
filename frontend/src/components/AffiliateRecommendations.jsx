import { useEffect, useState } from 'react'
import { ArrowUpRight, CreditCard } from 'lucide-react'

export function AffiliateRecommendations({ api, onUpgrade }) {
  const [items, setItems] = useState(null)

  useEffect(() => {
    let active = true
    api.affiliateRecommendations()
      .then((result) => { if (active) setItems(result.items) })
      .catch(() => { if (active) setItems([]) })
    return () => { active = false }
  }, [api])

  return <aside className="affiliate-recommendations" aria-label="Coaching resources">
    <div className="affiliate-recommendations-heading">
      <p>For your program</p>
      <h2>Coaching resources</h2>
    </div>
    {items?.length
      ? <ul className="affiliate-recommendations-list">{items.map((item) => <li key={item.id}>
          <a href={item.href} target="_blank" rel="noreferrer">
            <span><strong>{item.name}</strong><span>{item.description}</span></span>
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </li>)}</ul>
      : <p className="affiliate-recommendations-empty">{items === null ? 'Loading recommendations...' : 'Coaching resource recommendations are being set up.'}</p>}
    <div className="affiliate-recommendations-actions">
      <p>Some links may earn Blitzboard a commission. Recommendations are not personalized.</p>
      <button type="button" className="dialog-create" onClick={onUpgrade}><CreditCard size={16} aria-hidden="true" />Compare plans</button>
    </div>
  </aside>
}