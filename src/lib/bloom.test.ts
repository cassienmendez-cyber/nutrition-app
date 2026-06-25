import { describe, it, expect } from 'vitest'
import { toISO, addDays, daysBetween, lastNDays, today } from './dates'
import { cycleInfo } from './cycle'
import { proteinMetric, waterMetric, fertilityScore, pregnancyPrepScore } from './scores'
import { buildWorkout } from './exercise'
import { isActiveDay, weekDays, weeklyInsights, streakFreeMomentum, respondToCheckIn } from './coach'
import { buildGroceryPlan, suggestMeals } from './grocery'
import type { AppState, DayLog, EatingReason, Meal, MealSlot, Profile } from '../types'

// --- fixtures --------------------------------------------------------------

function meal(slot: MealSlot, opts: Partial<Meal> = {}): Meal {
  return {
    id: Math.random().toString(36).slice(2),
    slot,
    description: slot,
    hasProtein: false,
    hasVeg: false,
    hunger: 5,
    reason: 'hungry' as EatingReason,
    loggedAt: 0,
    ...opts,
  }
}

function day(date: string, opts: Partial<DayLog> = {}): DayLog {
  return { date, pain: [], meals: [], checkIns: [], ...opts }
}

const profile: Profile = {
  name: 'test',
  cycleLength: 28,
  periodLength: 5,
  lastPeriodStart: '2026-03-01',
  waterGoal: 8,
  proteinGoalMeals: 3,
  movementGoal: 20,
  ttc: true,
}

function stateWith(days: DayLog[]): AppState {
  const map: Record<string, DayLog> = {}
  for (const d of days) map[d.date] = d
  return { onboarded: true, profile, days: map }
}

// --- dates -----------------------------------------------------------------

describe('dates', () => {
  it('toISO uses LOCAL date components, not UTC', () => {
    // 11pm local on Jan 15 — toISOString() would roll to Jan 16 in any tz east
    // of UTC; local components must stay Jan 15.
    const d = new Date(2026, 0, 15, 23, 0, 0)
    expect(toISO(d)).toBe('2026-01-15')
  })

  it('addDays crosses month boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('daysBetween counts whole days', () => {
    expect(daysBetween('2026-01-01', '2026-01-08')).toBe(7)
    expect(daysBetween('2026-01-08', '2026-01-01')).toBe(-7)
  })

  it('lastNDays returns ascending dates ending at `end`', () => {
    expect(lastNDays(3, '2026-03-10')).toEqual(['2026-03-08', '2026-03-09', '2026-03-10'])
  })
})

// --- cycle -----------------------------------------------------------------

describe('cycle', () => {
  it('day 1 is menstrual', () => {
    const c = cycleInfo(profile, '2026-03-01')
    expect(c.cycleDay).toBe(1)
    expect(c.phase).toBe('menstrual')
  })

  it('predicts ovulation 14 days before next period and flags the fertile window', () => {
    const onDay14 = addDays('2026-03-01', 13)
    const c = cycleInfo(profile, onDay14)
    expect(c.cycleDay).toBe(14)
    expect(c.ovulationDate).toBe(addDays('2026-03-01', 14)) // len - 14 = 14
    expect(c.ovulationTomorrow).toBe(true)
    expect(c.inFertileWindow).toBe(true)
    expect(c.phase).toBe('fertile')
    expect(c.nextPeriod).toBe(addDays('2026-03-01', 28))
  })

  it('rolls forward into the current cycle for a later date', () => {
    const next = addDays('2026-03-01', 30) // day 3 of the second cycle
    const c = cycleInfo(profile, next)
    expect(c.cycleDay).toBe(3)
  })
})

// --- scores ----------------------------------------------------------------

describe('scores', () => {
  it('protein metric scales to the goal', () => {
    const d = day('2026-03-10', { meals: [meal('breakfast', { hasProtein: true }), meal('lunch', { hasProtein: true }), meal('dinner', { hasProtein: true })] })
    const m = proteinMetric(d, profile)
    expect(m.value).toBe(1)
    expect(m.status).toBe('good')
  })

  it('water metric is a fraction of the goal', () => {
    const m = waterMetric(day('2026-03-10', { waterGlasses: 4 }), profile)
    expect(m.value).toBeCloseTo(0.5)
    expect(m.status).toBe('okay')
  })

  it('fertility score is a 0–100 integer', () => {
    const s = fertilityScore(day('2026-03-10', { waterGlasses: 8, movementMinutes: 20, sleepHours: 8, prenatalTaken: true, stress: 'low' }), profile)
    expect(Number.isInteger(s)).toBe(true)
    expect(s).toBeGreaterThan(0)
    expect(s).toBeLessThanOrEqual(100)
  })

  it('prep score returns a score and pillars', () => {
    const { score, pillars } = pregnancyPrepScore([day('2026-03-10', { prenatalTaken: true })], profile)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(pillars.length).toBeGreaterThan(0)
  })
})

// --- exercise engine -------------------------------------------------------

describe('pain-first exercise engine', () => {
  it('builds a full session when feeling good with no pain', () => {
    const w = buildWorkout('great', [])
    expect(w.rerouted).toBeUndefined()
    expect(w.moves.length).toBeGreaterThanOrEqual(3)
  })

  it('reroutes AROUND an ankle — never prescribes a walk', () => {
    const w = buildWorkout('good', ['ankle'])
    expect(w.rerouted).toBeDefined()
    expect(w.moves.some((m) => m.name === 'Easy walk')).toBe(false)
  })

  it('goes restorative when everything hurts', () => {
    const w = buildWorkout('everything-hurts', [])
    expect(w.title.toLowerCase()).toContain('restore')
  })
})

// --- coach -----------------------------------------------------------------

describe('coach', () => {
  it('isActiveDay distinguishes logged from empty days', () => {
    expect(isActiveDay(day('2026-03-10'))).toBe(false)
    expect(isActiveDay(day('2026-03-10', { waterGlasses: 1 }))).toBe(true)
  })

  it('weekDays excludes today and empty days', () => {
    const t = today()
    const yesterday = addDays(t, -1)
    const s = stateWith([
      day(t, { waterGlasses: 5 }), // today — excluded
      day(yesterday, { waterGlasses: 5 }), // counts
      day(addDays(t, -2)), // empty — excluded
    ])
    const wd = weekDays(s)
    expect(wd.map((d) => d.date)).toContain(yesterday)
    expect(wd.map((d) => d.date)).not.toContain(t)
    expect(wd.length).toBe(1)
  })

  it('flags repeatedly skipped breakfasts on active days', () => {
    const t = today()
    const days = [1, 2, 3, 4].map((n) => day(addDays(t, -n), { meals: [meal('dinner')] })) // active, no breakfast
    const insights = weeklyInsights(stateWith(days))
    expect(insights.some((i) => i.id === 'skip-breakfast')).toBe(true)
  })

  it('momentum counts healthy days without punishing misses', () => {
    const t = today()
    const s = stateWith([
      day(addDays(t, -1), { prenatalTaken: true }),
      day(addDays(t, -2), { movementMinutes: 15 }),
    ])
    expect(streakFreeMomentum(s).level).toBe(2)
  })

  it('offline coach pairs a treat with protein when meals were skipped', () => {
    const reply = respondToCheckIn('I skipped lunch and all I want is ice cream')
    expect(reply.toLowerCase()).toContain('protein')
  })
})

// --- grocery ---------------------------------------------------------------

describe('grocery', () => {
  it('builds a week of meals within budget', () => {
    const plan = buildGroceryPlan(120)
    expect(plan.underBudget).toBe(true)
    expect(plan.total).toBeLessThanOrEqual(120)
    expect(plan.meals.length).toBe(5)
    expect(plan.shoppingList.length).toBeGreaterThan(0)
  })

  it('suggests protein-forward ideas for a craving', () => {
    const ideas = suggestMeals('chicken')
    expect(ideas.length).toBe(3)
    expect(ideas.every((i) => typeof i.name === 'string')).toBe(true)
  })
})
