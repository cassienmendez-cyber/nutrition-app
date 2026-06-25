# Use your Claude subscription for the coach (no API charges)

The coach can run in **subscription mode** — it drives the **Claude Code CLI**
(`claude -p`) instead of the metered Anthropic API. Because the CLI signs in
with your **Claude subscription (Pro/Max)** by default, coach replies and weekly
reviews come out of the plan you already pay for, not API credits.

## Setup

1. Install the Claude Code CLI (once), on the machine that runs the backend:
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```
2. Sign in with your **subscription** (not an API key):
   ```bash
   claude            # opens an interactive session
   /login            # choose "Claude account with subscription"
   ```
   (Or run `claude` once and follow the login prompt.)
3. Build the app and start the backend in subscription mode — one command:
   ```bash
   npm run coach
   ```
   This builds the app, then starts the server with `--subscription`. It serves
   **both** the app and `/api` on one origin (default http://localhost:8787), so
   there's no CORS or API-base setup. On startup you'll see:
   `Coach: subscription (Claude Code CLI) · App served at http://localhost:8787`.

That's it. Open that URL, and in **Settings → AI coach** you'll see
**"Live Claude coach (your subscription) — no API charges"**.

> Prefer the env var? `COACH_MODE=subscription npm run server` works too
> (the `--subscription` flag is just a cross-platform convenience).

## Using it on your phone

The **Claude phone app cannot power the coach** — it's separate from the Claude
Code CLI. The backend has to run on a computer where you've run `claude /login`
(your laptop or a home server). To reach it from your phone, expose that one
URL with a free tunnel, then open the tunnel URL on your phone and **Add to Home
Screen**:

```bash
# 1) start the app + coach (serves everything on :8787)
npm run coach

# 2) in another terminal, expose it for free (pick one):
npx cloudflared tunnel --url http://localhost:8787      # Cloudflare (no account)
# or Tailscale: `tailscale serve 8787` if your phone is on your tailnet
```

Open the printed https URL on your phone. Because the server serves the app and
`/api` together, the coach (your subscription) and push all work through that
single URL. Keep the laptop/server awake while you use it.

## How it picks a path

The backend resolves the coach in this order:

1. **Subscription** — if `COACH_MODE=subscription` (or `cli`). Uses the logged-in
   CLI. We strip `ANTHROPIC_API_KEY` from the CLI's environment so it always uses
   your subscription's OAuth, never API billing. If a CLI call fails and an API
   key is also configured, it falls back to the API.
2. **API** — if `ANTHROPIC_API_KEY` is set (and subscription mode is off).
3. **Offline** — neither configured: the app uses its built-in compassionate
   rule-based coach, so it always works.

## Options

- `COACH_MODE=subscription` (or `cli`) — enable subscription mode.
- `COACH_MODEL=...` — optional model override (e.g. a specific Claude model).
  Omit to use your CLI's default model for your plan.
- `CLAUDE_BIN=/path/to/claude` — if `claude` isn't on the server's `PATH`.

## Notes & limits

- The backend must run **where the CLI is logged in** (your own machine, a home
  server, or a VM where you ran `claude /login`). A typical stateless cloud host
  won't have your subscription session.
- This is intended for **personal use** — you using your own Claude subscription
  to power your own app. Each request is a single, short, non-interactive
  completion (no tools, run in an empty temp directory).
- Subscription usage counts against your plan's normal limits.
