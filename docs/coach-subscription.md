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
3. Turn on subscription mode for the backend and start it:
   ```bash
   COACH_MODE=subscription npm run server
   ```
   On startup you'll see: `Coach: subscription (Claude Code CLI)`.

That's it. In the app, **Settings → AI coach** will read
**"Live Claude coach (your subscription)"**.

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
