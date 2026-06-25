# 🌱 Bloom

**A compassion-first health companion for the journey to conceive.**

Bloom is *not* another calorie tracker. The market is full of apps that shame
you for eating "12 almonds too many." Bloom is built on a different philosophy:

> You are not chasing perfection. You are building evidence that you're becoming
> the healthiest version of yourself while trying to conceive.

It celebrates protein, movement, sleep, water, managing stress, and preparing
for pregnancy — instead of yelling *"You have 237 calories left."*

---

## What makes it different

| Most fitness apps | Bloom |
| --- | --- |
| Count calories | Notices **patterns** in how & why you eat |
| "What workout are you doing?" | "**How does your body feel today?**" |
| Skip exercise when you hurt | **Reroutes** around pain — it still counts |
| Streaks that break and shame you | A **plant** that grows with momentum and never wilts |
| "You were bad today" | "**It's data, not a verdict.**" |
| Weight on a scale | A **Pregnancy Preparation Score** |

## Features

- **🐸 Raise a companion (the game)** — caring for yourself earns **points**,
  weighted by *quality*: a protein- and veg-rich meal eaten at comfortable
  hunger beats a plain one; more movement earns more (up to a kind cap); water,
  sleep, prenatal, cycle-logging and coach check-ins all count — and even a hard
  day handled with self-compassion earns. Spend points in the **Pantry** on food
  and water to feed a creature that **physically evolves**, Pokémon-style,
  through six life stages — **Baby → Toddler → Adolescent → Young Adult → Adult
  → Elder**. Each stage needs its *own* fresh pool of points (100 → 150 → 200 →
  300 → 500), not a running total. Pick and name one of **five species** (Sprout,
  Frog, Finn, Dragon, Birdie), each drawn as a custom SVG that grows limbs and a
  signature feature and earns spectacles as an Elder. Feeding plays a cute care
  animation (bounce, hearts, sparkles, happy face + a haptic buzz), and there's
  a celebration each time it evolves. It only ever grows and never dies — at
  most it gets a little sleepy until you feed it. No guilt, ever.
- **Dashboard** — your companion front and centre, today's points and how you
  earned them, plus Recovery / Nutrition / Movement / Water / Sleep / Stress and
  your Cycle Day. No calories.
- **Pain-first Exercise engine** — pick how your body feels and flag any pain
  (ankle, knee, hip, back, neck…). Bloom reroutes to seated, band, mobility, or
  stretch work so movement never depends on a pain-free body.
- **Pattern-based Nutrition** — log meals (not calories), a hunger scale (1–10),
  and *what led to eating* (stress, bored, celebration, hungry…). Bloom surfaces
  gentle patterns: *"You've skipped breakfast 3 days this week."*
- **Fertility Mode** — cycle tracking, ovulation prediction, fertile-window
  forecasting, cervical mucus / BBT / mood / intimacy logging, prenatal & water
  reminders, blood pressure.
- **Grocery Intelligence** — "I have $120" → a protein-forward week of meals plus
  a costed shopping list that fits the budget.
- **Smart Meal Suggestions** — "What sounds good?" (chicken, pasta, comfort,
  high-protein, cheap…) → fertility-friendly ideas, not a wall of recipes.
- **Momentum, not streaks** — a little plant that grows with every healthy
  choice and simply pauses (never dies) on a missed day.
- **Trophies & goals** — a visual **Goals** tab with tiered 🥉🥈🥇 trophies, each
  with a progress bar toward the next tier, an "almost there" highlight, a
  next-trophy ring on the dashboard, and a celebration when you unlock one.
  Every trophy is *cumulative* — a quiet day never takes one away.
- **Trends** — 14-day sparklines (protein, movement, water, sleep) plus an
  editable day-by-day history so you can fill in or fix past days.
- **AI-style Coach** — an audio-first check-in. Say *"I skipped breakfast, my
  ankle hurts, work was stressful, and all I want is ice cream"* and get
  practical, non-judgmental coaching back.
- **The "Bad Day" button** — overwhelmed? Tap 🫶 and the day shrinks to four
  essentials: water, one protein, five minutes of movement, your prenatal.
- **Weekly AI Review** — a Sunday narrative ("…you consistently hit your protein
  goal but skipped lunch four days, which may explain your evening cravings…")
  plus a celebration of real **Wins** that aren't weight.

## Tech

- **React 18 + TypeScript + Vite** — fast, modern, zero-config.
- **Local-first** — all data lives in `localStorage`; nothing leaves the device.
  The app ships with two weeks of demo history so every screen feels alive on
  first open.
- **Live Claude coach, with an offline fallback** — the conversational check-in
  and the Sunday review call a small backend ([`server/index.js`](server/index.js))
  that talks to Claude (`claude-opus-4-8`) with a compassion-first system prompt.
  The API key stays server-side, never in the browser. If the backend is down or
  has no key, the app **transparently falls back** to a readable rule engine in
  [`src/lib/coach.ts`](src/lib/coach.ts), so it's always fully functional. The
  Settings screen shows which mode you're in.
- **Reminder notifications** — gentle, opt-in nudges for your prenatal, water,
  and an evening check-in (no streaks, no nagging), via the Notifications API and
  a service worker. They fire while the app is open; install it to your home
  screen for the best experience.
- **Your data, yours** — one-tap JSON backup/restore and a CSV export of your
  daily building blocks. Nothing is uploaded.

### Project layout

```
server/         Express backend — the Claude-powered coach & weekly review
src/
  lib/          domain logic — cycle math, scores, exercise engine, coach,
                achievements (trophies), points (economy), pet (companion engine),
                grocery, api (backend client + fallback), notifications, export
  store/        React context + reducer, localStorage persistence, demo seed data
  components/   Dashboard, PetHabitat, Creature (evolving SVG), Shop, Exercise,
                Nutrition, Fertility, Trends/Trophies, Coach, BadDay, Settings…
  styles/       one cute global stylesheet (blue / green / black / gray)
public/sw.js    service worker (reminder notifications + installable PWA)
```

## Run it

```bash
npm install
npm run dev      # frontend only → http://localhost:5173 (coach uses offline engine)
```

To enable the **live Claude coach**, add a key and run both processes:

```bash
cp .env.example .env        # then set ANTHROPIC_API_KEY=sk-ant-...
npm run dev:all             # frontend + backend together
```

Vite proxies `/api/*` to the backend on port 8787. Without a key (or without the
backend), everything still works — the coach just uses its offline engine.

Other scripts:

```bash
npm run server   # backend only (node, reads .env if present)
npm run build    # type-check + production build
npm run preview  # serve the production build
npm run lint     # type-check only (tsc --noEmit)
```

To start fresh, use **Settings → Reset** (or clear the `bloom.*` keys in
localStorage).

---

*Built for someone with chronic pain, a busy life, maybe a history of
disordered eating, and the deeply human goal of becoming healthy enough to
welcome a child. A more compassionate problem to solve — and probably a more
effective way to help people change.*
