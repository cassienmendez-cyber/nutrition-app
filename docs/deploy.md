# Deploying Bloom (free)

The app is local-first, so the **static site alone is fully usable on your phone**
— your data lives in the browser, the coach falls back to its offline engine, and
reminders work while the app is open. (For the live Claude-subscription coach and
push-when-closed, run the backend at home — see `coach-subscription.md` and
`push-notifications.md`.)

## GitHub Pages (set up in this repo)

The built site is published to the **`gh-pages`** branch (the workflow at
`.github/workflows/deploy.yml` rebuilds and updates it on every push).

**One-time setup** (GitHub can't enable Pages for you automatically):

1. Repo → **Settings → Pages**.
2. **Build and deployment → Source → Deploy from a branch**.
3. Branch: **`gh-pages`**, folder: **`/ (root)`** → **Save**.

Give it ~1 minute, then it's live at:

> **https://cassienmendez-cyber.github.io/nutrition-app/**

On your phone: open that URL, then **Add to Home Screen** to install it as an
app (offline support, full-screen, app icon).

The build uses a relative base (`base: './'` in `vite.config.ts`) so it works at
the Pages sub-path and at a root domain alike — no code changes needed if you
later move it to Netlify/Vercel/Cloudflare Pages.
