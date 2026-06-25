# Phone reminders (Web Push)

Bloom can send **eat / exercise / prenatal / check-in** reminders to your phone
**even when the app is closed**, using the free, browser-native Web Push API.
No paid push service — the browser's own push service delivers them; the Bloom
backend just sends each reminder at the scheduled minute.

## How it works

- **Local reminders** (the default) fire only while Bloom is open in a tab/PWA.
  This needs no server and works out of the box.
- **Phone push** (fires when closed) needs the backend configured with **VAPID**
  keys. The browser subscribes, sends its push subscription + your reminder
  times to the server, and the server pushes each reminder at the right minute
  (using the timezone the device reported).

If VAPID keys aren't set, the "Turn on" button explains that and Bloom keeps
using local reminders — nothing breaks.

## Setup (free)

1. Install deps (adds `web-push`):
   ```bash
   npm install
   ```
2. Generate a VAPID key pair:
   ```bash
   npm run vapid
   ```
3. Put the output in the server environment (e.g. `.env` or your host's config):
   ```
   VAPID_PUBLIC_KEY=...
   VAPID_PRIVATE_KEY=...
   VAPID_SUBJECT=mailto:you@example.com
   ```
4. Run the backend (serves `/api/push/*` alongside the coach):
   ```bash
   npm run server
   ```
   The frontend calls `/api/...` on the same origin, so deploy the static app
   and the backend behind one origin (or proxy `/api` to the backend).

That's it. In **Settings → Gentle reminders → 📱 Phone reminders**, tap **Turn
on**, then **Send a test to my phone** to confirm the loop.

## Platform notes

- **HTTPS is required** for service workers / push (localhost is exempt for dev).
  Any real deploy (Vercel/Netlify/Render/etc.) is HTTPS.
- **iPhone (iOS 16.4+):** Web Push only works for a PWA added to the Home
  Screen. In Safari: **Share → Add to Home Screen**, open Bloom from the icon,
  then turn on phone reminders. The UI detects this and tells the user.
- **Android/Chrome:** works once notification permission is granted (installing
  the PWA is recommended but not required).

## Keeping the scheduler alive

The server checks once every 30s and sends due reminders. If your host sleeps
idle processes (some free tiers do), point a **free external cron**
(e.g. cron-job.org) at:

```
POST https://your-host/api/push/tick
```

every minute. Protect it by setting `PUSH_TICK_TOKEN` and sending
`Authorization: Bearer <token>`.

## Privacy

Push subscriptions + your reminder times are stored server-side in
`server/push-subscriptions.json` (gitignored). No health data is sent — only the
reminder times and the notification text. Turning reminders off removes the
subscription.
