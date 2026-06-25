import { useEffect, useState } from 'react'
import { useApp } from '../store/AppContext'
import { availablePoints } from '../lib/points'
import { SHOP, type ShopItem } from '../lib/pet'

// The pantry — spend points to feed your companion. Each item lists what it
// gives (growth + fullness + hydration). Buying is one tap: it feeds right away.
export function Shop({ onClose }: { onClose: () => void }) {
  const { state, feed } = useApp()
  const points = availablePoints(state)
  const [justFed, setJustFed] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function buy(item: ShopItem) {
    if (points < item.cost) return
    feed(item)
    setJustFed(item.id)
    setTimeout(() => setJustFed((c) => (c === item.id ? null : c)), 1200)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(24,36,43,0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ maxWidth: 460, width: '100%', margin: 12, borderRadius: 24, maxHeight: '88vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Pantry — feed your companion"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h2 style={{ fontSize: 20 }}>Pantry</h2>
          <span className="points-pill">✨ {points}</span>
        </div>
        <p className="soft" style={{ marginTop: 0, fontSize: 14 }}>
          Spend points to feed and grow your companion. Earn more by caring for yourself today.
        </p>

        {SHOP.map((item) => {
          const afford = points >= item.cost
          return (
            <div className="shop-item" key={item.id}>
              <span className="shop-emoji">{item.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 650 }}>{item.name}</div>
                <div className="muted" style={{ fontSize: 12.5 }}>{item.desc}</div>
                <div className="shop-effects">
                  <span>🌱 +{item.growth}</span>
                  {item.fullness > 0 && <span>🍽 +{item.fullness}</span>}
                  {item.hydration > 0 && <span>💧 +{item.hydration}</span>}
                </div>
              </div>
              <button
                className={`btn small ${afford ? '' : 'secondary'}`}
                style={{ minWidth: 78 }}
                disabled={!afford}
                onClick={() => buy(item)}
              >
                {justFed === item.id ? '💚 Fed!' : `✨ ${item.cost}`}
              </button>
            </div>
          )
        })}

        <button className="btn ghost" style={{ marginTop: 14 }} onClick={onClose}>Done</button>
      </div>
    </div>
  )
}
