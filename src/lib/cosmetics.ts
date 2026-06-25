// Habitat cosmetics — backgrounds and little props you buy with points to make
// your companion's home your own. Purely decorative; on the blue/green palette.

export interface Background {
  id: string
  name: string
  cost: number
  gradient: string // CSS background for the scene
}

export interface Prop {
  id: string
  name: string
  cost: number
  emoji: string
  left: number // % from left
  bottom: number // px from bottom of the scene
  size: number // px font-size
}

export const BACKGROUNDS: Background[] = [
  { id: 'pond', name: 'Lily pond', cost: 0, gradient: 'linear-gradient(180deg, #d6ecf9 0%, #e9f5ef 52%, #cdeede 100%)' },
  { id: 'meadow', name: 'Spring meadow', cost: 60, gradient: 'linear-gradient(180deg, #e4f4ea 0%, #c4ead3 100%)' },
  { id: 'lagoon', name: 'Blue lagoon', cost: 90, gradient: 'linear-gradient(180deg, #cfeefb 0%, #a9d9f1 100%)' },
  { id: 'forest', name: 'Deep forest', cost: 160, gradient: 'linear-gradient(180deg, #2f9e7f 0%, #1f7a62 100%)' },
  { id: 'twilight', name: 'Twilight', cost: 220, gradient: 'linear-gradient(180deg, #2b6ea6 0%, #18242b 100%)' },
]

export const PROPS: Prop[] = [
  { id: 'lilypad', name: 'Lily pad', cost: 30, emoji: '🪷', left: 16, bottom: 8, size: 30 },
  { id: 'rock', name: 'Mossy rock', cost: 30, emoji: '🪨', left: 80, bottom: 6, size: 26 },
  { id: 'fern', name: 'Fern', cost: 45, emoji: '🌿', left: 8, bottom: 10, size: 30 },
  { id: 'plant', name: 'Potted plant', cost: 55, emoji: '🪴', left: 86, bottom: 8, size: 30 },
  { id: 'flower', name: 'Flowers', cost: 50, emoji: '🌸', left: 26, bottom: 6, size: 24 },
  { id: 'stars', name: 'Twinkle stars', cost: 80, emoji: '✨', left: 70, bottom: 120, size: 24 },
]

const BG_BY_ID = Object.fromEntries(BACKGROUNDS.map((b) => [b.id, b]))
const PROP_BY_ID = Object.fromEntries(PROPS.map((p) => [p.id, p]))

export function background(id: string): Background {
  return BG_BY_ID[id] ?? BACKGROUNDS[0]
}

export function prop(id: string): Prop | undefined {
  return PROP_BY_ID[id]
}

export function isBackground(id: string): boolean {
  return id in BG_BY_ID
}
