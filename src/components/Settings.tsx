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
  pushSupported,
  pushActive,
  pushServerKey,
  enablePush,
  disablePush,
  syncPush,
  sendTestPush,
  isIOS,
  isStandalone,
  type ReminderSettings,
} from '../lib/notifications'
import { exportJSON, exportCSV, importJSON } from '../lib/exportData'
import { coachStatus } from '../lib/api'
import { SPECIES, petLevelInfo, LEVELS } from '../lib/pet'
import { isSoundOn, setSoundOn, playFeed } from '../lib/sound'
import { Creature } from './Creature'

export function Settings({ onClose }: { onClose: () => void }) {
  const { state, importState, reset, setProfile, setPet } = useApp()
  const { profile, pet, collection } = state
  const lvl = petLevelInfo(pet)
  const [reminders, setReminders] = useState<ReminderSettings>(loadReminders())
  const [perm, setPerm] = useState(permission())
  const [claude, setClaude] = useState<boolean | null>(null)
  const [sound, setSound] = useState(isSoundOn())
  const [msg, setMsg] = useState('')
  const [pushOnServer, setPushOnServer] = useState<boolean | null>(null)
  const [phonePush, setPhonePush] = useState(pushActive())
  const [pushBusy, setPushBusy] = useState(false)
  const [pushMsg, setPushMsg] = useState('')

  useEffect(() => {
    coachStatus().then(setClaude)
    // Does the backend have push (VAPID) configured?
    if (pushSupported()) pushServerKey().then((k) => setPushOnServer(!!k))
    else setPushOnServer(false)
  }, [])

  async function turnOnPhonePush() {
    setPushBusy(true)
    setPushMsg('')
    const next = { ...reminders, enabled: true }
    const res = await enablePush(next)
    setPushBusy(false)
    if (res.ok) {
      saveReminders(next)
      setReminders(next)
      setPerm(permission())
      setPhonePush(true)
      setPushMsg('Phone reminders are on. 🎉')
    } else {
      const reasons: Record<string, string> = {
        unsupported: 'This browser can’t do push notifications.',
        'needs-install': 'On iPhone, first add Bloom to your Home Screen (Share → Add to Home Screen), then open it from there.',
        denied: 'Notification permission was blocked. Re-enable it in your browser settings.',
        'no-server': 'The reminder server isn’t set up yet (no VAPID keys). Reminders will still fire while the app is open.',
        error: 'Something went wrong turning on push. Try again.',
      }
      setPushMsg(reasons[res.reason] ?? 'Could not enable push.')
    }
  }

  async function turnOffPhonePush() {
    setPushBusy(true)
    await disablePush()
    setPushBusy(false)
    setPhonePush(false)
    setPushMsg('Phone reminders turned off.')
  }

  async function testPhonePush() {
    const ok = await sendTestPush()
    setPushMsg(ok ? 'Sent! It should arrive on your phone shortly.' : 'Couldn’t send a test push.')
  }

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
    // If phone push is on, push the updated schedule to the server too.
    if (pushActive()) syncPush(next)
  }

  function setEatTime(i: number, value: string) {
    const eatTimes = reminders.eatTimes.map((t, j) => (j === i ? value : t))
    update({ eatTimes })
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

          {/* Hall of Companions — pets you raised to Elder and graduated */}
          {collection.length > 0 && (
            <div className="card">
              <div className="card-title">Hall of companions</div>
              <p className="soft" style={{ marginTop: 0, fontSize: 13.5 }}>
                The companions you raised all the way to Elder and graduated. 🎓
              </p>
              <div className="hall-row">
                {collection.map((g) => (
                  <div key={g.id} className="hall-item">
                    <Creature species={g.species} level={5} size={48} prestige={g.prestige} />
                    <span>{g.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sound */}
          <div className="card">
            <div className="card-title">Sound</div>
            <div className="stat-row" style={{ borderBottom: 'none' }}>
              <span className="emoji">🔊</span>
              <div className="body">
                <div className="name">Sound effects</div>
                <div className="detail">Soft chimes when you feed and evolve</div>
              </div>
              <button
                className={`chip ${sound ? 'selected' : ''}`}
                aria-pressed={sound}
                onClick={() => { const v = !sound; setSound(v); setSoundOn(v); if (v) playFeed() }}
              >
                {sound ? 'On' : 'Off'}
              </button>
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
                  <button className={`chip ${reminders.enabled ? 'selected' : ''}`} aria-pressed={reminders.enabled} onClick={() => update({ enabled: !reminders.enabled })}>
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
                  <span className="emoji">🍎</span>
                  <div className="body"><div className="name">Eat</div><div className="detail">meal nudges</div></div>
                  <button className={`chip ${reminders.eat ? 'selected' : ''}`} onClick={() => update({ eat: !reminders.eat })}>
                    {reminders.eat ? '✓' : 'off'}
                  </button>
                </div>
                {reminders.eat && (
                  <div className="stat-row" style={{ paddingTop: 0 }}>
                    <span className="emoji" style={{ opacity: 0 }}>🍎</span>
                    <div className="body"><div className="detail">meal times</div></div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {reminders.eatTimes.map((t, i) => (
                        <input key={i} type="time" value={t} style={{ width: 104 }} onChange={(e) => setEatTime(i, e.target.value)} />
                      ))}
                    </div>
                  </div>
                )}

                <div className="stat-row">
                  <span className="emoji">🤸</span>
                  <div className="body"><div className="name">Exercise</div><div className="detail">daily move nudge</div></div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="time" value={reminders.exerciseTime} style={{ width: 120 }} onChange={(e) => update({ exerciseTime: e.target.value })} />
                    <button className={`chip ${reminders.exercise ? 'selected' : ''}`} onClick={() => update({ exercise: !reminders.exercise })}>
                      {reminders.exercise ? '✓' : 'off'}
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

                <div className="stat-row">
                  <span className="emoji">🌙</span>
                  <div className="body"><div className="name">Evening check-in</div></div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="time" value={reminders.checkInTime} style={{ width: 120 }} onChange={(e) => update({ checkInTime: e.target.value })} />
                    <button className={`chip ${reminders.checkIn ? 'selected' : ''}`} onClick={() => update({ checkIn: !reminders.checkIn })}>
                      {reminders.checkIn ? '✓' : 'off'}
                    </button>
                  </div>
                </div>

                <div className="stat-row">
                  <span className="emoji">🐸</span>
                  <div className="body"><div className="name">Companion needs</div><div className="detail">when meters run low</div></div>
                  <button className={`chip ${reminders.petCare ? 'selected' : ''}`} onClick={() => update({ petCare: !reminders.petCare })}>
                    {reminders.petCare ? '✓' : 'off'}
                  </button>
                </div>

                <div className="stat-row" style={{ borderBottom: 'none' }}>
                  <span className="emoji">🌙</span>
                  <div className="body"><div className="name">Quiet hours</div><div className="detail">no nudges overnight</div></div>
                  <button className={`chip ${reminders.quietHours ? 'selected' : ''}`} onClick={() => update({ quietHours: !reminders.quietHours })}>
                    {reminders.quietHours ? 'On' : 'Off'}
                  </button>
                </div>
                {reminders.quietHours && (
                  <div className="stat-row" style={{ paddingTop: 0, borderBottom: 'none' }}>
                    <span className="emoji" style={{ opacity: 0 }}>🌙</span>
                    <div className="body"><div className="detail">from / to</div></div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="time" value={reminders.quietStart} style={{ width: 104 }} onChange={(e) => update({ quietStart: e.target.value })} />
                      <span className="muted" style={{ fontSize: 12 }}>→</span>
                      <input type="time" value={reminders.quietEnd} style={{ width: 104 }} onChange={(e) => update({ quietEnd: e.target.value })} />
                    </div>
                  </div>
                )}

                {/* Phone push — reminders that arrive even when Bloom is closed */}
                <div className="push-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <div>
                      <div className="name" style={{ fontWeight: 700 }}>📱 Phone reminders</div>
                      <div className="detail" style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                        {phonePush ? 'On — these arrive even when Bloom is closed.' : 'Get nudges even when the app is closed.'}
                      </div>
                    </div>
                    {pushSupported() ? (
                      phonePush ? (
                        <button className="chip selected" disabled={pushBusy} onClick={turnOffPhonePush}>On</button>
                      ) : (
                        <button className="btn" style={{ width: 'auto', padding: '8px 14px' }} disabled={pushBusy} onClick={turnOnPhonePush}>
                          {pushBusy ? '…' : 'Turn on'}
                        </button>
                      )
                    ) : (
                      <span className="muted" style={{ fontSize: 12 }}>Unavailable</span>
                    )}
                  </div>

                  {phonePush && (
                    <button className="btn ghost small" style={{ marginTop: 10 }} onClick={testPhonePush}>
                      Send a test to my phone
                    </button>
                  )}

                  {/* Contextual help */}
                  {isIOS() && !isStandalone() && (
                    <p className="muted" style={{ fontSize: 12, margin: '8px 0 0' }}>
                      📲 On iPhone: tap Share → <strong>Add to Home Screen</strong>, then open Bloom from there to enable phone reminders.
                    </p>
                  )}
                  {pushOnServer === false && (
                    <p className="muted" style={{ fontSize: 12, margin: '8px 0 0' }}>
                      The reminder server isn’t configured yet, so reminders fire only while Bloom is open. (Set up VAPID keys to enable phone push.)
                    </p>
                  )}
                  {pushMsg && <p className="soft" style={{ fontSize: 12.5, margin: '8px 0 0' }}>{pushMsg}</p>}
                </div>

                <button className="btn ghost small" style={{ marginTop: 12 }} onClick={() => showNotification('🌱 Test reminder', 'This is how a Bloom nudge looks.')}>
                  Send a test reminder (while open)
                </button>
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
