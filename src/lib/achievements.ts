import type { AppState, DayLog } from '../types'
import { isActiveDay } from './coach'

// Trophies — a visual, goal-driven progress system.
//
// Philosophy guardrail: every trophy tracks a CUMULATIVE positive count, never a
// streak. A missed day can never take a trophy away or reset progress — it just
// doesn't add to it. Trophies only ever move forward. Even "Self-Compassion"
// (using the Bad Day button) is celebrated: reaching for support is strength.

export type Tier = 'bronze' | 'silver' | 'gold'

export const TIER_META: Record<Tier, { label: string; emoji: string; color: string }> = {
  bronze: { label: 'Bronze', emoji: '🥉', color: '#c98a5e' },
  silver: { label: 'Silver', emoji: '🥈', color: '#9aa3ad' },
  gold: { label: 'Gold', emoji: '🥇', color: '#e2b23d' },
}

export interface TrophyDef {
  id: string
  emoji: string
  title: string
  unit: string // e.g. "protein meals"
  blurb: string // short description of what earns it
  metric: (s: AppState) => number
  tiers: { tier: Tier; target: number }[]
}

const allDays = (s: AppState): DayLog[] => Object.values(s.days)
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)

function fertilityLogged(d: DayLog): boolean {
  const f = d.fertility
  if (!f) return false
  return (
    f.mucus != null ||
    f.bbt != null ||
    f.mood != null ||
    f.intimacy != null ||
    (f.symptoms?.length ?? 0) > 0
  )
}

// The trophy catalogue. Tier targets are tuned so a couple unlock from real use
// quickly (a visual payoff) while higher tiers stay as long-term goals.
export const TROPHIES: TrophyDef[] = [
  {
    id: 'consistency',
    emoji: '🌱',
    title: 'Showing Up',
    unit: 'days logged',
    blurb: 'Days you checked in with yourself',
    metric: (s) => allDays(s).filter(isActiveDay).length,
    tiers: [{ tier: 'bronze', target: 7 }, { tier: 'silver', target: 30 }, { tier: 'gold', target: 90 }],
  },
  {
    id: 'nourish',
    emoji: '🍳',
    title: 'Nourished',
    unit: 'protein meals',
    blurb: 'Meals with a real protein source',
    metric: (s) => sum(allDays(s).map((d) => d.meals.filter((m) => m.hasProtein).length)),
    tiers: [{ tier: 'bronze', target: 10 }, { tier: 'silver', target: 30 }, { tier: 'gold', target: 75 }],
  },
  {
    id: 'hydrate',
    emoji: '💧',
    title: 'Hydration Hero',
    unit: 'water-goal days',
    blurb: 'Days you reached your water goal',
    metric: (s) => allDays(s).filter((d) => (d.waterGlasses ?? 0) >= s.profile.waterGoal).length,
    tiers: [{ tier: 'bronze', target: 5 }, { tier: 'silver', target: 15 }, { tier: 'gold', target: 40 }],
  },
  {
    id: 'move',
    emoji: '🚶',
    title: 'In Motion',
    unit: 'minutes moved',
    blurb: 'Total minutes of movement, any kind',
    metric: (s) => sum(allDays(s).map((d) => d.movementMinutes ?? 0)),
    tiers: [{ tier: 'bronze', target: 120 }, { tier: 'silver', target: 500 }, { tier: 'gold', target: 1500 }],
  },
  {
    id: 'resilient',
    emoji: '💪',
    title: 'Gentle Strength',
    unit: 'move-through-pain days',
    blurb: 'Days you moved even though something hurt',
    metric: (s) => allDays(s).filter((d) => d.pain.length > 0 && (d.movementMinutes ?? 0) > 0).length,
    tiers: [{ tier: 'bronze', target: 3 }, { tier: 'silver', target: 10 }, { tier: 'gold', target: 25 }],
  },
  {
    id: 'rested',
    emoji: '😴',
    title: 'Well Rested',
    unit: 'nights of 7h+',
    blurb: 'Nights you got at least 7 hours',
    metric: (s) => allDays(s).filter((d) => (d.sleepHours ?? 0) >= 7).length,
    tiers: [{ tier: 'bronze', target: 5 }, { tier: 'silver', target: 15 }, { tier: 'gold', target: 40 }],
  },
  {
    id: 'prenatal',
    emoji: '💊',
    title: 'Prenatal Pro',
    unit: 'prenatal days',
    blurb: 'Days you took your prenatal',
    metric: (s) => allDays(s).filter((d) => d.prenatalTaken).length,
    tiers: [{ tier: 'bronze', target: 7 }, { tier: 'silver', target: 30 }, { tier: 'gold', target: 90 }],
  },
  {
    id: 'veg',
    emoji: '🥦',
    title: 'Garden Plate',
    unit: 'veg & fruit meals',
    blurb: 'Meals with vegetables or fruit',
    metric: (s) => sum(allDays(s).map((d) => d.meals.filter((m) => m.hasVeg).length)),
    tiers: [{ tier: 'bronze', target: 10 }, { tier: 'silver', target: 30 }, { tier: 'gold', target: 75 }],
  },
  {
    id: 'cycle',
    emoji: '🌸',
    title: 'Cycle Aware',
    unit: 'sign-logged days',
    blurb: 'Days you logged fertility signs',
    metric: (s) => allDays(s).filter(fertilityLogged).length,
    tiers: [{ tier: 'bronze', target: 7 }, { tier: 'silver', target: 21 }, { tier: 'gold', target: 60 }],
  },
  {
    id: 'coach',
    emoji: '💬',
    title: 'Heart to Heart',
    unit: 'coach check-ins',
    blurb: 'Times you talked it through with your coach',
    metric: (s) => sum(allDays(s).map((d) => d.checkIns.length)),
    tiers: [{ tier: 'bronze', target: 3 }, { tier: 'silver', target: 10 }, { tier: 'gold', target: 30 }],
  },
  {
    id: 'compassion',
    emoji: '🫶',
    title: 'Self-Compassion',
    unit: 'gentle days',
    blurb: 'Reaching for support on a hard day is strength',
    metric: (s) => allDays(s).filter((d) => d.badDay).length,
    tiers: [{ tier: 'bronze', target: 1 }, { tier: 'silver', target: 3 }, { tier: 'gold', target: 7 }],
  },
]

export interface TrophyProgress {
  def: TrophyDef
  value: number
  earnedTier: Tier | null
  earnedIndex: number // -1 if none earned yet
  next: { tier: Tier; target: number } | null
  remaining: number // how many more to the next tier (0 if maxed)
  progress: number // 0–1 toward the next tier (1 if maxed)
  maxed: boolean
  earned: boolean
}

export function computeTrophy(def: TrophyDef, s: AppState): TrophyProgress {
  const value = def.metric(s)
  let earnedIndex = -1
  for (let i = 0; i < def.tiers.length; i++) {
    if (value >= def.tiers[i].target) earnedIndex = i
  }
  const maxed = earnedIndex === def.tiers.length - 1
  const next = maxed ? null : def.tiers[earnedIndex + 1]
  const prevTarget = earnedIndex >= 0 ? def.tiers[earnedIndex].target : 0
  const progress = maxed || !next ? 1 : Math.min(1, (value - prevTarget) / (next.target - prevTarget))
  return {
    def,
    value,
    earnedTier: earnedIndex >= 0 ? def.tiers[earnedIndex].tier : null,
    earnedIndex,
    next,
    remaining: next ? Math.max(0, next.target - value) : 0,
    progress,
    maxed,
    earned: earnedIndex >= 0,
  }
}

export function computeTrophies(s: AppState): TrophyProgress[] {
  return TROPHIES.map((d) => computeTrophy(d, s))
}

export interface TrophyStats {
  all: TrophyProgress[]
  earned: number // trophies with at least bronze
  total: number
  bronze: number
  silver: number
  gold: number
}

export function trophyStats(s: AppState): TrophyStats {
  const all = computeTrophies(s)
  return {
    all,
    earned: all.filter((t) => t.earned).length,
    total: TROPHIES.length,
    bronze: all.filter((t) => t.earnedTier === 'bronze').length,
    silver: all.filter((t) => t.earnedTier === 'silver').length,
    gold: all.filter((t) => t.earnedTier === 'gold').length,
  }
}

// The trophies you're closest to unlocking next — pure motivation fuel.
export function closestTrophies(s: AppState, n = 3): TrophyProgress[] {
  return computeTrophies(s)
    .filter((t) => !t.maxed)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, n)
}

// --- Newly-earned detection (for the celebration toast) --------------------
const SEEN_KEY = 'bloom.trophies.seen.v1'

export interface EarnedEvent {
  def: TrophyDef
  tier: Tier
}

// Returns a trophy whose tier advanced since last check, or null. On the very
// first call it just records a baseline (so the seeded demo data doesn't fire a
// dozen celebrations at once).
export function detectNewTrophy(s: AppState): EarnedEvent | null {
  const all = computeTrophies(s)
  const current: Record<string, number> = {}
  all.forEach((t) => (current[t.def.id] = t.earnedIndex))

  let seen: Record<string, number> | null = null
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    if (raw) seen = JSON.parse(raw)
  } catch {
    /* ignore */
  }

  if (!seen) {
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(current))
    } catch {
      /* ignore */
    }
    return null // baseline only — don't celebrate pre-existing progress
  }

  let event: EarnedEvent | null = null
  for (const t of all) {
    const prev = seen[t.def.id] ?? -1
    if (t.earnedIndex > prev && t.earnedTier) {
      event = { def: t.def, tier: t.earnedTier }
    }
  }
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(current))
  } catch {
    /* ignore */
  }
  return event
}
