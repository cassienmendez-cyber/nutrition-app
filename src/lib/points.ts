import type { AppState, DayLog, Profile } from '../types'
import { today } from './dates'

// The points economy. Healthy choices earn points; the QUALITY of the choice
// dictates how many (a protein- and veg-rich meal eaten at comfortable hunger
// beats a plain one; more movement earns more, up to a kind cap). Points are a
// deterministic function of what you've logged — you can't lose them by having a
// quiet day, and feeding the pet spends them.

export interface PointLine {
  emoji: string
  label: string
  points: number
}

function fertilityLogged(d: DayLog): boolean {
  const f = d.fertility
  if (!f) return false
  return f.mucus != null || f.bbt != null || f.mood != null || f.intimacy != null || (f.symptoms?.length ?? 0) > 0
}

// Points for a single day, with a quality breakdown.
export function dayBreakdown(d: DayLog, profile: Profile): PointLine[] {
  const lines: PointLine[] = []

  // Meals — quality matters: protein > plain, veg adds, mindful hunger (a 4–7 on
  // the 1–10 scale, "comfortably hungry") adds a little more.
  let mealPts = 0
  for (const m of d.meals) {
    mealPts += m.hasProtein ? 15 : 5
    if (m.hasVeg) mealPts += 5
    if (m.hunger >= 4 && m.hunger <= 7) mealPts += 3
  }
  if (mealPts > 0) lines.push({ emoji: '🍽', label: 'Meals', points: mealPts })

  // Movement — more minutes earn more, capped at 1.5× your goal so it stays kind.
  const mins = Math.min(d.movementMinutes ?? 0, profile.movementGoal * 1.5)
  const movePts = Math.round(mins * 0.6)
  if (movePts > 0) lines.push({ emoji: '🚶', label: 'Movement', points: movePts })

  // Water — proportional to your goal.
  const water = d.waterGlasses ?? 0
  const waterPts = water > 0 ? Math.round((Math.min(water, profile.waterGoal) / profile.waterGoal) * 20) : 0
  if (waterPts > 0) lines.push({ emoji: '💧', label: 'Water', points: waterPts })

  // Sleep — a kind boost for real rest.
  const sleep = d.sleepHours ?? 0
  const sleepPts = sleep >= 7 ? 15 : sleep >= 6 ? 8 : 0
  if (sleepPts > 0) lines.push({ emoji: '😴', label: 'Sleep', points: sleepPts })

  if (d.prenatalTaken) lines.push({ emoji: '💊', label: 'Prenatal', points: 10 })
  if (fertilityLogged(d)) lines.push({ emoji: '🌸', label: 'Cycle care', points: 5 })
  if (d.checkIns.length) lines.push({ emoji: '💬', label: 'Check-ins', points: d.checkIns.length * 5 })
  // A hard day handled with self-compassion still counts.
  if (d.badDay) lines.push({ emoji: '🫶', label: 'Self-care', points: 10 })

  return lines
}

export function pointsForDay(d: DayLog, profile: Profile): number {
  return dayBreakdown(d, profile).reduce((s, l) => s + l.points, 0)
}

export function totalEarnedPoints(state: AppState): number {
  return Object.values(state.days).reduce((s, d) => s + pointsForDay(d, state.profile), 0)
}

// Spendable balance — never negative.
export function availablePoints(state: AppState): number {
  return Math.max(0, totalEarnedPoints(state) - state.pet.spent)
}

export function todayPoints(state: AppState): { total: number; lines: PointLine[] } {
  const d = state.days[today()]
  if (!d) return { total: 0, lines: [] }
  const lines = dayBreakdown(d, state.profile)
  return { total: lines.reduce((s, l) => s + l.points, 0), lines }
}
