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

- **Dashboard** — Fertility Score, Recovery, Nutrition, Movement, Water, Sleep,
  Stress, and your Cycle Day on one calm screen. No guilt.
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
- **Transparent "AI"** — the coach, pattern detection, scoring, and the
  exercise/grocery engines are a readable rule engine in [`src/lib/`](src/lib/),
  so the experience is fully functional offline and the compassionate *voice*
  stays consistent. These are the natural seams where a real Claude API call
  would slot in later.

### Project layout

```
src/
  lib/          domain logic — cycle math, scores, exercise engine, coach, grocery
  store/        React context + reducer, localStorage persistence, demo seed data
  components/   Dashboard, Exercise, Nutrition, Fertility, Coach, BadDay, …
  styles/       one calm global stylesheet (sage / clay / cream)
```

## Run it

```bash
npm install
npm run dev      # → http://localhost:5173
```

Other scripts:

```bash
npm run build    # type-check + production build
npm run preview  # serve the production build
npm run lint     # type-check only (tsc --noEmit)
```

To start fresh (clear the demo data), clear the `bloom.state.v1` key in your
browser's localStorage.

---

*Built for someone with chronic pain, a busy life, maybe a history of
disordered eating, and the deeply human goal of becoming healthy enough to
welcome a child. A more compassionate problem to solve — and probably a more
effective way to help people change.*
