import { useApp } from '../store/AppContext'
import {
  computeTrophies,
  trophyStats,
  closestTrophies,
  TIER_META,
  type Tier,
  type TrophyProgress,
} from '../lib/achievements'

const TIERS: Tier[] = ['bronze', 'silver', 'gold']

// Three medal pips per trophy — lit up to the tier you've earned, dim beyond.
function Medals({ earnedIndex }: { earnedIndex: number }) {
  return (
    <div className="t-medals">
      {TIERS.map((tier, i) => (
        <span key={tier} className={i <= earnedIndex ? '' : 'dim'} title={TIER_META[tier].label}>
          {TIER_META[tier].emoji}
        </span>
      ))}
    </div>
  )
}

function TrophyCard({ t }: { t: TrophyProgress }) {
  const color = t.next ? TIER_META[t.next.tier].color : TIER_META.gold.color
  return (
    <div className={`trophy ${t.earned ? 'earned' : 'locked'}`}>
      <div className="t-emoji">{t.def.emoji}</div>
      <div className="t-title">{t.def.title}</div>
      <Medals earnedIndex={t.earnedIndex} />
      <div className="bar" aria-hidden>
        <span style={{ width: `${t.progress * 100}%`, background: color }} />
      </div>
      <div className="t-sub">
        {t.maxed ? (
          <strong style={{ color: 'var(--sage-deep)' }}>Maxed out! 🌟</strong>
        ) : (
          <>
            {t.value} / {t.next!.target} {t.def.unit}
            <br />
            <span style={{ color }}>
              {t.remaining} more to {TIER_META[t.next!.tier].emoji} {TIER_META[t.next!.tier].label}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

export function Trophies() {
  const { state } = useApp()
  const stats = trophyStats(state)
  const closest = closestTrophies(state, 3)
  const all = computeTrophies(state)

  return (
    <div>
      {/* Header — the headline visual: how many trophies, and the medal tally */}
      <div className="card center">
        <div style={{ fontSize: 38 }}>🏆</div>
        <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1 }}>
          {stats.earned} <span className="muted" style={{ fontWeight: 600, fontSize: 22 }}>/ {stats.total}</span>
        </div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>trophies unlocked</div>
        <div className="bar"><span style={{ width: `${(stats.earned / stats.total) * 100}%` }} /></div>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 16, fontSize: 14, fontWeight: 600 }}>
          <span>{TIER_META.bronze.emoji} {stats.bronze}</span>
          <span>{TIER_META.silver.emoji} {stats.silver}</span>
          <span>{TIER_META.gold.emoji} {stats.gold}</span>
        </div>
      </div>

      {/* Almost there — closest goals to reach next */}
      {closest.length > 0 && (
        <div className="card">
          <div className="card-title">Almost there</div>
          {closest.map((t) => (
            <div className="stat-row" key={t.def.id}>
              <span className="emoji">{t.def.emoji}</span>
              <div className="body">
                <div className="name">{t.def.title}</div>
                <div className="detail">
                  {t.remaining} more {t.def.unit} to {TIER_META[t.next!.tier].emoji} {TIER_META[t.next!.tier].label}
                </div>
                <div className="bar"><span style={{ width: `${t.progress * 100}%`, background: TIER_META[t.next!.tier].color }} /></div>
              </div>
              <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)' }}>
                {Math.round(t.progress * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* The full shelf */}
      <div className="card-title" style={{ marginLeft: 4, marginBottom: 8 }}>Your trophy shelf</div>
      <div className="trophy-grid">
        {all.map((t) => (
          <TrophyCard key={t.def.id} t={t} />
        ))}
      </div>

      <p className="center muted" style={{ fontSize: 12, marginTop: 14 }}>
        Trophies only ever move forward. A quiet day never takes one away. 🌱
      </p>
    </div>
  )
}
