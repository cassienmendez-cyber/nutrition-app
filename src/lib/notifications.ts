// Local reminder notifications: prenatal, water, and a gentle daily check-in.
//
// These are *local* reminders — they fire while Bloom is open in a tab (or
// installed as a PWA and running). True push-when-closed needs a push server +
// VAPID keys, which is out of scope for this local-first build; the UI is honest
// about that. Reminders use the service worker's showNotification when available
// so they render correctly across platforms.

export interface ReminderSettings {
  enabled: boolean
  prenatal: boolean
  prenatalTime: string // 'HH:MM'
  eat: boolean
  eatTimes: string[] // meal nudge times 'HH:MM'
  exercise: boolean
  exerciseTime: string // 'HH:MM'
  water: boolean
  waterIntervalHours: number
  checkIn: boolean
  checkInTime: string // 'HH:MM'
  petCare: boolean // nudge when the companion's meters run low
  quietHours: boolean // suppress all reminders overnight
  quietStart: string // 'HH:MM' (start of the quiet window)
  quietEnd: string // 'HH:MM' (end of the quiet window, next morning)
}

const KEY = 'bloom.reminders.v1'
const FIRED_KEY = 'bloom.reminders.fired.v1'
const PUSH_KEY = 'bloom.push.v1' // stores the active push endpoint when subscribed

export const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: false,
  prenatal: true,
  prenatalTime: '09:00',
  eat: true,
  eatTimes: ['08:00', '12:30', '18:30'],
  exercise: true,
  exerciseTime: '17:30',
  water: true,
  waterIntervalHours: 3,
  checkIn: true,
  checkInTime: '20:00',
  petCare: true,
  quietHours: true,
  quietStart: '21:30',
  quietEnd: '07:00',
}

// Is 'HH:MM' inside the quiet window? Handles overnight wrap (start > end).
export function inQuietHours(hhmm: string, start: string, end: string): boolean {
  const toMin = (s: string) => {
    const [h, m] = s.split(':').map(Number)
    return h * 60 + m
  }
  const t = toMin(hhmm)
  const s = toMin(start)
  const e = toMin(end)
  if (s === e) return false // zero-length window
  return s < e ? t >= s && t < e : t >= s || t < e
}

export function loadReminders(): ReminderSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULT_REMINDERS, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return DEFAULT_REMINDERS
}

export function saveReminders(r: ReminderSettings) {
  localStorage.setItem(KEY, JSON.stringify(r))
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function permission(): NotificationPermission {
  return notificationsSupported() ? Notification.permission : 'denied'
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

export async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      // BASE_URL makes this work at root and at a project sub-path (GitHub Pages).
      await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
    } catch {
      /* ignore — notifications still work via the Notification constructor */
    }
  }
}

export async function showNotification(title: string, body: string) {
  if (permission() !== 'granted') return
  const opts: NotificationOptions = {
    body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: title,
  }
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.ready : null
    if (reg) reg.showNotification(title, opts)
    else new Notification(title, opts)
  } catch {
    try {
      new Notification(title, opts)
    } catch {
      /* ignore */
    }
  }
}

// --- Scheduler -------------------------------------------------------------
// Runs while the app is open. Checks once a minute and fires each reminder at
// most once per day (tracked in localStorage so a refresh doesn't re-fire).

let timer: number | null = null

function firedToday(id: string): boolean {
  try {
    const raw = JSON.parse(localStorage.getItem(FIRED_KEY) || '{}')
    return raw[id] === new Date().toDateString()
  } catch {
    return false
  }
}

function markFired(id: string) {
  let raw: Record<string, string> = {}
  try {
    raw = JSON.parse(localStorage.getItem(FIRED_KEY) || '{}')
  } catch {
    /* ignore */
  }
  raw[id] = new Date().toDateString()
  localStorage.setItem(FIRED_KEY, JSON.stringify(raw))
}

function hhmmNow(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// Read the persisted pet so the scheduler can nudge when its meters run low.
import { settlePet } from './pet'
const PETCARE_KEY = 'bloom.petcare.last.v1'

function readPet(): { name: string; fullness: number; hydration: number; lastTick: number } | null {
  try {
    const raw = localStorage.getItem('bloom.state.v1')
    if (!raw) return null
    const s = JSON.parse(raw)
    return s?.pet ?? null
  } catch {
    return null
  }
}

function petCareFiredRecently(ms: number): boolean {
  try {
    const last = Number(localStorage.getItem(PETCARE_KEY) || 0)
    return Date.now() - last < ms
  } catch {
    return false
  }
}

function tick() {
  const r = loadReminders()
  if (!r.enabled || permission() !== 'granted') return
  const now = hhmmNow()
  const hour = new Date().getHours()

  // Overnight quiet hours: stay silent entirely inside the window.
  if (r.quietHours && inQuietHours(now, r.quietStart, r.quietEnd)) return

  // When Web Push is active, the SERVER fires the timed reminders (so they work
  // even with the app closed). Skip them locally to avoid double-notifying.
  const pushOn = pushActive()

  if (!pushOn && r.prenatal && now === r.prenatalTime && !firedToday('prenatal')) {
    markFired('prenatal')
    showNotification('💊 Prenatal reminder', 'A quiet daily win — take your prenatal when you can.')
  }

  if (!pushOn && r.eat) {
    r.eatTimes.forEach((t, i) => {
      if (now === t && !firedToday(`eat-${i}`)) {
        markFired(`eat-${i}`)
        showNotification('🍎 Time to nourish', 'A protein-forward bite keeps your energy steady. No rules — just fuel. 💚')
      }
    })
  }

  if (!pushOn && r.exercise && now === r.exerciseTime && !firedToday('exercise')) {
    markFired('exercise')
    showNotification('🤸 Movement time', 'Even 10 gentle minutes counts. Tap to track a walk?')
  }

  if (!pushOn && r.checkIn && now === r.checkInTime && !firedToday('checkin')) {
    markFired('checkin')
    showNotification('🌱 How was today?', 'Tell your coach about your day — no judgment, just a check-in.')
  }

  // Water: fire on the interval during waking hours (8:00–21:00).
  if (r.water && hour >= 8 && hour <= 21) {
    const slot = `water-${Math.floor(hour / r.waterIntervalHours)}`
    if (now.endsWith(':00') && hour % r.waterIntervalHours === 0 && !firedToday(slot)) {
      markFired(slot)
      showNotification('💧 Water break', 'A glass of water counts. Small kind choices add up.')
    }
  }

  // Companion needs: nudge at most once every 4 hours, daytime only.
  if (r.petCare && hour >= 8 && hour <= 21 && !petCareFiredRecently(4 * 3_600_000)) {
    const pet = readPet()
    if (pet) {
      const s = settlePet({ ...pet } as Parameters<typeof settlePet>[0], Date.now())
      if (s.fullness < 22 || s.hydration < 22) {
        try {
          localStorage.setItem(PETCARE_KEY, String(Date.now()))
        } catch {
          /* ignore */
        }
        showNotification(`🥺 ${pet.name} needs you`, 'A snack or some water from the Pantry would help them grow.')
      }
    }
  }
}

export function startReminderScheduler() {
  stopReminderScheduler()
  // Check every 30s so we don't miss the minute boundary.
  timer = window.setInterval(tick, 30000)
  tick()
}

export function stopReminderScheduler() {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
}

// --- Web Push (reminders that fire even when the app is closed) -------------
// Needs the backend configured with VAPID keys. If it isn't, these helpers
// fail gracefully and the local scheduler above keeps working while open.

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

// Is the app running as an installed PWA? (Required for Web Push on iOS.)
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari exposes this non-standard flag.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function pushActive(): boolean {
  try {
    return !!localStorage.getItem(PUSH_KEY)
  } catch {
    return false
  }
}

function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const buf = new ArrayBuffer(raw.length)
  const out = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return buf
}

// The exact reminders we hand to the server, with their messages baked in so
// the backend stays a dumb scheduler. Times are local 'HH:MM'.
export interface PushItem {
  time: string
  title: string
  body: string
  tag: string
  url: string
}

export function pushItems(r: ReminderSettings): PushItem[] {
  const items: PushItem[] = []
  if (r.prenatal) items.push({ time: r.prenatalTime, title: '💊 Prenatal reminder', body: 'A quiet daily win — take your prenatal when you can.', tag: 'prenatal', url: '/' })
  if (r.eat) r.eatTimes.forEach((t, i) => items.push({ time: t, title: '🍎 Time to nourish', body: 'A protein-forward bite keeps your energy steady. No rules — just fuel. 💚', tag: `eat-${i}`, url: '/' }))
  if (r.exercise) items.push({ time: r.exerciseTime, title: '🤸 Movement time', body: 'Even 10 gentle minutes counts. Tap to track a walk?', tag: 'exercise', url: '/' })
  if (r.checkIn) items.push({ time: r.checkInTime, title: '🌱 How was today?', body: 'Tell your coach about your day — no judgment, just a check-in.', tag: 'checkin', url: '/' })
  // Drop anything inside the overnight quiet window so the phone stays silent.
  return r.quietHours ? items.filter((it) => !inQuietHours(it.time, r.quietStart, r.quietEnd)) : items
}

// Does the backend have push configured? Returns the VAPID public key or null.
export async function pushServerKey(): Promise<string | null> {
  try {
    const res = await fetch('/api/push/key')
    if (!res.ok) return null
    const data = await res.json()
    return typeof data?.key === 'string' && data.key ? data.key : null
  } catch {
    return null
  }
}

export type PushResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'needs-install' | 'denied' | 'no-server' | 'error' }

// Turn on phone push: request permission, subscribe, and register the schedule
// with the server. Safe to call repeatedly (it re-syncs the schedule).
export async function enablePush(r: ReminderSettings): Promise<PushResult> {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' }
  // iOS only allows Web Push from an installed (Home Screen) PWA.
  if (isIOS() && !isStandalone()) return { ok: false, reason: 'needs-install' }

  const key = await pushServerKey()
  if (!key) return { ok: false, reason: 'no-server' }

  const perm = await requestPermission()
  if (perm !== 'granted') return { ok: false, reason: 'denied' }

  try {
    await registerServiceWorker()
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(key),
      })
    }
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: sub,
        items: pushItems(r),
        tzOffset: new Date().getTimezoneOffset(), // minutes; local = UTC - offset
      }),
    })
    if (!res.ok) return { ok: false, reason: 'error' }
    try {
      localStorage.setItem(PUSH_KEY, sub.endpoint)
    } catch {
      /* ignore */
    }
    return { ok: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

// Re-send the schedule to the server (call after the user edits reminder times).
export async function syncPush(r: ReminderSettings): Promise<void> {
  if (!pushActive()) return
  await enablePush(r)
}

export async function disablePush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => {})
      await sub.unsubscribe().catch(() => {})
    }
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(PUSH_KEY)
  } catch {
    /* ignore */
  }
}

// Fire a test push right now through the server, to confirm the loop works.
export async function sendTestPush(): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return false
    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub }),
    })
    return res.ok
  } catch {
    return false
  }
}
