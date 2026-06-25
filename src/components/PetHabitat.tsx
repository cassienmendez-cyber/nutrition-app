import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { availablePoints } from '../lib/points'
import { petAppearance, petStage, happiness, mood, settlePet } from '../lib/pet'
import { Shop } from './Shop'

// The companion's home — the heart of the game. A little scene with the creature
// bobbing in it, its growth toward the next stage, and gentle fullness / water /
// happiness meters you keep topped up by feeding it from the pantry.
export function PetHabitat() {
  const { state } = useApp()
  const [shopOpen, setShopOpen] = useState(false)

  // Reflect gentle decay since the last feed (display only — never punishing).
  const pet = settlePet(state.pet, Date.now())
  const look = petAppearance(pet)
  const stage = petStage(pet.growth)
  const m = mood(pet)
  const happy = happiness(pet)
  const points = availablePoints(state)

  return (
    <div className="card flush habitat">
      <div className="pet-scene">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="bubble" style={{ left: `${12 + i * 19}%`, animationDelay: `${i * 1.3}s`, width: 6 + (i % 3) * 4, height: 6 + (i % 3) * 4 }} />
        ))}
        {look.aura && <span className="pet-aura" />}
        <span className="pet-emoji" style={{ fontSize: look.size }}>{look.emoji}</span>
      </div>

      <div className="pet-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="pet-name">{pet.name}</div>
            <div className="muted" style={{ fontSize: 13 }}>{look.stageName} · {m.emoji} {m.text}</div>
          </div>
          <span className="points-pill">✨ {points}</span>
        </div>

        {/* Growth toward the next stage */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }} className="muted">
            <span>Growth</span>
            <span>{stage.next ? `${look.stageName} → ${stage.next.name}` : 'Fully grown 🌟'}</span>
          </div>
          <div className="bar good" style={{ height: 10 }}><span style={{ width: `${stage.progress * 100}%` }} /></div>
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
