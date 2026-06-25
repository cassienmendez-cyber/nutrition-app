import { useApp } from '../store/AppContext'
import { cycleInfo, PHASE_COPY } from '../lib/cycle'
import { dashboardMetrics, fertilityScore } from '../lib/scores'
import { weeklyInsights } from '../lib/coach'
import { todayPoints } from '../lib/points'
import { prettyDate, daysBetween, today } from '../lib/dates'
import { PetHabitat } from './PetHabitat'
import { PointsPill } from './PointsPill'

export function Dashboard({ go }: { go: (tab: string) => void }) {
  const { state, todayLog } = useApp()
  const cyc = cycleInfo(state.profile)
  const phase = PHASE_COPY[cyc.phase]
  const metrics = dashboardMetrics(todayLog, state.profile)
  const score = fertilityScore(todayLog, state.profile)
  const insights = weeklyInsights(state)
  const points = todayPoints(state)

  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = state.profile.name && state.profile.name !== 'friend' ? `, ${state.profile.name}` : ''

  return (
    <div className="screen">
      {/* Slim cycle banner with the fertility score tucked in */}
      <div className="hero">
        <div className="greet">{greet}{name} 🌿</div>
        <h2 style={{ marginTop: 2 }}>{phase.label} · Cycle Day {cyc.cycleDay}</h2>
        <div className="sub">
          {cyc.ovulationTomorrow
            ? 'Possible ovulation tomorrow 💙'
            : cyc.daysUntilOvulation > 0
            ? `Ovulation in about ${cyc.daysUntilOvulation} days`
            : cyc.daysUntilOvulation === 0
            ? 'Peak fertility — today'
            : `Next period in about ${Math.max(0, daysBetween(today(), cyc.nextPeriod))} days`}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {cyc.inFertileWindow && <span className="tag">✨ Fertile window</span>}
          <span className="tag">❤️ Today {score}%</span>
        </div>
      </div>

      {/* The companion — the heart of the game */}
      <PetHabitat />

      {/* Today's points + how you earned them */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Points earned today</div>
          <PointsPill value={points.total} prefix="✨ +" />
        </div>
        {points.lines.length > 0 ? (
          <div className="chip-row" style={{ marginTop: 12 }}>
            {points.lines.map((l) => (
              <span className="chip" key={l.label}>
                <span className="emoji">{l.emoji}</span> {l.label} +{l.points}
              </span>
            ))}
          </div>
        ) : (
          <p className="soft" style={{ margin: '8px 0 0', fontSize: 14 }}>
            Care for yourself today — log a meal, some water, or a little movement — and points
            roll in to feed your companion. 🌱
          </p>
        )}
      </div>

      {todayLog.badDay && (
        <div className="card" style={{ background: 'var(--blue-soft)', border: 'none' }}>
          <strong>🫶 Support mode is on.</strong>
          <p className="soft" style={{ margin: '6px 0 0' }}>
            Today only needs the essentials: water, one protein, a little movement, your prenatal.
          </p>
        </div>
      )}

      {/* Daily care — the things that earn points */}
      <div className="card">
        <div className="card-title">Today’s care</div>
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

      {/* A coach nudge if there's one */}
      {insights.length > 0 && (
        <div className="card tappable" onClick={() => go('coach')}>
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
