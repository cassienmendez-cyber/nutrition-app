import { useEffect, useState } from 'react'
import { useApp } from '../store/AppContext'
import { availablePoints } from '../lib/points'
import { SHOP, effectiveGrowth, type ShopItem, type FoodTag } from '../lib/pet'
import { BACKGROUNDS, PROPS } from '../lib/cosmetics'
import { today } from '../lib/dates'
import { PointsPill } from './PointsPill'

const TAG_LABEL: Record<FoodTag, { label: string; cls: string }> = {
  wholesome: { label: '🌱 grows fast', cls: 'tag-wholesome' },
  balanced: { label: '⚖️ balanced', cls: 'tag-balanced' },
  treat: { label: '🍰 treat', cls: 'tag-treat' },
}

// The pantry + decor shop. Food grows the companion (healthier = faster); decor
// makes its home yours. A free prenatal vitamin appears on days you took yours.
export function Shop({ onClose }: { onClose: () => void }) {
  const { state, feed, buyDecor, setBackground } = useApp()
  const points = availablePoints(state)
  const [tab, setTab] = useState<'food' | 'decor'>('food')
  const [justFed, setJustFed] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // A free "vitamin" the day you take your prenatal — self-care feeds the pet.
  const claimedKey = `bloom.vitamin.${today()}`
  const [vitaminClaimed, setVitaminClaimed] = useState(() => {
    try {
      return localStorage.getItem(claimedKey) === '1'
    } catch {
      return false
    }
  })
  const prenatalToday = !!state.days[today()]?.prenatalTaken
  const vitamin: ShopItem = { id: 'vitamin', emoji: '💊', name: 'Prenatal vitamin', desc: 'Free today — thanks for taking your prenatal!', cost: 0, growth: 26, fullness: 18, hydration: 18, tag: 'wholesome' }

  function buy(item: ShopItem) {
    if (points < item.cost) return
    feed(item)
    flash(item.id)
  }
  function claimVitamin() {
    feed(vitamin)
    try {
      localStorage.setItem(claimedKey, '1')
    } catch {
      /* ignore */
    }
    setVitaminClaimed(true)
    flash('vitamin')
  }
  function flash(id: string) {
    setJustFed(id)
    setTimeout(() => setJustFed((c) => (c === id ? null : c)), 1100)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(24,36,43,0.45)', backdropFilter: 'blur(3px)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ maxWidth: 460, width: '100%', margin: 12, borderRadius: 24, maxHeight: '88vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Shop — feed and decorate"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h2 style={{ fontSize: 20 }}>Shop</h2>
          <PointsPill value={points} />
        </div>

        <div className="seg" style={{ marginBottom: 14 }}>
          <button className={tab === 'food' ? 'on' : ''} onClick={() => setTab('food')}>🥣 Pantry</button>
          <button className={tab === 'decor' ? 'on' : ''} onClick={() => setTab('decor')}>🪴 Decor</button>
        </div>

        {tab === 'food' && (
          <>
            <p className="soft" style={{ marginTop: 0, fontSize: 13.5 }}>
              Healthier food grows your companion faster. Treats are welcome too — they bring
              happiness. 🌱
            </p>

            {prenatalToday && !vitaminClaimed && (
              <div className="shop-item" style={{ background: 'var(--sage-soft)', borderRadius: 14, padding: 12, border: 'none' }}>
                <span className="shop-emoji">💊</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>Prenatal vitamin <span className="tag-wholesome tag">free</span></div>
                  <div className="muted" style={{ fontSize: 12.5 }}>{vitamin.desc}</div>
                </div>
                <button className="btn small" style={{ minWidth: 78 }} onClick={claimVitamin}>
                  {justFed === 'vitamin' ? '💚 Fed!' : 'Claim'}
                </button>
              </div>
            )}

            {SHOP.map((item) => {
              const afford = points >= item.cost
              const grow = effectiveGrowth(state.pet, item)
              return (
                <div className="shop-item" key={item.id}>
                  <span className="shop-emoji">{item.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 650 }}>
                      {item.name} <span className={`tag ${TAG_LABEL[item.tag].cls}`}>{TAG_LABEL[item.tag].label}</span>
                    </div>
                    <div className="muted" style={{ fontSize: 12.5 }}>{item.desc}</div>
                    <div className="shop-effects">
                      <span>🌱 +{grow}</span>
                      {item.fullness > 0 && <span>🍽 +{item.fullness}</span>}
                      {item.hydration > 0 && <span>💧 +{item.hydration}</span>}
                    </div>
                  </div>
                  <button className={`btn small ${afford ? '' : 'secondary'}`} style={{ minWidth: 78 }} disabled={!afford} onClick={() => buy(item)}>
                    {justFed === item.id ? '💚 Fed!' : `✨ ${item.cost}`}
                  </button>
                </div>
              )
            })}
          </>
        )}

        {tab === 'decor' && (
          <>
            <div className="card-title">Backgrounds</div>
            {BACKGROUNDS.map((bg) => {
              const owned = state.habitat.owned.includes(bg.id)
              const active = state.habitat.background === bg.id
              const afford = points >= bg.cost
              return (
                <div className="shop-item" key={bg.id}>
                  <span style={{ width: 38, height: 30, borderRadius: 8, background: bg.gradient, border: '1px solid var(--line)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 650 }}>{bg.name}</div>
                  </div>
                  {owned ? (
                    <button className={`btn small ${active ? 'secondary' : 'ghost'}`} style={{ minWidth: 78 }} disabled={active} onClick={() => setBackground(bg.id)}>
                      {active ? 'Active' : 'Use'}
                    </button>
                  ) : (
                    <button className={`btn small ${afford ? '' : 'secondary'}`} style={{ minWidth: 78 }} disabled={!afford} onClick={() => buyDecor(bg.id, bg.cost)}>
                      ✨ {bg.cost}
                    </button>
                  )}
                </div>
              )
            })}

            <div className="card-title" style={{ marginTop: 14 }}>Props</div>
            {PROPS.map((pr) => {
              const owned = state.habitat.owned.includes(pr.id)
              const afford = points >= pr.cost
              return (
                <div className="shop-item" key={pr.id}>
                  <span className="shop-emoji">{pr.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 650 }}>{pr.name}</div>
                  </div>
                  {owned ? (
                    <span className="badge good">Owned ✓</span>
                  ) : (
                    <button className={`btn small ${afford ? '' : 'secondary'}`} style={{ minWidth: 78 }} disabled={!afford} onClick={() => buyDecor(pr.id, pr.cost)}>
                      ✨ {pr.cost}
                    </button>
                  )}
                </div>
              )
            })}
          </>
        )}

        <button className="btn ghost" style={{ marginTop: 16 }} onClick={onClose}>Done</button>
      </div>
    </div>
  )
}
