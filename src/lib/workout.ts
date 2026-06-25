// GPS workout tracking — all free, browser-native (Geolocation API). No paid
// map tiles: we trace the route ourselves as an SVG path. Staying true to the
// app's philosophy, we track distance / time / pace / route — never calories.

export type ActivityType = 'walk' | 'run' | 'bike' | 'other'

export interface GpsPoint {
  lat: number
  lng: number
  t: number // ms timestamp
}

export interface Workout {
  id: string
  type: ActivityType
  start: number // ms
  end: number // ms
  durationSec: number // active seconds (excludes paused time)
  distanceM: number
  paceSecPerKm: number // 0 if no distance
  points: GpsPoint[]
  gps: boolean // false = indoor / timer-only
}

export const ACTIVITIES: { type: ActivityType; emoji: string; label: string }[] = [
  { type: 'walk', emoji: '🚶', label: 'Walk' },
  { type: 'run', emoji: '🏃', label: 'Run' },
  { type: 'bike', emoji: '🚴', label: 'Bike' },
  { type: 'other', emoji: '🤸', label: 'Other' },
]

export function activityMeta(type: ActivityType) {
  return ACTIVITIES.find((a) => a.type === type) ?? ACTIVITIES[0]
}

// Great-circle distance between two coordinates, in metres (Haversine).
export function haversine(a: GpsPoint, b: GpsPoint): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

// Total distance of a path, ignoring tiny GPS jitter so we don't inflate it.
export function pathDistance(points: GpsPoint[], minStepM = 2): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const d = haversine(points[i - 1], points[i])
    if (d >= minStepM) total += d
  }
  return total
}

// ---- formatting ----------------------------------------------------------

export function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${m}:${pad(ss)}`
}

export function fmtDistance(meters: number, miles = true): string {
  if (miles) {
    const mi = meters / 1609.344
    return `${mi.toFixed(mi < 10 ? 2 : 1)} mi`
  }
  const km = meters / 1000
  return `${km.toFixed(km < 10 ? 2 : 1)} km`
}

// Pace as min/mi (or min/km), from seconds-per-km.
export function fmtPace(secPerKm: number, miles = true): string {
  if (!secPerKm || !isFinite(secPerKm)) return '—'
  const secPerUnit = miles ? secPerKm * 1.609344 : secPerKm
  const m = Math.floor(secPerUnit / 60)
  const s = Math.round(secPerUnit % 60)
  return `${m}:${String(s).padStart(2, '0')}/${miles ? 'mi' : 'km'}`
}

export function paceSecPerKm(distanceM: number, durationSec: number): number {
  if (distanceM < 5 || durationSec <= 0) return 0
  return durationSec / (distanceM / 1000)
}

// Rough step estimate from distance & activity (free — no pedometer needed).
// Stride lengths are averages; biking returns 0 (not step-based).
export function estimateSteps(distanceM: number, type: ActivityType): number {
  if (type === 'bike' || distanceM < 1) return 0
  const stride = type === 'run' ? 1.05 : 0.74 // metres per step
  return Math.round(distanceM / stride)
}

export function fmtSteps(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n)
}

// Project GPS points into x/y pixels that fit a w×h box, preserving aspect
// (free self-drawn map — no tiles). Equirectangular, scaled by latitude.
export function projectPoints(points: GpsPoint[], w: number, h: number, pad = 8): { x: number; y: number }[] {
  if (points.length < 1) return []
  const lat0 = (points[0].lat * Math.PI) / 180
  const xs = points.map((p) => p.lng * Math.cos(lat0))
  const ys = points.map((p) => p.lat)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanX = Math.max(1e-9, maxX - minX)
  const spanY = Math.max(1e-9, maxY - minY)
  const scale = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanY)
  const offX = (w - spanX * scale) / 2
  const offY = (h - spanY * scale) / 2
  return points.map((p) => ({
    x: offX + (p.lng * Math.cos(lat0) - minX) * scale,
    y: h - (offY + (p.lat - minY) * scale), // invert: north is up
  }))
}

// Build an SVG polyline path that fits the route into a w×h box.
export function routePath(points: GpsPoint[], w: number, h: number, pad = 8): string {
  if (points.length < 2) return ''
  return projectPoints(points, w, h, pad)
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')
}

// ---- preferences ---------------------------------------------------------

const UNIT_KEY = 'bloom.units.v1'
export type Units = 'mi' | 'km'

export function getUnits(): Units {
  try {
    return localStorage.getItem(UNIT_KEY) === 'km' ? 'km' : 'mi'
  } catch {
    return 'mi'
  }
}
export function setUnits(u: Units): void {
  try {
    localStorage.setItem(UNIT_KEY, u)
  } catch {
    /* ignore */
  }
}

const AUTOPAUSE_KEY = 'bloom.autopause.v1'
export function getAutoPause(): boolean {
  try {
    return localStorage.getItem(AUTOPAUSE_KEY) !== 'off' // default on
  } catch {
    return true
  }
}
export function setAutoPause(on: boolean): void {
  try {
    localStorage.setItem(AUTOPAUSE_KEY, on ? 'on' : 'off')
  } catch {
    /* ignore */
  }
}

// ---- persistence (own localStorage key — no AppState migration needed) ----

const KEY = 'bloom.workouts.v1'

export function loadWorkouts(): Workout[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function saveWorkout(w: Workout): Workout[] {
  const all = [w, ...loadWorkouts()].slice(0, 100) // keep the last 100
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
  return all
}

export function deleteWorkout(id: string): Workout[] {
  const all = loadWorkouts().filter((w) => w.id !== id)
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
  return all
}
