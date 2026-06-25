import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { lastNDays, weekdayShort, parseISO, today } from '../lib/dates'
import { pregnancyPrepScore } from '../lib/scores'
import { weekDays } from '../lib/coach'
import { BODY_FEEL_OPTIONS } from '../lib/exercise'
import { Plant } from './Plant'
import type { DayLog, ISODate } from '../types'

// Sparkbars — a tiny, dependency-free bar chart. The whole app is about
// "building evidence over time," so a longitudinal view is core, not decoration.
function Sparkbars({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(1, ...values)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 44 }}>
      {values.map((v, i) => (
        <div
          key={i}
          title={`${v}`}
          style={{
            flex: 1,
            height: `${Math.max(4, (v / max) * 100)}%`,
            background: v > 0 ? color : 'var(--surface-2)',
            borderRadius: 3,
            minWidth: 4,
          }}
        />
      ))}
    </div>
  )
}

function TrendCard({
  emoji,
  label,
  values,
  unit,
  color,
}: {
  emoji: string
  label: string
  values: number[]
  unit: string
  color: string
}) {
  const logged = values.filter((v) => v > 0)
  const avg = logged.length ? Math.round((logged.reduce((s, v) => s + v, 0) / logged.length) * 10) / 10 : 0
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div style={{ fontWeight: 650 }}>{emoji} {label}</div>
        <div className="muted" style={{ fontSize: 13 }}>avg {avg} {unit}</div>
      </div>
      <Sparkbars values={values} color={color} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }} className="muted">
        <span style={{ fontSize: 11 }}>14 days ago</span>
        <span style={{ fontSize: 11 }}>today</span>
      </div>
    </div>
  )
}

export function Trends() {
  const { state } = useApp()
  const dates = lastNDays(14)
  const days = dates.map((d) => state.days[d])

  const protein = days.map((d) => (d ? d.meals.filter((m) => m.hasProtein).length : 0))
  const movement = days.map((d) => d?.movementMinutes ?? 0)
  const water = days.map((d) => d?.waterGlasses ?? 0)
  const sleep = days.map((d) => d?.sleepHours ?? 0)

  const { score } = pregnancyPrepScore(weekDays(state), state.profile)

  return (
    <div className="screen">
      <div className="screen-head">
        <div className="eyebrow">Trends</div>
        <h1>Your evidence</h1>
        <p>Not weight on a scale — proof, over time, that you’re becoming healthier.</p>
      </div>

      <div className="card">
        <div className="card-title">Momentum</div>
        <Plant />
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontSize: 34, fontWeight: 700, color: 'var(--sage-deep)' }}>{score}%</div>
        <div className="soft" style={{ fontSize: 14 }}>
          This week’s Pregnancy Preparation Score — a blend of protein, movement,
          hydration, sleep, stress, prenatal, veg, and alcohol-free days.
        </div>
      </div>

      <TrendCard emoji="💪" label="Protein-rich meals" values={protein} unit="/day" color="var(--sage)" />
      <TrendCard emoji="🚶" label="Movement" values={movement} unit="min" color="var(--clay)" />
      <TrendCard emoji="💧" label="Water" values={water} unit="glasses" color="var(--sky)" />
      <TrendCard emoji="😴" label="Sleep" values={sleep} unit="hrs" color="var(--gold)" />

      <div className="card-title" style={{ marginTop: 18, marginLeft: 4 }}>History — tap a day to fill it in</div>
      {dates
        .slice()
        .reverse()
        .map((date) => (
          <HistoryRow key={date} date={date} day={state.days[date]} />
        ))}
    </div>
  )
}

// An expandable past-day editor. The data model always supported any date — this
// surfaces it, so you can fill in yesterday or fix a day you missed.
function HistoryRow({ date, day }: { date: ISODate; day?: DayLog }) {
  const { patchDay } = useApp()
  const [open, setOpen] = useState(false)
  const isToday = date === today()

  const water = day?.waterGlasses ?? 0
  const sleep = day?.sleepHours ?? 0
  const movement = day?.movementMinutes ?? 0

  const summary = day
    ? [
        day.meals.length ? `🍽 ${day.meals.length}` : '',
        day.meals.some((m) => m.hasProtein) ? `💪 ${day.meals.filter((m) => m.hasProtein).length}` : '',
        (day.movementMinutes ?? 0) > 0 ? `🚶 ${day.movementMinutes}m` : '',
        (day.waterGlasses ?? 0) > 0 ? `💧 ${day.waterGlasses}` : '',
        day.prenatalTaken ? '💊' : '',
      ]
        .filter(Boolean)
        .join('  ')
    : ''

  return (
    <div className="card" style={{ padding: '12px 16px' }}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}
      >
        <div>
          <div style={{ fontWeight: 650 }}>
            {weekdayShort(date)}{' '}
            <span className="muted" style={{ fontWeight: 500 }}>
              {parseISO(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              {isToday ? ' · today' : ''}
            </span>
          </div>
          <div className="muted" style={{ fontSize: 13 }}>{summary || 'nothing logged'}</div>
        </div>
        <span className="muted" style={{ fontSize: 18 }}>{open ? '▾' : '›'}</span>
      </button>

      {open && (
        <div style={{ marginTop: 12 }}>
          <div className="field">
            <label>How did the body feel?</label>
            <div className="chip-row">
              {BODY_FEEL_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  className={`chip ${day?.bodyFeel === o.value ? 'selected' : ''}`}
                  onClick={() => patchDay({ bodyFeel: o.value }, date)}
                >
                  <span className="emoji">{o.emoji}</span> {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="stat-row">
            <span className="emoji">💧</span>
            <div className="body"><div className="name">Water</div></div>
            <div className="stepper">
              <button aria-label="Less water" onClick={() => patchDay({ waterGlasses: Math.max(0, water - 1) }, date)}>−</button>
              <span className="val">{water}</span>
              <button aria-label="More water" onClick={() => patchDay({ waterGlasses: water + 1 }, date)}>+</button>
            </div>
          </div>

          <div className="stat-row">
            <span className="emoji">🚶</span>
            <div className="body"><div className="name">Movement (min)</div></div>
            <div className="stepper">
              <button aria-label="Less movement" onClick={() => patchDay({ movementMinutes: Math.max(0, movement - 5) }, date)}>−</button>
              <span className="val">{movement}</span>
              <button aria-label="More movement" onClick={() => patchDay({ movementMinutes: movement + 5 }, date)}>+</button>
            </div>
          </div>

          <div className="stat-row">
            <span className="emoji">😴</span>
            <div className="body"><div className="name">Sleep (hrs)</div></div>
            <div className="stepper">
              <button aria-label="Less sleep" onClick={() => patchDay({ sleepHours: Math.max(0, sleep - 0.5) }, date)}>−</button>
              <span className="val">{sleep}</span>
              <button aria-label="More sleep" onClick={() => patchDay({ sleepHours: sleep + 0.5 }, date)}>+</button>
            </div>
          </div>

          <div className="stat-row">
            <span className="emoji">🌿</span>
            <div className="body"><div className="name">Stress</div></div>
            <div className="seg" style={{ width: 190, flex: 'none' }}>
              {(['low', 'medium', 'high'] as const).map((s) => (
                <button key={s} className={day?.stress === s ? 'on' : ''} onClick={() => patchDay({ stress: s }, date)}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="stat-row" style={{ borderBottom: 'none' }}>
            <span className="emoji">💊</span>
            <div className="body"><div className="name">Prenatal</div></div>
            <button
              className={`chip ${day?.prenatalTaken ? 'selected' : ''}`}
              onClick={() => patchDay({ prenatalTaken: !day?.prenatalTaken }, date)}
            >
              {day?.prenatalTaken ? '✓ Taken' : 'Mark taken'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
