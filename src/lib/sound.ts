// Tiny, asset-free sound effects via the Web Audio API. Opt-in (muted by
// default) and gentle — soft sine chimes, nothing jarring.

const KEY = 'bloom.sound.v1'

export function isSoundOn(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

let ctx: AudioContext | null = null
function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

// Play a short sequence of notes (frequencies in Hz, each `dur` seconds).
function chime(freqs: number[], dur = 0.13, gain = 0.12) {
  if (!isSoundOn()) return
  const ac = audio()
  if (!ac) return
  const t0 = ac.currentTime
  freqs.forEach((f, i) => {
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = 'sine'
    osc.frequency.value = f
    const start = t0 + i * dur
    g.gain.setValueAtTime(0, start)
    g.gain.linearRampToValueAtTime(gain, start + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    osc.connect(g).connect(ac.destination)
    osc.start(start)
    osc.stop(start + dur + 0.02)
  })
}

// A soft two-note "blip" when fed.
export function playFeed() {
  chime([587.33, 880], 0.1) // D5 → A5
}

// A bright ascending arpeggio when the companion evolves.
export function playEvolve() {
  chime([523.25, 659.25, 783.99, 1046.5], 0.13) // C5 E5 G5 C6
}

// A fuller flourish for prestige.
export function playPrestige() {
  chime([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.14, 0.13)
}
