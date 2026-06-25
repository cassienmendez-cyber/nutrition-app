import { useApp } from '../store/AppContext'
import { cycleInfo, PHASE_COPY } from '../lib/cycle'
import { dashboardMetrics, fertilityScore } from '../lib/scores'
import { weeklyInsights } from '../lib/coach'
import { closestTrophies, TIER_META } from '../lib/achievements'
import { prettyDate, daysBetween, today } from '../lib/dates'
import { Ring } from './Ring'
import { Plant } from './Plant'

export function Dashboard({ go }: { go: (tab: string) => void }) {
  const { state, todayLog } = useApp()
  const cyc = cycleInfo(state.profile)
  const phase = PHASE_COPY[cyc.phase]
  const metrics = dashboardMetrics(todayLog, state.profile)
  const score = fertilityScore(todayLog, state.profile)
  const insights = weeklyInsights(state)
  const nextTrophy = closestTrophies(state, 1)[0]

  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = state.profile.name && state.profile.name !== 'friend' ? `, ${state.profile.name}` : ''

  return (
    <div className="screen">
      <div className="hero">
        <div className="greet">{greet}{name} 🌸</div>
        <h2 style={{ marginTop: 2 }}>{phase.label} · Cycle Day {cyc.cycleDay}</h2>
        <div className="sub">
          {cyc.ovulationTomorrow
            ? 'Possible ovulation tomorrow 💛'
            : cyc.daysUntilOvulation > 0
            ? `Ovulation in about ${cyc.daysUntilOvulation} days`
            : cyc.daysUntilOvulation === 0
            ? 'Peak fertility — today'
            : `Next period in about ${Math.max(0, daysBetween(today(), cyc.nextPeriod))} days`}
        </div>
        {cyc.inFertileWindow && <span className="tag">✨ Fertile window</span>}
      </div>

      {todayLog.badDay && (
        <div className="card" style={{ background: 'var(--clay-soft)', border: 'none' }}>
          <strong>🫶 Support mode is on.</strong>
          <p className="soft" style={{ margin: '6px 0 0' }}>
            Today only needs the essentials: water, one protein, a little movement, your prenatal.
          </p>
        </div>
      )}

      {/* Fertility score + plant side by side */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Ring value={score} caption="Today" />
          <div style={{ flex: 1 }}>
            <div className="card-title" style={{ marginBottom: 6 }}>How today is going</div>
            <p className="soft" style={{ margin: 0, fontSize: 14 }}>
              A gentle blend of how you’re caring for yourself — not a verdict, just
              evidence you’re becoming healthier.
            </p>
          </div>
        </div>
      </div>

      {/* Metric rows */}
      <div className="card">
        <div className="card-title">Today</div>
        {metrics.map((m) => (
          <div className="stat-row" key={m.key}>
            <span className="emoji">{m.emoji}</span>
            <div className="body">
              <div className="name">{m.label}</div>
              <div className="detail">{m.detail}</div>
              <div className={`bar ${m.status}`}><span style={{ width: `${m.value * 100}%` }} /></div>
            </div>
            <span className={`badge ${m.status}`}>
              {m.status === 'good' ? 'On track' : m.status === 'okay' ? 'Okay' : 'Attention'}
            </span>
          </div>
        ))}
      </div>

      {/* Momentum plant */}
      <div className="card">
        <div className="card-title">Your momentum</div>
        <Plant />
      </div>

      {/* Next trophy — a visual goal to reach for */}
      {nextTrophy && (
        <div className="card" onClick={() => go('trends')} style={{ cursor: 'pointer' }}>
          <div className="card-title">Next trophy</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Ring value={Math.round(nextTrophy.progress * 100)} size={92} stroke={9} caption="there" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                {nextTrophy.def.emoji} {nextTrophy.def.title}
              </div>
              <div className="soft" style={{ fontSize: 14, marginTop: 2 }}>
                {nextTrophy.remaining} more {nextTrophy.def.unit} to{' '}
                {TIER_META[nextTrophy.next!.tier].emoji} {TIER_META[nextTrophy.next!.tier].label}
              </div>
              <button className="btn ghost small" style={{ marginTop: 8 }}>See all trophies →</button>
            </div>
          </div>
        </div>
      )}

      {/* A coach nudge if there's one */}
      {insights.length > 0 && (
        <div className="card" onClick={() => go('coach')} style={{ cursor: 'pointer' }}>
          <div className="card-title">A note from your coach</div>
          <div className={`insight ${insights[0].tone}`}>
            <span className="ic">💬</span>
            <span>{insights[0].text}</span>
          </div>
          <button className="btn ghost small">Talk it through →</button>
        </div>
      )}

      <p className="center muted" style={{ fontSize: 12, margin: '4px 0 0' }}>
        {prettyDate(todayLog.date)}
      </p>
    </div>
  )
}
