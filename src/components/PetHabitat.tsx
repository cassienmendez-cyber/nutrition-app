import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store/AppContext'
import { availablePoints } from '../lib/points'
import { petLevelInfo, happiness, mood, settlePet, MAX_LEVEL } from '../lib/pet'
import { background, PROPS } from '../lib/cosmetics'
import { cycleInfo, PHASE_COPY } from '../lib/cycle'
import { playFeed } from '../lib/sound'
import { Creature } from './Creature'
import { Shop } from './Shop'
import { Prestige } from './Prestige'
import { PointsPill } from './PointsPill'

// The companion's home — the heart of the game. The creature physically evolves
// here; feeding plays a cute care animation (bounce, hearts, sparkles, happy
// face + haptic + chime) and fills its current life-stage's point pool.
export function PetHabitat() {
  const { state } = useApp()
  const [shopOpen, setShopOpen] = useState(false)
  const [prestigeOpen, setPrestigeOpen] = useState(false)
  const [fed, setFed] = useState(false)
  const [bonus, setBonus] = useState(false)
  const prevTick = useRef<number | null>(null)

  // A feed happened whenever lastTick advances (covers free items too).
  useEffect(() => {
    if (prevTick.current !== null && state.pet.lastTick > prevTick.current) {
      setFed(true)
      setBonus(happiness(state.pet) >= 60 || (state.pet.prestige ?? 0) > 0)
      playFeed()
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(28)
      const t = setTimeout(() => setFed(false), 1100)
      prevTick.current = state.pet.lastTick
      return () => clearTimeout(t)
    }
    prevTick.current = state.pet.lastTick
  }, [state.pet.lastTick, state.pet.prestige])

  // Reflect gentle decay since the last feed (display only — never punishing).
  const pet = settlePet(state.pet, Date.now())
  const lvl = petLevelInfo(pet)
  const m = mood(pet)
  const happy = happiness(pet)
  const points = availablePoints(state)
  const isElder = pet.level >= MAX_LEVEL
  const lowNeeds = pet.fullness < 25 || pet.hydration < 25
  const creatureSize = 92 + lvl.index * 7

  const bg = background(state.habitat.background)
  const props = PROPS.filter((p) => state.habitat.owned.includes(p.id))
  const cyc = cycleInfo(state.profile)
  const phase = PHASE_COPY[cyc.phase]

  return (
    <div className="card flush habitat">
      <div className="pet-scene" style={{ background: bg.gradient }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="bubble" style={{ left: `${12 + i * 19}%`, animationDelay: `${i * 1.3}s`, width: 6 + (i % 3) * 4, height: 6 + (i % 3) * 4 }} />
        ))}
        {props.map((p) => (
          <span key={p.id} className="decor" style={{ left: `${p.left}%`, bottom: p.bottom, fontSize: p.size }}>{p.emoji}</span>
        ))}
        <div className={`pet-stage ${fed ? 'fed' : ''}`}>
          <Creature species={pet.species} level={lvl.index} size={creatureSize} happy={fed} prestige={pet.prestige} />
        </div>
        {fed && (
          <div className="feed-fx" aria-hidden>
            {(bonus ? ['💚', '✨', '⭐', '💧', '✨', '💚'] : ['💚', '✨', '💧', '💚']).map((e, i) => (
              <span key={i} className="fx" style={{ left: `${28 + i * 9}%`, animationDelay: `${i * 0.07}s` }}>{e}</span>
            ))}
          </div>
        )}
        {cyc.inFertileWindow && <span className="phase-chip">✨ Fertile window</span>}
      </div>

      <div className="pet-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="pet-name">
              {pet.name}
              {(pet.prestige ?? 0) > 0 && <span className="prestige-badge">⭐ ×{pet.prestige}</span>}
            </div>
            <div className="muted" style={{ fontSize: 13 }}>{lvl.name} · {m.emoji} {m.text}</div>
          </div>
          <PointsPill value={points} />
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
        <div className="meters-cap">
          {pet.name}’s wellbeing — feed &amp; water to keep these up. (Not your points; a new buddy starts content.)
        </div>
        <div className="meters">
          <Meter emoji="🍽" label="Fullness" value={pet.fullness} color="var(--sage)" />
          <Meter emoji="💧" label="Water" value={pet.hydration} color="var(--blue)" />
          <Meter emoji="💚" label="Happy" value={happy} color="var(--blue-deep)" />
        </div>

        {lowNeeds && (
          <div className="needs-nudge">
            🥺 {pet.name} {pet.fullness < 25 ? 'is getting hungry' : 'is thirsty'} — a little something from the Pantry would help.
          </div>
        )}

        <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 10 }}>
          {phase.label} · a happy, well-fed companion grows faster 🌱
        </div>

        {isElder ? (
          <button className="btn" style={{ marginTop: 12, background: 'linear-gradient(135deg, var(--gold) 0%, var(--sage) 100%)' }} onClick={() => setPrestigeOpen(true)}>
            🎓 Graduate {pet.name} (Prestige)
          </button>
        ) : null}
        <button className={`btn ${isElder ? 'secondary' : ''}`} style={{ marginTop: isElder ? 8 : 12 }} onClick={() => setShopOpen(true)}>
          🛍 Shop & feed {pet.name}
        </button>
      </div>

      {shopOpen && <Shop onClose={() => setShopOpen(false)} />}
      {prestigeOpen && <Prestige onClose={() => setPrestigeOpen(false)} />}
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
