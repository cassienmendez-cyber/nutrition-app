import type { Pet, PetSpecies } from '../types'

// The pet (companion) engine. Pure, deterministic helpers so the UI and tests
// agree. The creature evolves through six stages; each stage needs its OWN pool
// of points (it resets when you evolve — not a running total). It only ever
// grows, and never dies — at most it gets a little sleepy.

export const SPECIES: { id: PetSpecies; label: string; emoji: string }[] = [
  { id: 'sprout', label: 'Sprout', emoji: '🌱' },
  { id: 'frog', label: 'Frog', emoji: '🐸' },
  { id: 'fish', label: 'Finn', emoji: '🐟' },
  { id: 'dragon', label: 'Dragon', emoji: '🐲' },
  { id: 'bird', label: 'Birdie', emoji: '🐦' },
  { id: 'dog', label: 'Riley', emoji: '🐕' },
  { id: 'dog2', label: 'Chase', emoji: '🦮' },
]

export function speciesEmoji(species: PetSpecies): string {
  return SPECIES.find((s) => s.id === species)?.emoji ?? '🐸'
}

// Six life stages. Points needed to advance FROM each stage to the next:
export const LEVELS = ['Baby', 'Toddler', 'Adolescent', 'Young Adult', 'Adult', 'Elder'] as const
export const THRESHOLDS = [100, 150, 200, 300, 500] // baby→toddler … adult→elder
export const MAX_LEVEL = LEVELS.length - 1 // 5 = Elder

export interface LevelInfo {
  index: number
  name: string
  next: string | null
  needed: number // points this stage requires (0 if maxed)
  into: number // points collected so far this stage
  progress: number // 0–1 toward the next stage (1 if maxed)
}

export function petLevelInfo(pet: Pet): LevelInfo {
  const index = Math.max(0, Math.min(MAX_LEVEL, pet.level))
  const maxed = index >= MAX_LEVEL
  const needed = maxed ? 0 : THRESHOLDS[index]
  const into = pet.levelPoints
  return {
    index,
    name: LEVELS[index],
    next: maxed ? null : LEVELS[index + 1],
    needed,
    into,
    progress: maxed ? 1 : Math.min(1, into / needed),
  }
}

const clamp = (n: number) => Math.max(0, Math.min(100, n))
const DECAY_PER_HOUR = 2.2
const MAX_DECAY_HOURS = 48 // cap so a long break never leaves the pet at empty

// Apply gentle decay since lastTick. Pure given `now`.
export function settlePet(pet: Pet, now: number): Pet {
  const hours = Math.min(MAX_DECAY_HOURS, Math.max(0, (now - pet.lastTick) / 3_600_000))
  const dec = hours * DECAY_PER_HOUR
  return {
    ...pet,
    fullness: clamp(pet.fullness - dec),
    hydration: clamp(pet.hydration - dec),
    lastTick: now,
  }
}

export function happiness(pet: Pet): number {
  return Math.round((pet.fullness + pet.hydration) / 2)
}

// The creature's mood — warm and never guilt-trippy.
export function mood(pet: Pet): { emoji: string; text: string } {
  const h = happiness(pet)
  if (h >= 75) return { emoji: '💚', text: 'is thriving' }
  if (h >= 45) return { emoji: '🙂', text: 'is content' }
  if (h >= 20) return { emoji: '🥱', text: 'is a little hungry' }
  return { emoji: '😴', text: 'could use a snack when you can' }
}

// --- Shop ------------------------------------------------------------------

export type FoodTag = 'wholesome' | 'balanced' | 'treat'

export interface ShopItem {
  id: string
  emoji: string
  name: string
  desc: string
  cost: number
  growth: number // base points added to the current stage's pool
  fullness: number
  hydration: number
  tag: FoodTag
}

// Healthier choices grow the companion FASTER (high growth-per-point), mirroring
// real nutrition. Treats are still welcome — they bring fullness and happiness —
// they just grow it more slowly. No food is "bad," some just nourish more.
export const SHOP: ShopItem[] = [
  { id: 'water', emoji: '💧', name: 'Fresh water', desc: 'Pure hydration', cost: 8, growth: 11, fullness: 0, hydration: 32, tag: 'wholesome' },
  { id: 'berries', emoji: '🫐', name: 'Berries', desc: 'Vitamin-rich snack', cost: 12, growth: 16, fullness: 14, hydration: 4, tag: 'wholesome' },
  { id: 'greens', emoji: '🥬', name: 'Leafy greens', desc: 'Folate & fibre', cost: 20, growth: 26, fullness: 20, hydration: 6, tag: 'wholesome' },
  { id: 'fish', emoji: '🐟', name: 'Fish', desc: 'Lean protein — best growth', cost: 32, growth: 36, fullness: 32, hydration: 4, tag: 'wholesome' },
  { id: 'soup', emoji: '🍲', name: 'Warm soup', desc: 'Balanced & comforting', cost: 26, growth: 22, fullness: 26, hydration: 16, tag: 'balanced' },
  { id: 'cookie', emoji: '🍪', name: 'Cookie', desc: 'A little happy treat', cost: 10, growth: 5, fullness: 18, hydration: 0, tag: 'treat' },
  { id: 'cake', emoji: '🍰', name: 'Cake', desc: 'Celebration food!', cost: 22, growth: 8, fullness: 36, hydration: 2, tag: 'treat' },
  { id: 'feast', emoji: '🍱', name: 'Feast', desc: 'A full, joyful spread', cost: 66, growth: 54, fullness: 58, hydration: 20, tag: 'balanced' },
]

// Growth multiplier at feed time: a well-cared-for (happy) companion grows
// faster (so the meters genuinely matter), and prestige adds a small permanent
// boost — but a neglected pet still grows, just slower. Never punishing.
export function growthMultiplier(pet: Pet, happyAtFeed: number): number {
  let m = 1
  if (happyAtFeed >= 60) m += 0.25 // "care bonus"
  m += (pet.prestige ?? 0) * 0.05 // prestige bonus
  return m
}

// What a feed would actually add to the growth pool, given care + prestige.
export function effectiveGrowth(pet: Pet, item: ShopItem): number {
  return Math.round(item.growth * growthMultiplier(pet, happiness(pet)))
}

// Feed an item: settle decay, add its (bonus-adjusted) growth to the current
// stage's pool (which may cross level thresholds, carrying the remainder), top
// up the meters, and charge the cost.
export function applyFeed(pet: Pet, item: ShopItem, now: number): Pet {
  const settled = settlePet(pet, now)
  const gain = Math.round(item.growth * growthMultiplier(settled, happiness(settled)))
  let level = settled.level
  let pool = settled.levelPoints + gain
  while (level < MAX_LEVEL && pool >= THRESHOLDS[level]) {
    pool -= THRESHOLDS[level]
    level += 1
  }
  if (level >= MAX_LEVEL) pool = 0 // Elder: fully grown, no further pool
  return {
    ...settled,
    level,
    levelPoints: pool,
    fullness: clamp(settled.fullness + item.fullness),
    hydration: clamp(settled.hydration + item.hydration),
    spent: settled.spent + item.cost,
    lastTick: now,
  }
}

export function makeDefaultPet(now: number): Pet {
  return { name: 'Pip', species: 'frog', level: 0, levelPoints: 0, spent: 0, fullness: 55, hydration: 55, lastTick: now, prestige: 0 }
}

// Graduate an Elder and start a fresh baby (Prestige). Points already earned
// stay earned (spent carries over so the balance is unchanged); the new baby
// carries a higher prestige.
export function makeRebornPet(prev: Pet, species: PetSpecies, name: string, now: number): Pet {
  return {
    name: name.trim() || 'Pip',
    species,
    level: 0,
    levelPoints: 0,
    spent: prev.spent,
    fullness: 60,
    hydration: 60,
    lastTick: now,
    prestige: (prev.prestige ?? 0) + 1,
  }
}

// Detect when the creature evolves to a new stage, for a celebration toast.
// First call just records a baseline so loading existing data doesn't fire one.
const PET_LEVEL_KEY = 'bloom.pet.level.v1'

export function detectPetLevelUp(level: number): string | null {
  let prev: number | null = null
  try {
    const raw = localStorage.getItem(PET_LEVEL_KEY)
    if (raw != null) prev = JSON.parse(raw)
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(PET_LEVEL_KEY, JSON.stringify(level))
  } catch {
    /* ignore */
  }
  if (prev == null || level <= prev) return null
  return LEVELS[Math.min(MAX_LEVEL, level)]
}
