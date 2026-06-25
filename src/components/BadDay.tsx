import { useApp } from '../store/AppContext'
import { badDayGoals } from '../lib/coach'

// The Bad Day button — taps into support mode. The day's goals shrink to the
// four essentials so "mission accomplished" stays reachable. No guilt.
export function BadDay({ onClose }: { onClose: () => void }) {
  const { todayLog, patchDay } = useApp()
  const goals = badDayGoals()

  function toggle(on: boolean) {
    patchDay({ badDay: on })
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(47,58,53,0.45)',
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
        style={{ maxWidth: 460, width: '100%', margin: 12, borderRadius: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="center" style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 40 }}>🫶</div>
          <h2 style={{ marginTop: 6 }}>Today can be small.</h2>
          <p className="soft" style={{ marginTop: 6 }}>
            You’re overwhelmed, and that’s okay. We’re shrinking today down to just
            the essentials. Do any of these and the day is a win.
          </p>
        </div>

        <div className="pill-list" style={{ marginTop: 8 }}>
          {goals.map((g) => (
            <div key={g.text} className="win" style={{ background: 'var(--clay-soft)', color: '#9c5a3c' }}>
              <span style={{ fontSize: 19 }}>{g.emoji}</span> {g.text}
            </div>
          ))}
        </div>

        <div className="row" style={{ marginTop: 16 }}>
          {todayLog.badDay ? (
            <button className="btn secondary" onClick={() => { toggle(false); onClose() }}>
              I’m okay now
            </button>
          ) : (
            <button className="btn" onClick={() => { toggle(true); onClose() }}>
              Switch to support mode
            </button>
          )}
        </div>
        <button className="btn ghost" style={{ marginTop: 8 }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
