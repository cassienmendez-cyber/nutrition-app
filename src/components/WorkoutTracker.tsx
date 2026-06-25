import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store/AppContext'
import {
  ACTIVITIES,
  activityMeta,
  estimateSteps,
  fmtDistance,
  fmtDuration,
  fmtPace,
  fmtSteps,
  getAutoPause,
  getUnits,
  haversine,
  pathDistance,
  paceSecPerKm,
  projectPoints,
  routePath,
  saveWorkout,
  setAutoPause as persistAutoPause,
  setUnits as persistUnits,
  type ActivityType,
  type GpsPoint,
  type Units,
  type Workout,
} from '../lib/workout'
import { newId } from '../store/AppContext'

type Phase = 'setup' | 'tracking' | 'paused' | 'done'

// A Fitbit-style GPS workout tracker. Free + browser-native: the Geolocation
// API for position, and we draw the route ourselves (no paid map tiles).
export function WorkoutTracker({ onClose }: { onClose: () => void }) {
  const { todayLog, patchDay } = useApp()
  const [phase, setPhase] = useState<Phase>('setup')
  const [type, setType] = useState<ActivityType>('walk')
  const [pts, setPts] = useState<GpsPoint[]>([])
  const [elapsed, setElapsed] = useState(0) // active seconds
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [gpsErr, setGpsErr] = useState<string | null>(null)
  const [saved, setSaved] = useState<Workout | null>(null)
  const [units, setUnits] = useState<Units>(() => getUnits())
  const [autoPause, setAutoPause] = useState(() => getAutoPause())
  const [autoPaused, setAutoPaused] = useState(false)

  const watchId = useRef<number | null>(null)
  const tickId = useRef<ReturnType<typeof setInterval> | null>(null)
  const accMs = useRef(0) // banked active ms
  const lastTick = useRef(0) // ms at last tick (to accumulate deltas)
  const lastMove = useRef(0) // ms of the last real movement (for auto-pause)
  const lastPt = useRef<GpsPoint | null>(null)
  const runningRef = useRef(false) // counting active time right now?
  const autoPausedRef = useRef(false) // mirror of autoPaused for stable closures
  const wakeLock = useRef<{ release: () => void } | null>(null)

  const miles = units === 'mi'
  const STILL_MS = 7000 // stop counting after ~7s of no movement
  const distanceM = pathDistance(pts)
  const pace = paceSecPerKm(distanceM, elapsed)
  const steps = estimateSteps(distanceM, type)

  // --- lifecycle helpers ---------------------------------------------------
  function startWatch() {
    if (!('geolocation' in navigator)) {
      setGpsErr('Location isn’t available on this device — timing only.')
      return
    }
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsErr(null)
        setAccuracy(pos.coords.accuracy)
        if (pos.coords.accuracy > 50) return // too noisy to trust — skip
        const pt: GpsPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude, t: pos.timestamp }
        // Real movement? (beyond GPS jitter) — drives auto-pause/resume.
        const moved = lastPt.current ? haversine(lastPt.current, pt) : 0
        if (!lastPt.current || moved >= 2) {
          lastMove.current = Date.now()
          if (autoPausedRef.current) {
            autoPausedRef.current = false
            setAutoPaused(false)
            runningRef.current = true
          }
        }
        lastPt.current = pt
        setPts((prev) => [...prev, pt])
      },
      (err) => {
        setGpsErr(
          err.code === err.PERMISSION_DENIED
            ? 'Location off — timing only. Allow location to map your route.'
            : 'Couldn’t get a GPS fix — timing only.',
        )
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 },
    )
  }
  function stopWatch() {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
  }
  function startTick() {
    lastTick.current = Date.now()
    tickId.current = setInterval(() => {
      const now = Date.now()
      // Auto-pause: stop counting after a stretch with no real movement.
      if (autoPause && runningRef.current && now - lastMove.current > STILL_MS) {
        runningRef.current = false
        autoPausedRef.current = true
        setAutoPaused(true)
      }
      if (runningRef.current) accMs.current += now - lastTick.current
      lastTick.current = now
      setElapsed(accMs.current / 1000)
    }, 250)
  }
  function stopTick() {
    if (tickId.current) clearInterval(tickId.current)
    tickId.current = null
  }
  async function requestWakeLock() {
    try {
      // Keep the screen awake while tracking, like a fitness watch.
      const nav = navigator as Navigator & { wakeLock?: { request: (t: string) => Promise<{ release: () => void }> } }
      if (nav.wakeLock) wakeLock.current = await nav.wakeLock.request('screen')
    } catch {
      /* not critical */
    }
  }
  function releaseWakeLock() {
    try {
      wakeLock.current?.release()
    } catch {
      /* ignore */
    }
    wakeLock.current = null
  }

  // --- controls ------------------------------------------------------------
  function start() {
    accMs.current = 0
    lastMove.current = Date.now()
    lastPt.current = null
    runningRef.current = true
    autoPausedRef.current = false
    setAutoPaused(false)
    setPts([])
    setElapsed(0)
    setPhase('tracking')
    startWatch()
    startTick()
    requestWakeLock()
  }
  function pause() {
    runningRef.current = false
    autoPausedRef.current = false
    setAutoPaused(false)
    stopWatch()
    setPhase('paused')
  }
  function resume() {
    runningRef.current = true
    lastMove.current = Date.now()
    lastTick.current = Date.now()
    autoPausedRef.current = false
    setAutoPaused(false)
    setPhase('tracking')
    startWatch()
  }
  function finish() {
    runningRef.current = false
    stopTick()
    stopWatch()
    releaseWakeLock()
    const durationSec = Math.round(accMs.current / 1000)
    const dist = pathDistance(pts)
    const workout: Workout = {
      id: newId(),
      type,
      start: pts[0]?.t ?? Date.now() - durationSec * 1000,
      end: Date.now(),
      durationSec,
      distanceM: dist,
      paceSecPerKm: paceSecPerKm(dist, durationSec),
      points: pts,
      gps: pts.length > 1,
    }
    if (durationSec >= 10) {
      saveWorkout(workout)
      // Feed the movement into today's log so it earns points & hits the goal.
      const mins = Math.max(1, Math.round(durationSec / 60))
      patchDay({
        movementMinutes: (todayLog.movementMinutes ?? 0) + mins,
        movementNote: `${activityMeta(type).label} (tracked)`,
      })
    }
    setSaved(workout)
    setPhase('done')
  }

  // Clean up if the user closes mid-session.
  useEffect(() => {
    return () => {
      stopTick()
      stopWatch()
      releaseWakeLock()
    }
  }, [])

  const meta = activityMeta(type)
  const W = 320
  const H = 220
  const path = routePath(pts, W, H)

  return (
    <div className="sheet-overlay" role="dialog" aria-label="Workout tracker">
      <div className="sheet workout-sheet">
        <div className="sheet-grip" />

        {phase === 'setup' && (
          <>
            <h2 style={{ marginTop: 4 }}>Track a workout</h2>
            <p className="soft">Your phone’s GPS maps the route — distance, time and pace. No calories, ever. 💚</p>
            <div className="chip-row" style={{ marginTop: 8 }}>
              {ACTIVITIES.map((a) => (
                <button key={a.type} className={`chip ${type === a.type ? 'selected' : ''}`} onClick={() => setType(a.type)}>
                  <span className="emoji">{a.emoji}</span> {a.label}
                </button>
              ))}
            </div>

            {/* Units + auto-pause preferences */}
            <div className="wk-prefs">
              <div className="wk-pref">
                <span>Units</span>
                <div className="seg">
                  {(['mi', 'km'] as Units[]).map((u) => (
                    <button
                      key={u}
                      className={units === u ? 'on' : ''}
                      onClick={() => {
                        setUnits(u)
                        persistUnits(u)
                      }}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <label className="wk-pref">
                <span>Auto-pause when I stop</span>
                <input
                  type="checkbox"
                  className="switch"
                  checked={autoPause}
                  onChange={(e) => {
                    setAutoPause(e.target.checked)
                    persistAutoPause(e.target.checked)
                  }}
                />
              </label>
            </div>

            <button className="btn" style={{ marginTop: 16 }} onClick={start}>
              {meta.emoji} Start {meta.label.toLowerCase()}
            </button>
            <button className="btn ghost" style={{ marginTop: 8 }} onClick={onClose}>
              Cancel
            </button>
            <p className="muted center" style={{ fontSize: 12, marginTop: 10 }}>
              We’ll ask for location permission. It stays on your device.
            </p>
          </>
        )}

        {(phase === 'tracking' || phase === 'paused') && (
          <>
            <div className="center" style={{ marginBottom: 8 }}>
              <span className="badge good">{meta.emoji} {meta.label}</span>
            </div>

            {/* Big live timer */}
            <div className="center">
              <div className="wk-timer">{fmtDuration(elapsed)}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {phase === 'paused' ? 'Paused' : autoPaused ? '⏸ Auto-paused — move to resume' : 'Active time'}
              </div>
            </div>

            {/* Live stats */}
            <div className="wk-stats">
              <div>
                <div className="wk-val">{fmtDistance(distanceM, miles)}</div>
                <div className="wk-lab">Distance</div>
              </div>
              <div>
                <div className="wk-val">{fmtPace(pace, miles)}</div>
                <div className="wk-lab">Pace</div>
              </div>
              {steps > 0 && (
                <div>
                  <div className="wk-val">{fmtSteps(steps)}</div>
                  <div className="wk-lab">Steps</div>
                </div>
              )}
            </div>

            {/* Self-drawn route map (free — no tiles) */}
            <div className="wk-map">
              {path ? (
                <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
                  <path d={path} fill="none" stroke="var(--blue)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
                  {(() => {
                    const proj = projectPoints(pts, W, H)
                    const last = proj[proj.length - 1]
                    return last ? <circle cx={last.x} cy={last.y} r={6} fill="var(--sage-deep)" stroke="#fff" strokeWidth={2} /> : null
                  })()}
                </svg>
              ) : (
                <div className="wk-map-empty">
                  {gpsErr ? '📍 No route — timing only' : '📡 Acquiring GPS…'}
                  {accuracy != null && !gpsErr && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>±{Math.round(accuracy)} m</div>}
                </div>
              )}
            </div>

            {gpsErr && <div className="insight support" style={{ marginTop: 8 }}><span className="ic">📍</span><span>{gpsErr}</span></div>}

            <div className="wk-controls">
              {phase === 'tracking' ? (
                <button className="btn ghost" onClick={pause}>⏸ Pause</button>
              ) : (
                <button className="btn" onClick={resume}>▶ Resume</button>
              )}
              <button className="btn danger" onClick={finish}>⏹ Finish</button>
            </div>
          </>
        )}

        {phase === 'done' && saved && (
          <>
            <div className="center">
              <div style={{ fontSize: 40 }}>🎉</div>
              <h2 style={{ marginTop: 4 }}>{meta.label} complete!</h2>
              <p className="soft">Logged to your movement — that’s real evidence you’re becoming healthier.</p>
            </div>
            <div className="wk-stats" style={{ marginTop: 6 }}>
              <div><div className="wk-val">{fmtDuration(saved.durationSec)}</div><div className="wk-lab">Time</div></div>
              <div><div className="wk-val">{fmtDistance(saved.distanceM, miles)}</div><div className="wk-lab">Distance</div></div>
              <div><div className="wk-val">{fmtPace(saved.paceSecPerKm, miles)}</div><div className="wk-lab">Pace</div></div>
              {estimateSteps(saved.distanceM, saved.type) > 0 && (
                <div><div className="wk-val">{fmtSteps(estimateSteps(saved.distanceM, saved.type))}</div><div className="wk-lab">Steps</div></div>
              )}
            </div>
            {routePath(saved.points, W, H) && (
              <div className="wk-map" style={{ marginTop: 10 }}>
                <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
                  <path d={routePath(saved.points, W, H)} fill="none" stroke="var(--blue)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
            <button className="btn" style={{ marginTop: 14 }} onClick={onClose}>Done</button>
          </>
        )}
      </div>
    </div>
  )
}
