import type { BodyFeel, PainArea } from '../types'

export interface Move {
  name: string
  minutes: number
  detail: string
}

export interface Workout {
  title: string
  intro: string
  moves: Move[]
  // What we deliberately avoided, so the user feels seen, not limited.
  rerouted?: string
}

// The pain-first principle: we never say "skip it." We reroute around what
// hurts to something that still counts. Movement should never require a
// pain-free body.

const POOLS = {
  walk: { name: 'Easy walk', minutes: 15, detail: 'Comfortable pace, anywhere — outside or in place.' },
  upperMobility: { name: 'Upper-body mobility', minutes: 8, detail: 'Shoulder rolls, arm circles, gentle reaches.' },
  chair: { name: 'Chair workout', minutes: 10, detail: 'Seated marches, leg lifts, arm presses.' },
  band: { name: 'Resistance-band set', minutes: 10, detail: 'Rows, pull-aparts, bicep curls — seated is fine.' },
  core: { name: 'Gentle core', minutes: 8, detail: 'Dead bugs, bird-dogs, slow breathing crunches.' },
  stretch: { name: 'Full stretch routine', minutes: 10, detail: 'Slow, no bouncing. Breathe into each hold.' },
  glutes: { name: 'Glute bridges', minutes: 6, detail: 'Lying down, easy on the joints.' },
  neckRelease: { name: 'Neck & shoulder release', minutes: 6, detail: 'Slow tilts, no force, warm shoulders.' },
  hipMobility: { name: 'Hip mobility flow', minutes: 8, detail: 'Gentle openers, supported by a chair if needed.' },
  breath: { name: 'Box breathing', minutes: 5, detail: '4 in, 4 hold, 4 out — calms the nervous system.' },
} satisfies Record<string, Move>

const AVOID: Record<PainArea, string[]> = {
  ankle: ['walk'],
  knee: ['walk', 'glutes'],
  hip: ['walk', 'hipMobility', 'glutes'],
  back: ['core', 'glutes'],
  neck: ['upperMobility'],
  shoulder: ['band', 'upperMobility'],
  wrist: ['band', 'core'],
}

const PAIN_FOCUS: Record<PainArea, (keyof typeof POOLS)[]> = {
  ankle: ['upperMobility', 'chair', 'band', 'core'],
  knee: ['chair', 'band', 'upperMobility', 'breath'],
  hip: ['chair', 'band', 'neckRelease', 'breath'],
  back: ['walk', 'breath', 'neckRelease', 'stretch'],
  neck: ['neckRelease', 'walk', 'glutes', 'breath'],
  shoulder: ['chair', 'walk', 'core', 'breath'],
  wrist: ['walk', 'glutes', 'stretch', 'breath'],
}

const PAIN_LABEL: Record<PainArea, string> = {
  ankle: 'ankle',
  knee: 'knee',
  hip: 'hip',
  back: 'back',
  neck: 'neck',
  shoulder: 'shoulder',
  wrist: 'wrist',
}

export function buildWorkout(feel: BodyFeel | undefined, pain: PainArea[]): Workout {
  // "Everything hurts" or a bad-feel day → restorative, never demanding.
  if (feel === 'everything-hurts' || feel === 'sore') {
    return {
      title: 'Restore & soothe',
      intro:
        feel === 'everything-hurts'
          ? "Everything hurts today, so we're not pushing. Movement can be tiny and still count."
          : "You're sore — let's keep it gentle and recovery-focused.",
      moves: [POOLS.breath, POOLS.stretch, POOLS.neckRelease],
      rerouted: pain.length ? `Skipping anything that loads your ${pain.map((p) => PAIN_LABEL[p]).join(' & ')}.` : undefined,
    }
  }

  if (pain.length > 0) {
    const avoid = new Set(pain.flatMap((p) => AVOID[p]))
    // Gather focus moves from every painful area, drop anything we should avoid.
    const focusKeys = Array.from(
      new Set(pain.flatMap((p) => PAIN_FOCUS[p])),
    ).filter((k) => !avoid.has(k))

    const moves = focusKeys.slice(0, 4).map((k) => POOLS[k])
    if (moves.length < 3) moves.push(POOLS.breath)

    return {
      title: 'Rerouted for today',
      intro: `Your ${pain.map((p) => PAIN_LABEL[p]).join(' & ')} ${pain.length > 1 ? 'are' : 'is'} talking today — so we worked around ${pain.length > 1 ? 'them' : 'it'}. This still absolutely counts.`,
      moves,
      rerouted: `Swapped out anything that loads your ${pain.map((p) => PAIN_LABEL[p]).join(' & ')}.`,
    }
  }

  if (feel === 'tired') {
    return {
      title: 'Low-key & kind',
      intro: "Tired is allowed. A short, easy session keeps momentum without draining you.",
      moves: [POOLS.walk, POOLS.stretch, POOLS.breath],
    }
  }

  // Great / good / unspecified.
  return {
    title: 'Feeling good — let’s move',
    intro: "Your body's up for it today. Here's a balanced, joint-friendly session.",
    moves: [POOLS.walk, POOLS.band, POOLS.core, POOLS.glutes],
  }
}

export const BODY_FEEL_OPTIONS: { value: BodyFeel; emoji: string; label: string }[] = [
  { value: 'great', emoji: '😊', label: 'Great' },
  { value: 'good', emoji: '🙂', label: 'Pretty good' },
  { value: 'tired', emoji: '😐', label: 'Tired' },
  { value: 'sore', emoji: '😣', label: 'Sore' },
  { value: 'everything-hurts', emoji: '😩', label: 'Everything hurts' },
]

export const PAIN_OPTIONS: { value: PainArea; label: string }[] = [
  { value: 'ankle', label: 'Ankle' },
  { value: 'knee', label: 'Knee' },
  { value: 'hip', label: 'Hip' },
  { value: 'back', label: 'Back' },
  { value: 'neck', label: 'Neck' },
  { value: 'shoulder', label: 'Shoulder' },
  { value: 'wrist', label: 'Wrist' },
]
