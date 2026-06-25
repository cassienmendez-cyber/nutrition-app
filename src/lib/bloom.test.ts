import { describe, it, expect } from 'vitest'
import { toISO, addDays, daysBetween, lastNDays, today } from './dates'
import { cycleInfo } from './cycle'
import { proteinMetric, waterMetric, fertilityScore, pregnancyPrepScore } from './scores'
import { buildWorkout } from './exercise'
import { isActiveDay, weekDays, weeklyInsights, streakFreeMomentum, respondToCheckIn } from './coach'
import { buildGroceryPlan, suggestMeals } from './grocery'
import { computeTrophy, trophyStats, closestTrophies, TROPHIES } from './achievements'
import { pointsForDay, totalEarnedPoints, availablePoints } from './points'
import { petLevelInfo, settlePet, applyFeed, makeDefaultPet, makeRebornPet, effectiveGrowth, SHOP, THRESHOLDS, MAX_LEVEL } from './pet'
import type { AppState, DayLog, EatingReason, Meal, MealSlot, Pet, Profile } from '../types'

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

function stateWith(days: DayLog[], pet?: Pet): AppState {
  const map: Record<string, DayLog> = {}
  for (const d of days) map[d.date] = d
  return {
    onboarded: true,
    profile,
    days: map,
    pet: pet ?? makeDefaultPet(0),
    habitat: { background: 'pond', owned: ['pond'] },
    collection: [],
  }
}

const item = (growth: number, extra: Partial<import('./pet').ShopItem> = {}): import('./pet').ShopItem => ({
  id: 'x', emoji: '✨', name: 'x', desc: '', cost: 0, growth, fullness: 0, hydration: 0, tag: 'wholesome', ...extra,
})

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

// --- achievements ----------------------------------------------------------

describe('trophies', () => {
  const prenatal = TROPHIES.find((t) => t.id === 'prenatal')!

  it('reports no tier earned below the first target', () => {
    const s = stateWith([day('2026-03-10', { prenatalTaken: true })]) // 1 day, bronze needs 7
    const p = computeTrophy(prenatal, s)
    expect(p.earned).toBe(false)
    expect(p.earnedTier).toBe(null)
    expect(p.next?.target).toBe(7)
    expect(p.remaining).toBe(6)
    expect(p.progress).toBeCloseTo(1 / 7)
  })

  it('earns a tier and tracks progress toward the next', () => {
    // 8 prenatal days → bronze (7) earned, working toward silver (30).
    const days = Array.from({ length: 8 }, (_, i) => day(`2026-03-${10 + i}`, { prenatalTaken: true }))
    const p = computeTrophy(prenatal, stateWith(days))
    expect(p.earnedTier).toBe('bronze')
    expect(p.next?.tier).toBe('silver')
    expect(p.maxed).toBe(false)
    expect(p.progress).toBeCloseTo((8 - 7) / (30 - 7))
  })

  it('maxes out at the gold target', () => {
    const days = Array.from({ length: 100 }, (_, i) => day(`d${i}`, { prenatalTaken: true }))
    const p = computeTrophy(prenatal, stateWith(days))
    expect(p.earnedTier).toBe('gold')
    expect(p.maxed).toBe(true)
    expect(p.progress).toBe(1)
    expect(p.next).toBe(null)
  })

  it('never regresses on a missed day (cumulative, not a streak)', () => {
    const withGap = stateWith([
      day('2026-03-10', { prenatalTaken: true }),
      day('2026-03-11'), // missed
      day('2026-03-12', { prenatalTaken: true }),
    ])
    expect(computeTrophy(prenatal, withGap).value).toBe(2) // gap doesn't reset it
  })

  it('closest trophies are sorted by how near they are and exclude maxed', () => {
    const s = stateWith([day('2026-03-10', { meals: [meal('lunch', { hasProtein: true })], waterGlasses: 9 })])
    const closest = closestTrophies(s, 3)
    expect(closest.length).toBeLessThanOrEqual(3)
    expect(closest.every((t) => !t.maxed)).toBe(true)
    for (let i = 1; i < closest.length; i++) {
      expect(closest[i - 1].progress).toBeGreaterThanOrEqual(closest[i].progress)
    }
  })

  it('stats count earned trophies out of the full set', () => {
    const stats = trophyStats(stateWith([]))
    expect(stats.total).toBe(TROPHIES.length)
    expect(stats.earned).toBe(0)
  })
})

// --- points economy --------------------------------------------------------

describe('points', () => {
  it('rewards quality: a protein + veg meal beats a plain one', () => {
    const plain = day('2026-03-10', { meals: [meal('lunch')] })
    const quality = day('2026-03-10', { meals: [meal('lunch', { hasProtein: true, hasVeg: true, hunger: 5 })] })
    expect(pointsForDay(quality, profile)).toBeGreaterThan(pointsForDay(plain, profile))
  })

  it('a hard day handled with self-compassion still earns points', () => {
    const bad = day('2026-03-10', { badDay: true })
    expect(pointsForDay(bad, profile)).toBeGreaterThan(0)
  })

  it('available = total earned minus what the pet spent, never negative', () => {
    const s = stateWith(
      [day('2026-03-10', { meals: [meal('lunch', { hasProtein: true })], prenatalTaken: true })],
      { ...makeDefaultPet(0), spent: 999999 },
    )
    expect(totalEarnedPoints(s)).toBeGreaterThan(0)
    expect(availablePoints(s)).toBe(0)
  })
})

// --- pet engine ------------------------------------------------------------

describe('pet', () => {
  it('starts as a Baby with an empty pool toward Toddler', () => {
    const info = petLevelInfo(makeDefaultPet(0))
    expect(info.name).toBe('Baby')
    expect(info.next).toBe('Toddler')
    expect(info.needed).toBe(THRESHOLDS[0]) // 100
    expect(info.into).toBe(0)
  })

  it('feeding fills the current stage pool and never overfills meters past 100', () => {
    // Keep happiness < 60 (no care bonus) so the math is the raw growth.
    const fish = SHOP.find((i) => i.id === 'fish')!
    const fed = applyFeed({ ...makeDefaultPet(0), fullness: 90, hydration: 10 }, fish, 0)
    expect(fed.levelPoints).toBe(fish.growth)
    expect(fed.level).toBe(0)
    expect(fed.spent).toBe(fish.cost)
    expect(fed.fullness).toBe(100) // 90 + 32, clamped
  })

  it('evolves when the per-stage pool is met, carrying the remainder', () => {
    const fed = applyFeed(makeDefaultPet(0), item(130, { cost: 100 }), 0)
    expect(fed.level).toBe(1)
    expect(petLevelInfo(fed).name).toBe('Toddler')
    expect(fed.levelPoints).toBe(30)
  })

  it('each stage needs its OWN pool — not a running total', () => {
    const fed = applyFeed(makeDefaultPet(0), item(100), 0)
    expect(fed.level).toBe(1)
    expect(fed.levelPoints).toBe(0)
    expect(petLevelInfo(fed).needed).toBe(150) // toddler→adolescent
  })

  it('caps at Elder and never exceeds the max level', () => {
    const fed = applyFeed(makeDefaultPet(0), item(99999), 0)
    expect(fed.level).toBe(MAX_LEVEL)
    expect(petLevelInfo(fed).name).toBe('Elder')
    expect(petLevelInfo(fed).progress).toBe(1)
  })

  it('healthier food grows faster per point spent than a treat', () => {
    const fish = SHOP.find((i) => i.id === 'fish')! // wholesome
    const cake = SHOP.find((i) => i.id === 'cake')! // treat
    expect(fish.growth / fish.cost).toBeGreaterThan(cake.growth / cake.cost)
  })

  it('a well-cared-for (happy) pet grows faster than a neglected one — gently', () => {
    const happy = applyFeed({ ...makeDefaultPet(0), fullness: 100, hydration: 100 }, item(40), 0)
    const neglected = applyFeed({ ...makeDefaultPet(0), fullness: 0, hydration: 0 }, item(40), 0)
    expect(happy.levelPoints).toBeGreaterThan(neglected.levelPoints) // care bonus
    expect(neglected.levelPoints).toBeGreaterThan(0) // but neglected still grows
  })

  it('prestige adds a permanent growth boost', () => {
    const base = { ...makeDefaultPet(0), fullness: 0, hydration: 0 } // no care bonus
    const proud = { ...base, prestige: 2 }
    expect(effectiveGrowth(proud, item(100))).toBeGreaterThan(effectiveGrowth(base, item(100)))
  })

  it('prestige rebirth keeps points spent and the new baby carries a higher prestige', () => {
    const elder = { ...makeDefaultPet(0), level: MAX_LEVEL, spent: 500, prestige: 1 }
    const reborn = makeRebornPet(elder, 'dragon', 'Spark', 0)
    expect(reborn.level).toBe(0)
    expect(reborn.spent).toBe(500)
    expect(reborn.prestige).toBe(2)
    expect(reborn.species).toBe('dragon')
    expect(reborn.name).toBe('Spark')
  })

  it('decays gently over time but is capped and never goes negative', () => {
    const pet = { ...makeDefaultPet(0), fullness: 50, hydration: 50 }
    const oneDayLater = settlePet(pet, 24 * 3_600_000)
    expect(oneDayLater.fullness).toBeLessThan(50)
    expect(oneDayLater.fullness).toBeGreaterThanOrEqual(0)
    const wayLater = settlePet(pet, 1000 * 3_600_000) // capped decay
    expect(wayLater.fullness).toBeGreaterThanOrEqual(0)
  })

  it('the level only moves forward — a missed feed never lowers it', () => {
    const pet = { ...makeDefaultPet(0), level: 2, levelPoints: 40 }
    expect(settlePet(pet, 9_999_999_999).level).toBe(2)
  })
})

describe('workout (GPS tracking)', () => {
  it('haversine ≈ real distance between two close points', async () => {
    const { haversine } = await import('./workout')
    // ~111 m per 0.001° latitude
    const d = haversine({ lat: 40.0, lng: -73.0, t: 0 }, { lat: 40.001, lng: -73.0, t: 0 })
    expect(d).toBeGreaterThan(105)
    expect(d).toBeLessThan(118)
  })

  it('pathDistance sums a path but ignores sub-2m jitter', async () => {
    const { pathDistance } = await import('./workout')
    const straight = pathDistance([
      { lat: 40.0, lng: -73.0, t: 0 },
      { lat: 40.001, lng: -73.0, t: 1 },
      { lat: 40.002, lng: -73.0, t: 2 },
    ])
    expect(straight).toBeGreaterThan(210)
    // identical points add nothing
    const jitter = pathDistance([
      { lat: 40.0, lng: -73.0, t: 0 },
      { lat: 40.0, lng: -73.0, t: 1 },
    ])
    expect(jitter).toBe(0)
  })

  it('pace and formatting', async () => {
    const { paceSecPerKm, fmtDuration, fmtPace } = await import('./workout')
    expect(paceSecPerKm(1000, 300)).toBeCloseTo(300, 5) // 5:00/km
    expect(paceSecPerKm(2, 300)).toBe(0) // too short → no pace
    expect(fmtDuration(125)).toBe('2:05')
    expect(fmtDuration(3661)).toBe('1:01:01')
    expect(fmtPace(0)).toBe('—')
  })

  it('routePath produces an SVG path that fits the box', async () => {
    const { routePath } = await import('./workout')
    const d = routePath(
      [
        { lat: 40.0, lng: -73.0, t: 0 },
        { lat: 40.001, lng: -73.001, t: 1 },
        { lat: 40.002, lng: -73.0, t: 2 },
      ],
      320,
      220,
    )
    expect(d.startsWith('M')).toBe(true)
    expect(d).toContain('L')
    expect(routePath([{ lat: 40, lng: -73, t: 0 }], 320, 220)).toBe('') // need ≥2 points
  })
})
