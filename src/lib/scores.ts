import type { DayLog, Profile } from '../types'

// Each metric returns 0–1. We never show calories or a single bathroom-scale
// number — the "score" is a blend of self-care signals, framed as evidence of
// becoming healthier.

export interface Metric {
  key: string
  label: string
  emoji: string
  value: number // 0–1
  status: 'good' | 'okay' | 'attention'
  detail: string
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function statusFor(v: number): Metric['status'] {
  if (v >= 0.7) return 'good'
  if (v >= 0.4) return 'okay'
  return 'attention'
}

export function proteinMetric(day: DayLog, profile: Profile): Metric {
  const proteinMeals = day.meals.filter((m) => m.hasProtein).length
  const value = clamp01(proteinMeals / Math.max(1, profile.proteinGoalMeals))
  return {
    key: 'nutrition',
    label: 'Nutrition',
    emoji: '🥗',
    value,
    status: statusFor(value),
    detail:
      proteinMeals === 0
        ? 'No protein logged yet today'
        : `${proteinMeals} protein-rich ${proteinMeals === 1 ? 'meal' : 'meals'}`,
  }
}

export function waterMetric(day: DayLog, profile: Profile): Metric {
  const value = clamp01((day.waterGlasses ?? 0) / profile.waterGoal)
  return {
    key: 'water',
    label: 'Water',
    emoji: '💧',
    value,
    status: statusFor(value),
    detail: `${day.waterGlasses ?? 0} of ${profile.waterGoal} glasses`,
  }
}

export function movementMetric(day: DayLog, profile: Profile): Metric {
  const value = clamp01((day.movementMinutes ?? 0) / profile.movementGoal)
  return {
    key: 'movement',
    label: 'Movement',
    emoji: '🚶',
    value,
    status: statusFor(value),
    detail:
      (day.movementMinutes ?? 0) > 0
        ? `${day.movementMinutes} minutes moved`
        : 'Movement not logged yet',
  }
}

export function sleepMetric(day: DayLog): Metric {
  // 8h ≈ ideal; scale gently.
  const h = day.sleepHours ?? 0
  const value = clamp01(h / 8)
  return {
    key: 'sleep',
    label: 'Sleep',
    emoji: '😴',
    value,
    status: statusFor(value),
    detail: h ? `${h} hours` : 'Sleep not logged',
  }
}

export function stressMetric(day: DayLog): Metric {
  const map = { low: 1, medium: 0.55, high: 0.2 }
  const value = day.stress ? map[day.stress] : 0.6
  return {
    key: 'stress',
    label: 'Stress',
    emoji: '🌿',
    value,
    status: statusFor(value),
    detail: day.stress ? `${day.stress} today` : 'Stress not logged',
  }
}

export function recoveryMetric(day: DayLog): Metric {
  // Recovery blends sleep, stress, and how the body feels.
  const feelMap = { great: 1, good: 0.8, tired: 0.5, sore: 0.4, 'everything-hurts': 0.2 }
  const feel = day.bodyFeel ? feelMap[day.bodyFeel] : 0.6
  const sleep = clamp01((day.sleepHours ?? 6) / 8)
  const stress = day.stress ? { low: 1, medium: 0.55, high: 0.25 }[day.stress] : 0.6
  const value = clamp01(feel * 0.4 + sleep * 0.3 + stress * 0.3)
  return {
    key: 'recovery',
    label: 'Recovery',
    emoji: '💪',
    value,
    status: statusFor(value),
    detail:
      value >= 0.7 ? 'Good' : value >= 0.4 ? 'Moderate' : 'Needs attention',
  }
}

export function dashboardMetrics(day: DayLog, profile: Profile): Metric[] {
  return [
    recoveryMetric(day),
    proteinMetric(day, profile),
    movementMetric(day, profile),
    waterMetric(day, profile),
    sleepMetric(day),
    stressMetric(day),
  ]
}

// The headline "Fertility Score" — a compassionate blend, never a verdict.
export function fertilityScore(day: DayLog, profile: Profile): number {
  const m = dashboardMetrics(day, profile)
  const avg = m.reduce((s, x) => s + x.value, 0) / m.length
  // Nudge for the things that matter most to fertility: prenatal + no alcohol.
  let bonus = 0
  if (day.prenatalTaken) bonus += 0.04
  if (day.alcohol === false) bonus += 0.02
  return Math.round(clamp01(avg + bonus) * 100)
}

// Weekly Pregnancy Preparation Score — averages the building blocks over the
// week. Returns a 0–100 plus a per-pillar breakdown for the weekly review.
export interface PrepPillar {
  label: string
  emoji: string
  value: number
}

export function pregnancyPrepScore(
  days: DayLog[],
  profile: Profile,
): { score: number; pillars: PrepPillar[] } {
  if (days.length === 0) return { score: 0, pillars: [] }
  const avg = (fn: (d: DayLog) => number) =>
    days.reduce((s, d) => s + fn(d), 0) / days.length

  const pillars: PrepPillar[] = [
    { label: 'Protein', emoji: '🍳', value: avg((d) => proteinMetric(d, profile).value) },
    { label: 'Movement', emoji: '🚶', value: avg((d) => movementMetric(d, profile).value) },
    { label: 'Hydration', emoji: '💧', value: avg((d) => waterMetric(d, profile).value) },
    { label: 'Sleep', emoji: '😴', value: avg((d) => sleepMetric(d).value) },
    { label: 'Stress', emoji: '🌿', value: avg((d) => stressMetric(d).value) },
    { label: 'Prenatal', emoji: '💊', value: avg((d) => (d.prenatalTaken ? 1 : 0)) },
    {
      label: 'Veg & fruit',
      emoji: '🥦',
      value: avg((d) => clamp01(d.meals.filter((m) => m.hasVeg).length / 3)),
    },
    {
      label: 'Alcohol-free',
      emoji: '🚫',
      value: avg((d) => (d.alcohol ? 0 : 1)),
    },
  ]
  const score = Math.round((pillars.reduce((s, p) => s + p.value, 0) / pillars.length) * 100)
  return { score, pillars }
}
