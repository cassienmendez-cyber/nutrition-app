import type { AppState, CheckIn } from '../types'
import { respondToCheckIn, weeklyReviewNarrative, weekDays } from './coach'
import { lastNDays, today } from './dates'
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

// Prior check-ins today become conversation history so the coach has memory.
function historyFor(state: AppState): { role: 'user' | 'assistant'; text: string }[] {
  const day = state.days[today()]
  if (!day) return []
  return day.checkIns.flatMap((c: CheckIn) => [
    { role: 'user' as const, text: c.text },
    { role: 'assistant' as const, text: c.reply },
  ])
}

export async function askCoach(text: string, state: AppState): Promise<CoachResult> {
  try {
    const res = await withTimeout(
      fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, context: todayContext(state), history: historyFor(state) }),
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

// The review is identical until the day or the underlying data changes, so we
// cache it (keyed by date + a cheap signature of the week) to avoid re-calling
// Claude every time the Coach tab is opened.
const REVIEW_CACHE_KEY = 'bloom.review.v1'

function weekSignature(week: ReturnType<typeof weekDays>): string {
  return week
    .map((d) => `${d.date}:${d.meals.length}:${d.movementMinutes ?? 0}:${d.waterGlasses ?? 0}:${d.prenatalTaken ? 1 : 0}`)
    .join('|')
}

export async function getWeeklyReview(state: AppState, force = false): Promise<CoachResult> {
  const week = weekDays(state)
  const { score, pillars } = pregnancyPrepScore(week, state.profile)
  const sig = `${today()}::${weekSignature(week)}`

  if (!force) {
    try {
      const cached = JSON.parse(localStorage.getItem(REVIEW_CACHE_KEY) || 'null')
      if (cached && cached.sig === sig) {
        return { reply: cached.reply, source: cached.source }
      }
    } catch {
      /* ignore cache read errors */
    }
  }

  const result = await fetchReview(state, week, score, pillars)
  try {
    localStorage.setItem(REVIEW_CACHE_KEY, JSON.stringify({ sig, ...result }))
  } catch {
    /* ignore */
  }
  return result
}

async function fetchReview(
  state: AppState,
  week: ReturnType<typeof weekDays>,
  score: number,
  pillars: { label: string; value: number }[],
): Promise<CoachResult> {
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
