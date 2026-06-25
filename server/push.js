import webpush from 'web-push'
import fs from 'node:fs'
import path from 'node:path'

// ---------------------------------------------------------------------------
// Web Push for Bloom reminders — fires "eat" / "exercise" / etc. on the user's
// phone even when the app is closed. Free: Web Push goes through the browser's
// own push service; we just need VAPID keys + a once-a-minute check.
//
// Configure via env:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  (generate with `npm run vapid`)
//   VAPID_SUBJECT      (mailto: or https: contact, optional)
//   PUSH_STORE         (path to the subscriptions JSON, optional)
//   PUSH_TICK_TOKEN    (bearer token to protect /api/push/tick, optional)
//
// If VAPID keys aren't set, the endpoints return 503 and the frontend keeps
// using its local (app-open) reminder scheduler — so nothing breaks.
// ---------------------------------------------------------------------------

const PUBLIC = process.env.VAPID_PUBLIC_KEY
const PRIVATE = process.env.VAPID_PRIVATE_KEY
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:reminders@bloom.app'
const enabled = !!(PUBLIC && PRIVATE)
if (enabled) webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE)

const FILE = process.env.PUSH_STORE || path.join(process.cwd(), 'server', 'push-subscriptions.json')

// store: { [endpoint]: { subscription, items:[{time,title,body,tag,url}], tzOffset } }
let store = {}
function loadStore() {
  try {
    store = JSON.parse(fs.readFileSync(FILE, 'utf8'))
  } catch {
    store = {}
  }
}
function saveStore() {
  try {
    fs.writeFileSync(FILE, JSON.stringify(store))
  } catch (err) {
    console.error('push: could not persist subscriptions:', err?.message || err)
  }
}
loadStore()

// Dedupe: endpoint|tag -> 'YYYY-MM-DD HH:MM' of the last send.
const fired = new Map()

// The user's local time, derived from the tzOffset they sent (minutes, as from
// JS getTimezoneOffset(): localTime = UTC - offset).
export function localStamp(tzOffsetMin, nowMs = Date.now()) {
  const local = new Date(nowMs - tzOffsetMin * 60000)
  const hh = String(local.getUTCHours()).padStart(2, '0')
  const mm = String(local.getUTCMinutes()).padStart(2, '0')
  return { hhmm: `${hh}:${mm}`, day: local.toISOString().slice(0, 10) }
}

async function sendTo(endpoint, rec, payload) {
  try {
    await webpush.sendNotification(rec.subscription, JSON.stringify(payload))
  } catch (err) {
    // 404/410 = the subscription expired or was revoked — drop it.
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      delete store[endpoint]
      saveStore()
    }
  }
}

export function tick(nowMs = Date.now()) {
  if (!enabled) return
  for (const [endpoint, rec] of Object.entries(store)) {
    const tz = typeof rec.tzOffset === 'number' ? rec.tzOffset : 0
    const { hhmm, day } = localStamp(tz, nowMs)
    for (const it of rec.items || []) {
      if (it.time !== hhmm) continue
      const key = `${endpoint}|${it.tag}`
      const stamp = `${day} ${hhmm}`
      if (fired.get(key) === stamp) continue // already sent this minute
      fired.set(key, stamp)
      sendTo(endpoint, rec, { title: it.title, body: it.body, tag: it.tag, url: it.url || '/' })
    }
  }
}

function sanitizeItems(items) {
  if (!Array.isArray(items)) return []
  return items
    .slice(0, 12)
    .filter((it) => it && typeof it.time === 'string' && /^\d{2}:\d{2}$/.test(it.time))
    .map((it) => ({
      time: it.time,
      title: String(it.title || '🌱 Bloom').slice(0, 80),
      body: String(it.body || '').slice(0, 160),
      tag: String(it.tag || 'bloom').slice(0, 40),
      url: typeof it.url === 'string' ? it.url.slice(0, 200) : '/',
    }))
}

export function mountPush(app) {
  app.get('/api/push/key', (_req, res) => {
    if (!enabled) return res.status(503).json({ error: 'push_not_configured' })
    res.json({ key: PUBLIC })
  })

  app.post('/api/push/subscribe', (req, res) => {
    if (!enabled) return res.status(503).json({ error: 'push_not_configured' })
    const { subscription, items, tzOffset } = req.body ?? {}
    if (!subscription || typeof subscription.endpoint !== 'string') {
      return res.status(400).json({ error: 'bad_subscription' })
    }
    store[subscription.endpoint] = {
      subscription,
      items: sanitizeItems(items),
      tzOffset: Number.isFinite(tzOffset) ? Number(tzOffset) : 0,
    }
    saveStore()
    res.json({ ok: true, count: store[subscription.endpoint].items.length })
  })

  app.post('/api/push/unsubscribe', (req, res) => {
    const { endpoint } = req.body ?? {}
    if (endpoint && store[endpoint]) {
      delete store[endpoint]
      saveStore()
    }
    res.json({ ok: true })
  })

  app.post('/api/push/test', async (req, res) => {
    if (!enabled) return res.status(503).json({ error: 'push_not_configured' })
    const { subscription } = req.body ?? {}
    if (!subscription || typeof subscription.endpoint !== 'string') {
      return res.status(400).json({ error: 'bad_subscription' })
    }
    try {
      await webpush.sendNotification(
        subscription,
        JSON.stringify({ title: '🌱 Reminders are on', body: 'This is a test — your phone reminders are working!', tag: 'test', url: '/' }),
      )
      res.json({ ok: true })
    } catch (err) {
      res.status(502).json({ error: 'send_failed', detail: err?.statusCode })
    }
  })

  // Let a free external cron (e.g. cron-job.org) drive the scheduler if the host
  // sleeps idle processes. Optionally protected by PUSH_TICK_TOKEN.
  app.post('/api/push/tick', (req, res) => {
    const token = process.env.PUSH_TICK_TOKEN
    if (token && req.get('authorization') !== `Bearer ${token}`) {
      return res.status(401).json({ error: 'unauthorized' })
    }
    tick()
    res.json({ ok: true })
  })

  // In-process scheduler — checks every 30s so we don't miss a minute.
  if (enabled) {
    setInterval(() => tick(), 30000).unref?.()
  }
  return enabled
}

export function pushEnabled() {
  return enabled
}
