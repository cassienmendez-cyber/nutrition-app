import { useState } from 'react'
import { useApp } from '../store/AppContext'
import {
  BODY_FEEL_OPTIONS,
  PAIN_OPTIONS,
  buildWorkout,
} from '../lib/exercise'
import type { PainArea } from '../types'
import { WorkoutTracker } from './WorkoutTracker'
import { activityMeta, fmtDistance, fmtDuration, fmtPace, loadWorkouts, deleteWorkout, type Workout } from '../lib/workout'

export function Exercise() {
  const { state, todayLog, patchDay } = useApp()
  const [logged, setLogged] = useState(false)
  const [tracking, setTracking] = useState(false)
  const [workouts, setWorkouts] = useState<Workout[]>(() => loadWorkouts())

  const feel = todayLog.bodyFeel
  const pain = todayLog.pain
  const workout = buildWorkout(feel, pain)
  const totalMin = workout.moves.reduce((s, m) => s + m.minutes, 0)

  function togglePain(area: PainArea) {
    const next = pain.includes(area) ? pain.filter((p) => p !== area) : [...pain, area]
    patchDay({ pain: next })
  }

  function logDone() {
    patchDay({
      movementMinutes: Math.max(todayLog.movementMinutes ?? 0, totalMin),
      movementNote: workout.title,
    })
    setLogged(true)
    setTimeout(() => setLogged(false), 2500)
  }

  const fmtWhen = (ms: number) =>
    new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  return (
    <div className="screen">
      <div className="screen-head">
        <div className="eyebrow">Movement</div>
        <h1>How does your body feel today?</h1>
        <p>No “what workout?” — we start with you, then build around it.</p>
      </div>

      {/* GPS workout tracker — like a Fitbit, free and local */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="card-title" style={{ marginBottom: 2 }}>Track a workout</div>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>GPS maps your route — time, distance & pace.</p>
          </div>
          <button className="btn" style={{ width: 'auto', padding: '10px 16px' }} onClick={() => setTracking(true)}>
            ▶ Start
          </button>
        </div>

        {workouts.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {workouts.slice(0, 4).map((w) => {
              const m = activityMeta(w.type)
              return (
                <div className="wk-row" key={w.id}>
                  <span className="wk-emoji">{m.emoji}</span>
                  <div className="wk-meta">
                    <div style={{ fontWeight: 600 }}>{m.label} · {fmtWhen(w.end)}</div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {fmtDuration(w.durationSec)}
                      {w.distanceM > 5 && ` · ${fmtDistance(w.distanceM)} · ${fmtPace(w.paceSecPerKm)}`}
                    </div>
                  </div>
                  <button
                    aria-label="Delete workout"
                    className="icon-btn"
                    onClick={() => setWorkouts(deleteWorkout(w.id))}
                    style={{ background: 'none', color: 'var(--ink-faint)', fontSize: 18 }}
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="card">
        <div className="chip-row">
          {BODY_FEEL_OPTIONS.map((o) => (
            <button
              key={o.value}
              className={`chip ${feel === o.value ? 'selected' : ''}`}
              onClick={() => patchDay({ bodyFeel: o.value })}
            >
              <span className="emoji">{o.emoji}</span> {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Anything hurting today? (we’ll route around it)</div>
        <div className="chip-row">
          {PAIN_OPTIONS.map((o) => (
            <button
              key={o.value}
              className={`chip ${pain.includes(o.value) ? 'selected' : ''}`}
              onClick={() => togglePain(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 13, margin: '10px 0 0' }}>
          We never tell you to skip. We reroute to something that still counts.
        </p>
      </div>

      {/* The generated workout */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h3>{workout.title}</h3>
          <span className="badge good">{totalMin} min</span>
        </div>
        <p className="soft" style={{ margin: '6px 0 4px' }}>{workout.intro}</p>
        {workout.rerouted && (
          <div className="insight support" style={{ marginTop: 8 }}>
            <span className="ic">🔁</span>
            <span>{workout.rerouted}</span>
          </div>
        )}
        <div style={{ marginTop: 6 }}>
          {workout.moves.map((m) => (
            <div className="move-item" key={m.name}>
              <span className="min">{m.minutes}m</span>
              <div>
                <div style={{ fontWeight: 600 }}>{m.name}</div>
                <div className="muted" style={{ fontSize: 13 }}>{m.detail}</div>
              </div>
            </div>
          ))}
        </div>
        <button className="btn" style={{ marginTop: 14 }} onClick={logDone}>
          {logged ? '🎉 Logged — that counts!' : 'I did this'}
        </button>
      </div>

      {(todayLog.movementMinutes ?? 0) > 0 && (
        <div className="card center">
          <strong>🚶 {todayLog.movementMinutes} minutes moved today</strong>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            {pain.length
              ? `And you did it with your ${pain.join(' & ')} acting up. That’s a real win.`
              : 'Every minute is evidence you’re becoming healthier.'}
          </p>
        </div>
      )}

      <p className="center muted" style={{ fontSize: 12 }}>
        Goal: {state.profile.movementGoal} min/day · gentle and flexible
      </p>

      {tracking && (
        <WorkoutTracker
          onClose={() => {
            setTracking(false)
            setWorkouts(loadWorkouts())
          }}
        />
      )}
    </div>
  )
}
