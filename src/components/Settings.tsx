import { useEffect, useState } from 'react'
import { useApp } from '../store/AppContext'
import {
  loadReminders,
  saveReminders,
  permission,
  requestPermission,
  notificationsSupported,
  startReminderScheduler,
  showNotification,
  type ReminderSettings,
} from '../lib/notifications'
import { exportJSON, exportCSV, importJSON } from '../lib/exportData'
import { coachStatus } from '../lib/api'
import { SPECIES, petLevelInfo, LEVELS } from '../lib/pet'
import { Creature } from './Creature'

export function Settings({ onClose }: { onClose: () => void }) {
  const { state, importState, reset, setProfile, setPet } = useApp()
  const { profile, pet } = state
  const lvl = petLevelInfo(pet)
  const [reminders, setReminders] = useState<ReminderSettings>(loadReminders())
  const [perm, setPerm] = useState(permission())
  const [claude, setClaude] = useState<boolean | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    coachStatus().then(setClaude)
  }, [])

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function update(patch: Partial<ReminderSettings>) {
    const next = { ...reminders, ...patch }
    setReminders(next)
    saveReminders(next)
    if (next.enabled) startReminderScheduler()
  }

  async function enableNotifications() {
    const p = await requestPermission()
    setPerm(p)
    if (p === 'granted') {
      update({ enabled: true })
      showNotification('🌱 Reminders on', 'Bloom will gently nudge you — never nag.')
    }
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const next = await importJSON(file)
      importState(next)
      setMsg('✓ Data restored from backup.')
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not import that file.')
    }
    e.target.value = ''
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg)',
        zIndex: 60,
        overflowY: 'auto',
      }}
    >
      <div className="app" style={{ paddingBottom: 24 }}>
        <div className="screen">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h1 style={{ fontSize: 24 }}>Settings</h1>
            <button className="btn ghost small" onClick={onClose}>Done</button>
          </div>

          {/* Companion */}
          <div className="card">
            <div className="card-title">Your companion</div>
            <div className="stat-row">
              <span style={{ width: 52, display: 'flex', justifyContent: 'center' }}><Creature species={pet.species} level={lvl.index} size={46} /></span>
              <div className="body">
                <div className="name">{pet.name}</div>
                <div className="detail">
                  {lvl.name}{lvl.next ? ` · ${Math.round(lvl.into)}/${lvl.needed} to ${lvl.next}` : ' · fully grown 🌟'}
                </div>
              </div>
            </div>

            {/* Evolution line — see every life stage */}
            <div className="evo-row">
              {LEVELS.map((name, i) => (
                <div key={name} className={`evo-step ${i === lvl.index ? 'now' : ''} ${i > lvl.index ? 'future' : ''}`}>
                  <Creature species={pet.species} level={i} size={38} />
                  <span>{name}</span>
                </div>
              ))}
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <label>Name</label>
              <input type="text" value={pet.name} maxLength={16} onChange={(e) => setPet({ name: e.target.value })} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Species (changes who you’re raising)</label>
              <div className="species-grid">
                {SPECIES.map((s) => (
                  <button
                    key={s.id}
                    className={`species-pick ${pet.species === s.id ? 'selected' : ''}`}
                    onClick={() => setPet({ species: s.id })}
                    aria-label={s.label}
                  >
                    <Creature species={s.id} level={lvl.index} size={44} />
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Coach status */}
          <div className="card">
            <div className="card-title">AI coach</div>
            <div className="stat-row" style={{ borderBottom: 'none' }}>
              <span className="emoji">{claude ? '✨' : '🌱'}</span>
              <div className="body">
                <div className="name">{claude == null ? 'Checking…' : claude ? 'Live Claude coach connected' : 'Offline coach'}</div>
                <div className="detail">
                  {claude
                    ? 'Your check-ins are answered by Claude.'
                    : 'Using the built-in compassionate coach. Add an API key on the server to go live.'}
                </div>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="card">
            <div className="card-title">Gentle reminders</div>
            {!notificationsSupported() ? (
              <p className="muted" style={{ margin: 0 }}>
                Notifications aren’t supported in this browser.
              </p>
            ) : perm !== 'granted' ? (
              <>
                <p className="soft" style={{ marginTop: 0, fontSize: 14 }}>
                  Soft nudges for your prenatal, water, and an evening check-in. No streaks, no nagging.
                </p>
                <button className="btn" onClick={enableNotifications}>Turn on reminders</button>
                {perm === 'denied' && (
                  <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
                    Notifications are blocked in your browser settings. Re-enable them there first.
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="stat-row">
                  <span className="emoji">🔔</span>
                  <div className="body"><div className="name">Reminders</div></div>
                  <button className={`chip ${reminders.enabled ? 'selected' : ''}`} onClick={() => update({ enabled: !reminders.enabled })}>
                    {reminders.enabled ? 'On' : 'Off'}
                  </button>
                </div>

                <div className="stat-row">
                  <span className="emoji">💊</span>
                  <div className="body"><div className="name">Prenatal</div><div className="detail">daily</div></div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="time" value={reminders.prenatalTime} style={{ width: 120 }} onChange={(e) => update({ prenatalTime: e.target.value })} />
                    <button className={`chip ${reminders.prenatal ? 'selected' : ''}`} onClick={() => update({ prenatal: !reminders.prenatal })}>
                      {reminders.prenatal ? '✓' : 'off'}
                    </button>
                  </div>
                </div>

                <div className="stat-row">
                  <span className="emoji">💧</span>
                  <div className="body"><div className="name">Water</div><div className="detail">every {reminders.waterIntervalHours}h, daytime</div></div>
                  <div className="stepper">
                    <button onClick={() => update({ waterIntervalHours: Math.max(1, reminders.waterIntervalHours - 1) })}>−</button>
                    <span className="val" style={{ minWidth: 40 }}>{reminders.waterIntervalHours}h</span>
                    <button onClick={() => update({ waterIntervalHours: Math.min(8, reminders.waterIntervalHours + 1) })}>+</button>
                  </div>
                </div>

                <div className="stat-row" style={{ borderBottom: 'none' }}>
                  <span className="emoji">🌙</span>
                  <div className="body"><div className="name">Evening check-in</div></div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="time" value={reminders.checkInTime} style={{ width: 120 }} onChange={(e) => update({ checkInTime: e.target.value })} />
                    <button className={`chip ${reminders.checkIn ? 'selected' : ''}`} onClick={() => update({ checkIn: !reminders.checkIn })}>
                      {reminders.checkIn ? '✓' : 'off'}
                    </button>
                  </div>
                </div>

                <button className="btn ghost small" style={{ marginTop: 12 }} onClick={() => showNotification('🌱 Test reminder', 'This is how a Bloom nudge looks.')}>
                  Send a test reminder
                </button>
                <p className="muted" style={{ fontSize: 12, margin: '10px 0 0' }}>
                  Reminders fire while Bloom is open. Add it to your home screen for the best experience.
                </p>
              </>
            )}
          </div>

          {/* Data */}
          <div className="card">
            <div className="card-title">Your data</div>
            <p className="soft" style={{ marginTop: 0, fontSize: 14 }}>
              Everything stays on your device. Take it with you or bring it back anytime.
            </p>
            <div className="row" style={{ marginBottom: 8 }}>
              <button className="btn secondary" onClick={() => exportJSON(state)}>Backup (JSON)</button>
              <button className="btn secondary" onClick={() => exportCSV(state)}>Export (CSV)</button>
            </div>
            <label className="btn ghost" style={{ cursor: 'pointer' }}>
              Restore from backup
              <input type="file" accept="application/json" style={{ display: 'none' }} onChange={onImport} />
            </label>
            {msg && <p className="soft" style={{ fontSize: 13, marginBottom: 0 }}>{msg}</p>}
          </div>

          {/* Goals — these tune the dashboard rings and the prep score */}
          <div className="card">
            <div className="card-title">Your goals</div>
            <p className="soft" style={{ marginTop: 0, fontSize: 14 }}>
              Gentle targets, not rules. Set them where they feel kind and doable.
            </p>

            <div className="stat-row">
              <span className="emoji">💧</span>
              <div className="body"><div className="name">Water</div><div className="detail">glasses / day</div></div>
              <div className="stepper">
                <button aria-label="Fewer water glasses" onClick={() => setProfile({ waterGoal: Math.max(1, profile.waterGoal - 1) })}>−</button>
                <span className="val" style={{ minWidth: 36 }}>{profile.waterGoal}</span>
                <button aria-label="More water glasses" onClick={() => setProfile({ waterGoal: Math.min(16, profile.waterGoal + 1) })}>+</button>
              </div>
            </div>

            <div className="stat-row">
              <span className="emoji">💪</span>
              <div className="body"><div className="name">Protein meals</div><div className="detail">meals with protein / day</div></div>
              <div className="stepper">
                <button aria-label="Fewer protein meals" onClick={() => setProfile({ proteinGoalMeals: Math.max(1, profile.proteinGoalMeals - 1) })}>−</button>
                <span className="val" style={{ minWidth: 36 }}>{profile.proteinGoalMeals}</span>
                <button aria-label="More protein meals" onClick={() => setProfile({ proteinGoalMeals: Math.min(5, profile.proteinGoalMeals + 1) })}>+</button>
              </div>
            </div>

            <div className="stat-row" style={{ borderBottom: 'none' }}>
              <span className="emoji">🚶</span>
              <div className="body"><div className="name">Movement</div><div className="detail">minutes / day</div></div>
              <div className="stepper">
                <button aria-label="Less movement" onClick={() => setProfile({ movementGoal: Math.max(5, profile.movementGoal - 5) })}>−</button>
                <span className="val" style={{ minWidth: 48 }}>{profile.movementGoal}m</span>
                <button aria-label="More movement" onClick={() => setProfile({ movementGoal: Math.min(120, profile.movementGoal + 5) })}>+</button>
              </div>
            </div>
          </div>

          {/* Reset */}
          <div className="card">
            <div className="card-title">Reset</div>
            <div className="row">
              <button className="btn ghost small" onClick={() => { if (confirm('Reload the two-week demo data? This replaces your current data.')) reset(true) }}>
                Load demo data
              </button>
              <button className="btn ghost small" onClick={() => { if (confirm('Start completely fresh? This erases everything.')) reset(false) }}>
                Start fresh
              </button>
            </div>
          </div>

          <p className="center muted" style={{ fontSize: 12 }}>Bloom · {state.profile.name || 'friend'}</p>
        </div>
      </div>
    </div>
  )
}
