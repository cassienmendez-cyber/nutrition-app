# Deploying Bloom (free)

The app is local-first, so the **static site alone is fully usable on your phone**
— your data lives in the browser, the coach falls back to its offline engine, and
reminders work while the app is open. (For the live Claude-subscription coach and
push-when-closed, run the backend at home — see `coach-subscription.md` and
`push-notifications.md`.)

## GitHub Pages (set up in this repo)

A workflow at `.github/workflows/deploy.yml` builds the app and publishes it to
GitHub Pages on every push to `main` (and the dev branch). It **auto-enables
Pages** on the first run, so there's nothing to click.

- Live URL: **https://cassienmendez-cyber.github.io/nutrition-app/**
- Watch the run: the repo's **Actions** tab → "Deploy to GitHub Pages".

On your phone: open that URL in the browser, then **Add to Home Screen** to
install it as an app (offline support, full-screen, app icon).

The build uses a relative base (`base: './'` in `vite.config.ts`) so it works at
the Pages sub-path and at a root domain alike — no code changes needed if you
later move it to Netlify/Vercel/Cloudflare Pages.
