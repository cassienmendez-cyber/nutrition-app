import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store/AppContext'
import { availablePoints } from '../lib/points'
import { petLevelInfo, happiness, mood, settlePet } from '../lib/pet'
import { Creature } from './Creature'
import { Shop } from './Shop'

// The companion's home — the heart of the game. The creature physically evolves
// here; feeding it plays a cute care animation (bounce, hearts, sparkles, happy
// face + a haptic buzz) and fills its current life-stage's point pool.
export function PetHabitat() {
  const { state } = useApp()
  const [shopOpen, setShopOpen] = useState(false)
  const [fed, setFed] = useState(false)
  const prevSpent = useRef<number | null>(null)

  // A feed happened whenever `spent` ticks up → play the care animation.
  useEffect(() => {
    if (prevSpent.current !== null && state.pet.spent > prevSpent.current) {
      setFed(true)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(28)
      const t = setTimeout(() => setFed(false), 1100)
      prevSpent.current = state.pet.spent
      return () => clearTimeout(t)
    }
    prevSpent.current = state.pet.spent
  }, [state.pet.spent])

  // Reflect gentle decay since the last feed (display only — never punishing).
  const pet = settlePet(state.pet, Date.now())
  const lvl = petLevelInfo(pet)
  const m = mood(pet)
  const happy = happiness(pet)
  const points = availablePoints(state)
  const creatureSize = 92 + lvl.index * 7

  return (
    <div className="card flush habitat">
      <div className="pet-scene">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="bubble" style={{ left: `${12 + i * 19}%`, animationDelay: `${i * 1.3}s`, width: 6 + (i % 3) * 4, height: 6 + (i % 3) * 4 }} />
        ))}
        <div className={`pet-stage ${fed ? 'fed' : ''}`}>
          <Creature species={pet.species} level={lvl.index} size={creatureSize} happy={fed} />
        </div>
        {fed && (
          <div className="feed-fx" aria-hidden>
            {['💚', '✨', '💧', '⭐', '💚'].map((e, i) => (
              <span key={i} className="fx" style={{ left: `${30 + i * 11}%`, animationDelay: `${i * 0.08}s` }}>{e}</span>
            ))}
          </div>
        )}
      </div>

      <div className="pet-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="pet-name">{pet.name}</div>
            <div className="muted" style={{ fontSize: 13 }}>{lvl.name} · {m.emoji} {m.text}</div>
          </div>
          <span className="points-pill">✨ {points}</span>
        </div>

        {/* This stage's growth pool (resets each evolution) */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }} className="muted">
            <span>{lvl.next ? `${lvl.name} → ${lvl.next}` : 'Fully grown 🌟'}</span>
            <span>{lvl.next ? `${Math.round(lvl.into)} / ${lvl.needed}` : 'Elder'}</span>
          </div>
          <div className="bar good" style={{ height: 10 }}><span style={{ width: `${lvl.progress * 100}%` }} /></div>
        </div>

        {/* Care meters */}
        <div className="meters">
          <Meter emoji="🍽" label="Fullness" value={pet.fullness} color="var(--sage)" />
          <Meter emoji="💧" label="Water" value={pet.hydration} color="var(--blue)" />
          <Meter emoji="💚" label="Happy" value={happy} color="var(--blue-deep)" />
        </div>

        <button className="btn" style={{ marginTop: 14 }} onClick={() => setShopOpen(true)}>
          🥣 Feed {pet.name}
        </button>
      </div>

      {shopOpen && <Shop onClose={() => setShopOpen(false)} />}
    </div>
  )
}

function Meter({ emoji, label, value, color }: { emoji: string; label: string; value: number; color: string }) {
  return (
    <div className="meter">
      <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
        <span>{emoji} {label}</span>
        <span className="muted">{Math.round(value)}</span>
      </div>
      <div className="bar"><span style={{ width: `${value}%`, background: color }} /></div>
    </div>
  )
}
