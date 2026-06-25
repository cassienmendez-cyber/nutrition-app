import { Creature } from './Creature'
import { SPECIES, LEVELS, THRESHOLDS } from '../lib/pet'

// A reference chart of every species across all six evolution stages. Reachable
// at /#evolutions — handy for previewing the art.
export function EvolutionGallery() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <h1 style={{ fontSize: 26 }}>Creature evolutions</h1>
      <p className="soft" style={{ marginTop: 4 }}>
        Each species grows through six stages. Points needed to reach each stage (a fresh pool per
        stage): Toddler 100 · Adolescent 150 · Young Adult 200 · Adult 300 · Elder 500.
      </p>

      {SPECIES.map((s) => (
        <div className="card" key={s.id} style={{ marginTop: 14 }}>
          <div className="card-title" style={{ marginBottom: 10 }}>{s.label}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {LEVELS.map((name, i) => (
              <div key={name} style={{ textAlign: 'center' }}>
                <div style={{ background: 'linear-gradient(180deg, var(--blue-soft), var(--sage-soft))', borderRadius: 16, padding: 8, display: 'grid', placeItems: 'center', minHeight: 96 }}>
                  <Creature species={s.id} level={i} size={76} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>{name}</div>
                <div className="muted" style={{ fontSize: 11 }}>{i === 0 ? 'start' : `+${THRESHOLDS[i - 1]} pts`}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Prestige examples — the crown a reborn companion wears */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-title" style={{ marginBottom: 10 }}>Prestige crowns (after graduating an Elder)</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {SPECIES.slice(0, 5).map((s, i) => (
            <div key={s.id} style={{ textAlign: 'center' }}>
              <div style={{ background: 'linear-gradient(180deg, var(--blue-soft), var(--sage-soft))', borderRadius: 16, padding: 10, display: 'grid', placeItems: 'center' }}>
                <Creature species={s.id} level={2} size={76} prestige={i + 1} />
              </div>
              <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>⭐ ×{i + 1}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
