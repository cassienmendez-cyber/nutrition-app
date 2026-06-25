import type { Pet, PetSpecies } from '../types'

// The pet (companion) engine. Pure, deterministic helpers so the UI and tests
// agree. Growth is permanent and only ever increases; fullness/hydration decay
// gently between visits but the creature never dies — it just gets sleepy.

export const SPECIES: { id: PetSpecies; label: string; emoji: string }[] = [
  { id: 'frog', label: 'Frog', emoji: '🐸' },
  { id: 'turtle', label: 'Turtle', emoji: '🐢' },
  { id: 'axolotl', label: 'Axolotl', emoji: '🦎' },
  { id: 'whale', label: 'Whale', emoji: '🐳' },
  { id: 'dragon', label: 'Dragon', emoji: '🐲' },
  { id: 'chick', label: 'Chick', emoji: '🐥' },
]

export function speciesEmoji(species: PetSpecies): string {
  return SPECIES.find((s) => s.id === species)?.emoji ?? '🐸'
}

export interface Stage {
  name: string
  min: number
  size: number // rendered emoji size in px
  aura?: boolean
}

// Growth stages — egg first (same for everyone), then the chosen species grows.
export const STAGES: Stage[] = [
  { name: 'Egg', min: 0, size: 66 },
  { name: 'Hatchling', min: 40, size: 56 },
  { name: 'Little one', min: 120, size: 74 },
  { name: 'Growing', min: 260, size: 92 },
  { name: 'Big', min: 480, size: 110 },
  { name: 'Radiant', min: 800, size: 128, aura: true },
]

export interface StageInfo {
  index: number
  stage: Stage
  next: Stage | null
  progress: number // 0–1 toward the next stage (1 if maxed)
}

export function petStage(growth: number): StageInfo {
  let index = 0
  for (let i = 0; i < STAGES.length; i++) if (growth >= STAGES[i].min) index = i
  const stage = STAGES[index]
  const next = STAGES[index + 1] ?? null
  const progress = next ? Math.min(1, (growth - stage.min) / (next.min - stage.min)) : 1
  return { index, stage, next, progress }
}

// What the creature looks like right now: an egg until it hatches, then its
// species emoji at a size that grows with each stage.
export function petAppearance(pet: Pet): { emoji: string; size: number; aura: boolean; stageName: string } {
  const { index, stage } = petStage(pet.growth)
  return {
    emoji: index === 0 ? '🥚' : speciesEmoji(pet.species),
    size: stage.size,
    aura: !!stage.aura,
    stageName: stage.name,
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

export interface ShopItem {
  id: string
  emoji: string
  name: string
  desc: string
  cost: number
  growth: number
  fullness: number
  hydration: number
}

export const SHOP: ShopItem[] = [
  { id: 'water', emoji: '💧', name: 'Fresh water', desc: 'Quenches thirst', cost: 8, growth: 8, fullness: 0, hydration: 30 },
  { id: 'berries', emoji: '🫐', name: 'Berries', desc: 'A sweet little snack', cost: 12, growth: 12, fullness: 16, hydration: 4 },
  { id: 'greens', emoji: '🥬', name: 'Leafy greens', desc: 'Nourishing and fresh', cost: 22, growth: 20, fullness: 22, hydration: 6 },
  { id: 'fish', emoji: '🐟', name: 'Fish', desc: 'Hearty protein — big growth', cost: 34, growth: 30, fullness: 34, hydration: 4 },
  { id: 'soup', emoji: '🍲', name: 'Warm soup', desc: 'Comfort in a bowl', cost: 28, growth: 22, fullness: 26, hydration: 16 },
  { id: 'feast', emoji: '🍱', name: 'Feast', desc: 'A full, joyful spread', cost: 70, growth: 60, fullness: 60, hydration: 20 },
]

// Feed an item: settle decay first, then apply its effects and charge the cost.
export function applyFeed(pet: Pet, item: ShopItem, now: number): Pet {
  const settled = settlePet(pet, now)
  return {
    ...settled,
    growth: settled.growth + item.growth,
    fullness: clamp(settled.fullness + item.fullness),
    hydration: clamp(settled.hydration + item.hydration),
    spent: settled.spent + item.cost,
    lastTick: now,
  }
}

export function makeDefaultPet(now: number): Pet {
  return { name: 'Pip', species: 'frog', growth: 0, spent: 0, fullness: 55, hydration: 55, lastTick: now }
}

// Detect when the creature reaches a new growth stage, for a celebration toast.
// First call just records a baseline so loading existing data doesn't fire one.
const PET_STAGE_KEY = 'bloom.pet.stage.v1'

export function detectPetStageUp(growth: number): Stage | null {
  const idx = petStage(growth).index
  let prev: number | null = null
  try {
    const raw = localStorage.getItem(PET_STAGE_KEY)
    if (raw != null) prev = JSON.parse(raw)
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(PET_STAGE_KEY, JSON.stringify(idx))
  } catch {
    /* ignore */
  }
  if (prev == null || idx <= prev) return null
  return STAGES[idx]
}
