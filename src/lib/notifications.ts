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
  water: boolean
  waterIntervalHours: number
  checkIn: boolean
  checkInTime: string // 'HH:MM'
}

const KEY = 'bloom.reminders.v1'
const FIRED_KEY = 'bloom.reminders.fired.v1'

export const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: false,
  prenatal: true,
  prenatalTime: '09:00',
  water: true,
  waterIntervalHours: 3,
  checkIn: true,
  checkInTime: '20:00',
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
      await navigator.serviceWorker.register('/sw.js')
    } catch {
      /* ignore — notifications still work via the Notification constructor */
    }
  }
}

export async function showNotification(title: string, body: string) {
  if (permission() !== 'granted') return
  const opts: NotificationOptions = {
    body,
    icon: '/icon.png',
    badge: '/icon.png',
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

function tick() {
  const r = loadReminders()
  if (!r.enabled || permission() !== 'granted') return
  const now = hhmmNow()
  const hour = new Date().getHours()

  if (r.prenatal && now === r.prenatalTime && !firedToday('prenatal')) {
    markFired('prenatal')
    showNotification('💊 Prenatal reminder', 'A quiet daily win — take your prenatal when you can.')
  }

  if (r.checkIn && now === r.checkInTime && !firedToday('checkin')) {
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
