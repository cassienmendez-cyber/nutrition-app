import { useEffect, useState } from 'react'
import { useApp } from '../store/AppContext'
import { SPECIES } from '../lib/pet'
import { playPrestige } from '../lib/sound'
import { Creature } from './Creature'
import type { PetSpecies } from '../types'

// Prestige — graduate a fully-grown Elder to the Hall of Companions and welcome
// a new baby that carries a prestige crown (and a small permanent growth boost).
export function Prestige({ onClose }: { onClose: () => void }) {
  const { state, prestige } = useApp()
  const [species, setSpecies] = useState<PetSpecies>(state.pet.species)
  const [name, setName] = useState('')
  const nextPrestige = (state.pet.prestige ?? 0) + 1

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function confirm() {
    prestige(species, name.trim() || 'Pip')
    playPrestige()
    onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(24,36,43,0.5)', backdropFilter: 'blur(3px)', zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div className="card" style={{ maxWidth: 440, width: '100%', margin: 12, borderRadius: 24, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Prestige your companion">
        <div className="center">
          <div style={{ fontSize: 32 }}>🎓</div>
          <h2 style={{ marginTop: 4 }}>Graduate {state.pet.name}</h2>
          <p className="soft" style={{ marginTop: 6 }}>
            {state.pet.name} grew all the way to Elder! Send them to your Hall of Companions and
            welcome a new baby — who’ll wear a <strong>prestige crown ⭐ ×{nextPrestige}</strong> and
            grow a little faster forever.
          </p>
        </div>

        <div className="center" style={{ margin: '6px 0' }}>
          <div style={{ display: 'inline-block', background: 'linear-gradient(180deg, var(--blue-soft), var(--sage-soft))', borderRadius: 18, padding: '8px 22px' }}>
            <Creature species={species} level={0} size={92} prestige={nextPrestige} />
          </div>
        </div>

        <div className="species-grid">
          {SPECIES.map((s) => (
            <button key={s.id} className={`species-pick ${species === s.id ? 'selected' : ''}`} onClick={() => setSpecies(s.id)} aria-label={s.label}>
              <Creature species={s.id} level={0} size={44} />
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        <div className="field" style={{ marginTop: 14 }}>
          <label>Name your new companion</label>
          <input type="text" value={name} maxLength={16} placeholder={state.pet.name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="row">
          <button className="btn secondary" onClick={onClose}>Not yet</button>
          <button className="btn" onClick={confirm}>🎓 Graduate & rebirth</button>
        </div>
      </div>
    </div>
  )
}
