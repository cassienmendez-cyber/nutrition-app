import type { AppState } from '../types'
import { respondToCheckIn, weeklyReviewNarrative } from './coach'
import { lastNDays } from './dates'
import { pregnancyPrepScore, dashboardMetrics } from './scores'

// Thin client for the coach backend. Every call falls back to the local rule
// engine if the server is missing, has no API key, or errors — so the app is
// always fully functional, online or off. The `source` field lets the UI show
// whether a reply came from Claude or the offline coach.

export interface CoachResult {
  reply: string
  source: 'claude' | 'offline'
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

// Compact, non-identifying snapshot of today to ground the coach.
function todayContext(state: AppState) {
  const t = lastNDays(1)[0]
  const day = state.days[t]
  if (!day) return undefined
  return {
    metrics: dashboardMetrics(day, state.profile).map((m) => ({ label: m.label, status: m.status })),
    proteinMeals: day.meals.filter((m) => m.hasProtein).length,
    meals: day.meals.map((m) => m.slot),
    pain: day.pain,
    badDay: !!day.badDay,
  }
}

export async function askCoach(text: string, state: AppState): Promise<CoachResult> {
  try {
    const res = await withTimeout(
      fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, context: todayContext(state) }),
      }),
      20000,
    )
    if (res.ok) {
      const data = await res.json()
      if (data?.reply) return { reply: data.reply, source: 'claude' }
    }
  } catch {
    /* fall through to offline */
  }
  return { reply: respondToCheckIn(text), source: 'offline' }
}

export async function getWeeklyReview(state: AppState): Promise<CoachResult> {
  const week = lastNDays(7).map((d) => state.days[d]).filter(Boolean)
  const { score, pillars } = pregnancyPrepScore(week, state.profile)
  try {
    const res = await withTimeout(
      fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week: {
            prepScore: score,
            pillars: pillars.map((p) => ({ label: p.label, value: Math.round(p.value * 100) })),
            days: week.map((d) => ({
              proteinMeals: d.meals.filter((m) => m.hasProtein).length,
              meals: d.meals.map((m) => m.slot),
              pain: d.pain,
              movementMinutes: d.movementMinutes ?? 0,
              prenatal: !!d.prenatalTaken,
              stress: d.stress,
            })),
          },
        }),
      }),
      25000,
    )
    if (res.ok) {
      const data = await res.json()
      if (data?.review) return { reply: data.review, source: 'claude' }
    }
  } catch {
    /* fall through */
  }
  return { reply: weeklyReviewNarrative(state), source: 'offline' }
}

export async function coachStatus(): Promise<boolean> {
  try {
    const res = await withTimeout(fetch('/api/health'), 4000)
    if (!res.ok) return false
    const data = await res.json()
    return !!data?.claude
  } catch {
    return false
  }
}
