import { useApp } from '../store/AppContext'
import { cycleInfo, PHASE_COPY, type CyclePhase } from '../lib/cycle'
import { prettyDate, today } from '../lib/dates'
import type { FertilitySigns } from '../types'

const MUCUS: { value: NonNullable<FertilitySigns['mucus']>; label: string }[] = [
  { value: 'dry', label: 'Dry' },
  { value: 'sticky', label: 'Sticky' },
  { value: 'creamy', label: 'Creamy' },
  { value: 'watery', label: 'Watery' },
  { value: 'egg-white', label: 'Egg-white' },
]

const PHASE_COLOR: Record<CyclePhase, string> = {
  menstrual: 'var(--blush)',
  follicular: 'var(--sage-soft)',
  fertile: 'var(--gold)',
  ovulation: 'var(--clay)',
  luteal: 'var(--sky)',
}

export function Fertility() {
  const { state, todayLog, patchDay, setProfile } = useApp()
  const cyc = cycleInfo(state.profile)
  const phase = PHASE_COPY[cyc.phase]
  const fert = todayLog.fertility ?? {}
  const len = state.profile.cycleLength

  const setFert = (patch: Partial<FertilitySigns>) =>
    patchDay({ fertility: { ...fert, ...patch } })

  return (
    <div className="screen">
      <div className="screen-head">
        <div className="eyebrow">Fertility mode</div>
        <h1>Cycle Day {cyc.cycleDay}</h1>
        <p>{phase.note}</p>
      </div>

      {/* Cycle ribbon */}
      <div className="card">
        <div className="card-title">{phase.label}</div>
        <div style={{ display: 'flex', gap: 2 }}>
          {Array.from({ length: len }, (_, i) => {
            const day = i + 1
            const isToday = day === cyc.cycleDay
            const ovDay = len - 14
            const inFertile = day >= ovDay - 5 && day <= ovDay + 1
            const isOv = day === ovDay
            const isPeriod = day <= state.profile.periodLength
            const bg = isOv
              ? 'var(--clay)'
              : isPeriod
              ? 'var(--blush)'
              : inFertile
              ? 'var(--gold)'
              : 'var(--surface-2)'
            return (
              <div
                key={day}
                title={`Day ${day}`}
                style={{
                  flex: 1,
                  height: isToday ? 26 : 16,
                  background: bg,
                  alignSelf: 'center',
                  borderRadius: 4,
                  outline: isToday ? '2px solid var(--ink)' : 'none',
                }}
              />
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12 }} className="muted">
          <span>🩸 Period</span>
          <span>✨ Fertile</span>
          <span>🥚 Ovulation</span>
        </div>
      </div>

      {/* Predictions */}
      <div className="card">
        <div className="card-title">Predictions</div>
        <div className="stat-row">
          <span className="emoji">🥚</span>
          <div className="body">
            <div className="name">Ovulation</div>
            <div className="detail">{prettyDate(cyc.ovulationDate)}</div>
          </div>
          <span className="badge" style={{ background: PHASE_COLOR[cyc.phase], color: '#fff' }}>
            {cyc.daysUntilOvulation === 0 ? 'today' : cyc.daysUntilOvulation > 0 ? `${cyc.daysUntilOvulation}d` : 'passed'}
          </span>
        </div>
        <div className="stat-row">
          <span className="emoji">✨</span>
          <div className="body">
            <div className="name">Fertile window</div>
            <div className="detail">{prettyDate(cyc.fertileStart)} → {prettyDate(cyc.fertileEnd)}</div>
          </div>
        </div>
        <div className="stat-row">
          <span className="emoji">🌙</span>
          <div className="body">
            <div className="name">Next period</div>
            <div className="detail">{prettyDate(cyc.nextPeriod)}</div>
          </div>
        </div>
      </div>

      {/* Period start adjuster */}
      <div className="card">
        <div className="card-title">Log your period</div>
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Most recent period start</label>
          <input
            type="date"
            value={state.profile.lastPeriodStart}
            max={today()}
            onChange={(e) => e.target.value && setProfile({ lastPeriodStart: e.target.value })}
          />
        </div>
        <button className="btn" onClick={() => setProfile({ lastPeriodStart: today() })}>
          My period started today
        </button>
      </div>

      {/* Fertility signs */}
      <div className="card">
        <div className="card-title">Today’s signs</div>

        <div className="field">
          <label>Cervical mucus</label>
          <div className="chip-row">
            {MUCUS.map((m) => (
              <button
                key={m.value}
                className={`chip ${fert.mucus === m.value ? 'selected' : ''}`}
                onClick={() => setFert({ mucus: m.value })}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Basal body temp (°F)</label>
          <input
            type="number"
            step="0.1"
            placeholder="97.8"
            value={fert.bbt ?? ''}
            onChange={(e) => setFert({ bbt: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>

        <div className="field">
          <label>Mood</label>
          <div className="chip-row">
            {(['low', 'okay', 'good', 'great'] as const).map((mo) => (
              <button
                key={mo}
                className={`chip ${fert.mood === mo ? 'selected' : ''}`}
                onClick={() => setFert({ mood: mo })}
              >
                {mo}
              </button>
            ))}
          </div>
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label>Intimacy (optional)</label>
          <div className="chip-row">
            <button className={`chip ${fert.intimacy ? 'selected' : ''}`} onClick={() => setFert({ intimacy: !fert.intimacy })}>
              {fert.intimacy ? '💛 Logged' : 'Log'}
            </button>
          </div>
        </div>
      </div>

      <DailyCare />
    </div>
  )
}

// Daily care quick-logging: water, sleep, stress, prenatal, blood pressure.
// These feed the dashboard metrics and the weekly prep score.
function DailyCare() {
  const { todayLog, patchDay, state } = useApp()
  const water = todayLog.waterGlasses ?? 0
  const sleep = todayLog.sleepHours ?? 0

  return (
    <div className="card">
      <div className="card-title">Daily care</div>

      <div className="stat-row">
        <span className="emoji">💧</span>
        <div className="body"><div className="name">Water</div><div className="detail">Goal {state.profile.waterGoal} glasses</div></div>
        <div className="stepper">
          <button onClick={() => patchDay({ waterGlasses: Math.max(0, water - 1) })}>−</button>
          <span className="val">{water}</span>
          <button onClick={() => patchDay({ waterGlasses: water + 1 })}>+</button>
        </div>
      </div>

      <div className="stat-row">
        <span className="emoji">😴</span>
        <div className="body"><div className="name">Sleep</div><div className="detail">hours last night</div></div>
        <div className="stepper">
          <button onClick={() => patchDay({ sleepHours: Math.max(0, sleep - 0.5) })}>−</button>
          <span className="val">{sleep}</span>
          <button onClick={() => patchDay({ sleepHours: sleep + 0.5 })}>+</button>
        </div>
      </div>

      <div className="stat-row">
        <span className="emoji">🌿</span>
        <div className="body"><div className="name">Stress</div></div>
        <div className="seg" style={{ maxWidth: 200, flex: 'none', width: 200 }}>
          {(['low', 'medium', 'high'] as const).map((s) => (
            <button key={s} className={todayLog.stress === s ? 'on' : ''} onClick={() => patchDay({ stress: s })}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="stat-row">
        <span className="emoji">💊</span>
        <div className="body"><div className="name">Prenatal</div><div className="detail">a quiet daily win</div></div>
        <button
          className={`chip ${todayLog.prenatalTaken ? 'selected' : ''}`}
          onClick={() => patchDay({ prenatalTaken: !todayLog.prenatalTaken })}
        >
          {todayLog.prenatalTaken ? '✓ Taken' : 'Mark taken'}
        </button>
      </div>

      <div className="stat-row" style={{ borderBottom: 'none' }}>
        <span className="emoji">🩺</span>
        <div className="body"><div className="name">Blood pressure</div><div className="detail">optional</div></div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="number"
            placeholder="120"
            style={{ width: 60 }}
            value={todayLog.bloodPressure?.systolic ?? ''}
            onChange={(e) =>
              patchDay({
                bloodPressure: {
                  systolic: Number(e.target.value) || 0,
                  diastolic: todayLog.bloodPressure?.diastolic ?? 80,
                },
              })
            }
          />
          <span className="muted">/</span>
          <input
            type="number"
            placeholder="80"
            style={{ width: 60 }}
            value={todayLog.bloodPressure?.diastolic ?? ''}
            onChange={(e) =>
              patchDay({
                bloodPressure: {
                  systolic: todayLog.bloodPressure?.systolic ?? 120,
                  diastolic: Number(e.target.value) || 0,
                },
              })
            }
          />
        </div>
      </div>
    </div>
  )
}
