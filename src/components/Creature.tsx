import type { JSX } from 'react'
import type { PetSpecies } from '../types'

// Detailed, kawaii-sticker creatures with bold outlines, a shaded belly, big
// sparkly eyes, cheeks and per-species features. They don't just scale as they
// evolve — their PROPORTIONS refine: a baby is small, round and chunky with a
// big head and huge eyes; each stage grows taller and sleeker, ending in a
// slender, dignified Elder with spectacles.

interface Cfg {
  body: string
  shade: string
  belly: string
  line: string
  accent: string
  horn?: string
  plates?: boolean
}

const SPP: Record<PetSpecies, Cfg> = {
  sprout: { body: '#67c84f', shade: '#41a23a', belly: '#ecf7d6', line: '#245d22', accent: '#3fae5e' },
  frog: { body: '#41bf9c', shade: '#1f927a', belly: '#e2f5ec', line: '#14584a', accent: '#2f9e7f' },
  fish: { body: '#46a6e4', shade: '#2a79bd', belly: '#e3f1fc', line: '#173f63', accent: '#7cc4ef' },
  dragon: { body: '#f0934a', shade: '#d2702a', belly: '#fbe3c8', line: '#7a3a12', accent: '#f6c290', horn: '#f2e6c8', plates: true },
  bird: { body: '#f3c042', shade: '#d99b1f', belly: '#fdf2cf', line: '#6f5210', accent: '#ef8f4a' },
}

interface StageDef {
  rx: number // body half-width
  ry: number // body half-height
  eye: number // eye radius
  arms: boolean
  wings?: boolean
  f: number // feature development
  elder?: boolean
}
// Round & chunky (wide, big eyes) → tall, slim & refined (smaller eyes).
const STAGES: StageDef[] = [
  { rx: 40, ry: 37, eye: 11.5, arms: false, f: 0.5 }, // Baby
  { rx: 39, ry: 41, eye: 10.5, arms: true, f: 0.66 }, // Toddler
  { rx: 37, ry: 45, eye: 9.4, arms: true, wings: true, f: 0.85 }, // Adolescent
  { rx: 34, ry: 49, eye: 8.6, arms: true, wings: true, f: 0.97 }, // Young Adult
  { rx: 32, ry: 53, eye: 8, arms: true, wings: true, f: 1.08 }, // Adult
  { rx: 30, ry: 55, eye: 7.6, arms: true, wings: true, f: 1.13, elder: true }, // Elder
]

const cx = 70
const FLOOR = 118
const LW = 3

export function Creature({
  species,
  level,
  size = 110,
  happy = false,
  prestige = 0,
}: {
  species: PetSpecies
  level: number
  size?: number
  happy?: boolean
  prestige?: number
}) {
  const st = STAGES[Math.max(0, Math.min(5, level))]
  const c = SPP[species] ?? SPP.frog
  const line = st.elder ? '#5b6770' : c.line
  const f = st.f
  const isFish = species === 'fish'

  const rx = st.rx
  const ry = st.ry
  const cy = FLOOR - ry
  const topY = cy - ry
  const eyeR = st.eye
  const eyeDX = rx * 0.36
  const eyeY = cy - ry * 0.32
  const noseY = eyeY + eyeR + 5
  const mouthY = eyeY + eyeR + 10
  const cheekY = eyeY + eyeR + 1

  const behind: JSX.Element[] = []
  const body: JSX.Element[] = []
  const front: JSX.Element[] = []

  // ---------- back features ----------
  if (species === 'dragon') {
    const tx = cx + rx * 0.55
    const ty = cy + ry * 0.55
    behind.push(
      <path key="tail" d={`M${tx} ${ty} q26 8 30 -14 q1 -10 -8 -12 q6 8 -2 14 q-8 6 -22 4 Z`} fill={c.body} stroke={line} strokeWidth={LW} strokeLinejoin="round" />,
      <path key="ttip" d={`M${tx + 26} ${ty - 26} l12 -7 l-2 9 l8 4 l-12 5 Z`} fill={c.shade} stroke={line} strokeWidth={LW} strokeLinejoin="round" />,
    )
    if (st.wings) {
      const wy = cy - ry * 0.08
      for (const d of [-1, 1] as const) {
        const bx = cx + d * rx * 0.78
        behind.push(<path key={`w${d}`} d={`M${bx} ${wy} q${d * 34 * f} ${-26 * f} ${d * 40 * f} ${6 * f} q${-d * 8 * f} ${-2} ${-d * 13 * f} ${4 * f} q${-d * 2} ${6 * f} ${-d * 9 * f} ${2 * f} q${-d * 2} ${5 * f} ${-d * 9 * f} ${1 * f} Z`} fill={c.accent} stroke={line} strokeWidth={LW} strokeLinejoin="round" />)
      }
    }
  } else if (species === 'bird') {
    behind.push(
      <g key="tf">
        {[-14, 0, 14].map((a) => (
          <ellipse key={a} cx={cx} cy={FLOOR + 2} rx={6.5} ry={18 * f} fill={c.accent} stroke={line} strokeWidth={2.2} transform={`rotate(${a} ${cx} ${FLOOR - 6})`} />
        ))}
      </g>,
    )
    if (st.wings) {
      const wy = cy + ry * 0.05
      for (const d of [-1, 1] as const) {
        const bx = cx + d * rx * 0.92
        behind.push(<ellipse key={`bw${d}`} cx={bx} cy={wy} rx={12 * f} ry={20 * f} fill={c.body} stroke={line} strokeWidth={LW} transform={`rotate(${d * 16} ${bx} ${wy})`} />)
      }
    }
  } else if (isFish) {
    behind.push(<path key="caud" d={`M${cx} ${cy + ry * 0.7} q-24 6 -28 26 q20 -4 28 -10 q8 6 28 10 q-4 -20 -28 -26 Z`} fill={c.accent} stroke={line} strokeWidth={LW} strokeLinejoin="round" />)
    const sy = cy + ry * 0.05
    for (const d of [-1, 1] as const) {
      const bx = cx + d * rx * 0.96
      behind.push(<path key={`sf${d}`} d={`M${bx} ${sy} q${d * 22 * f} ${-6} ${d * 26 * f} ${14 * f} q${-d * 14} 0 ${-d * 26 * f} ${-6} Z`} fill={c.accent} stroke={line} strokeWidth={LW} strokeLinejoin="round" />)
    }
  } else if (species === 'frog' && level >= 3) {
    behind.push(<ellipse key="pad" cx={cx} cy={FLOOR + 4} rx={rx * 1.4} ry={11} fill={c.accent} stroke={line} strokeWidth={2} opacity={0.5} />)
  }

  // ---------- feet ----------
  if (!isFish) {
    const fw = (species === 'frog' ? 0.5 : 0.4) * rx
    body.push(
      <ellipse key="f1" cx={cx - rx * 0.46} cy={FLOOR + 2} rx={fw} ry={9} fill={c.shade} stroke={line} strokeWidth={LW} />,
      <ellipse key="f2" cx={cx + rx * 0.46} cy={FLOOR + 2} rx={fw} ry={9} fill={c.shade} stroke={line} strokeWidth={LW} />,
    )
  }

  // ---------- body ----------
  body.push(<ellipse key="body" cx={cx} cy={cy} rx={rx} ry={ry} fill={c.body} stroke={line} strokeWidth={LW} />)
  body.push(<path key="sh" d={`M${cx - rx} ${cy + ry * 0.25} a${rx} ${ry} 0 0 0 ${rx * 2} 0 a${rx} ${ry} 0 0 1 ${-rx * 2} 0 Z`} fill={c.shade} opacity={0.2} />)

  // belly
  const bRx = rx * 0.6
  const bRy = ry * 0.52
  const bCy = cy + ry * 0.32
  body.push(<ellipse key="belly" cx={cx} cy={bCy} rx={bRx} ry={bRy} fill={c.belly} stroke={line} strokeWidth={2} />)
  if (c.plates) {
    body.push(
      <path key="s1" d={`M${cx - bRx * 0.7} ${bCy - bRy * 0.3} q${bRx * 0.7} ${bRy * 0.34} ${bRx * 1.4} 0`} fill="none" stroke={line} strokeWidth={1.6} opacity={0.5} />,
      <path key="s2" d={`M${cx - bRx * 0.7} ${bCy + bRy * 0.18} q${bRx * 0.7} ${bRy * 0.34} ${bRx * 1.4} 0`} fill="none" stroke={line} strokeWidth={1.6} opacity={0.5} />,
    )
  }

  // arms (fish uses side fins)
  if (st.arms && !isFish) {
    const ay = cy + ry * 0.12
    const armRy = 11 + level * 1.2 // arms lengthen / refine with age
    body.push(
      <ellipse key="a1" cx={cx - rx - 2} cy={ay} rx={8.5} ry={armRy} fill={c.body} stroke={line} strokeWidth={LW} transform={`rotate(16 ${cx - rx - 2} ${ay})`} />,
      <ellipse key="a2" cx={cx + rx + 2} cy={ay} rx={8.5} ry={armRy} fill={c.body} stroke={line} strokeWidth={LW} transform={`rotate(-16 ${cx + rx + 2} ${ay})`} />,
    )
  }

  // ---------- head features ----------
  if (species === 'dragon') {
    const h = f
    for (const d of [-1, 1] as const) {
      const hx = cx + d * rx * 0.34
      front.push(<path key={`h${d}`} d={`M${hx} ${topY + 8} q${-d * 4} ${-20 * h} ${d * 6} ${-24 * h} q${-d * 2} ${12 * h} ${d * 4} ${20 * h} Z`} fill={c.horn} stroke={line} strokeWidth={LW} strokeLinejoin="round" />)
    }
    front.push(<path key="ridge" d={`M${cx - 10} ${topY + 6} l4 -7 l5 6 l5 -6 l4 7`} fill="none" stroke={line} strokeWidth={2.2} strokeLinejoin="round" opacity={0.6} />)
  } else if (species === 'sprout') {
    const sy = topY + 4
    front.push(<path key="stem" d={`M${cx} ${sy} L${cx} ${sy - 20 * f}`} stroke={c.accent} strokeWidth={4} strokeLinecap="round" fill="none" />)
    const ty = sy - 20 * f
    if (level >= 4) {
      front.push(
        <g key="bloom">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx={cx} cy={ty} rx={5} ry={9 * f} fill={st.elder ? '#e9eef0' : '#f5a9c3'} stroke={line} strokeWidth={1.6} transform={`rotate(${a} ${cx} ${ty})`} />
          ))}
          <circle cx={cx} cy={ty} r={4.5} fill="#f4d35e" stroke={line} strokeWidth={1.6} />
        </g>,
      )
    } else {
      front.push(<ellipse key="leaf" cx={cx} cy={ty} rx={7 * f} ry={13 * f} fill={c.accent} stroke={line} strokeWidth={2} transform={`rotate(-28 ${cx} ${ty})`} />)
      if (f > 0.7) front.push(<ellipse key="leaf2" cx={cx} cy={ty + 4} rx={7 * f} ry={13 * f} fill={c.accent} stroke={line} strokeWidth={2} transform={`rotate(28 ${cx} ${ty + 4})`} />)
    }
  } else if (isFish) {
    front.push(<path key="dorsal" d={`M${cx - 14 * f} ${topY + 8} q${14 * f} ${-22 * f} ${28 * f} 0 Z`} fill={c.accent} stroke={line} strokeWidth={LW} strokeLinejoin="round" />)
  } else if (species === 'bird') {
    const ct = topY + 4
    front.push(
      <path key="cr1" d={`M${cx} ${ct} q-3 ${-18 * f} 4 ${-21 * f} q-2 ${13 * f} 2 ${18 * f} Z`} fill={c.accent} stroke={line} strokeWidth={2.2} strokeLinejoin="round" />,
      <path key="cr2" d={`M${cx - 7} ${ct + 2} q-4 ${-14 * f} 1 ${-16 * f} q-1 ${11 * f} 4 ${14 * f} Z`} fill={c.accent} stroke={line} strokeWidth={2.2} strokeLinejoin="round" />,
    )
  } else if (species === 'frog') {
    front.push(
      <circle key="sp1" cx={cx - rx * 0.5} cy={eyeY - eyeR} r={3.6} fill={c.shade} opacity={0.55} />,
      <circle key="sp2" cx={cx + rx * 0.5} cy={eyeY - eyeR} r={3.6} fill={c.shade} opacity={0.55} />,
    )
  }

  // ---------- eyes ----------
  const eyes: JSX.Element[] = []
  for (const d of [-1, 1] as const) {
    const ex = cx + d * eyeDX
    if (happy) {
      eyes.push(<path key={`e${d}`} d={`M${ex - eyeR * 0.7} ${eyeY} q${eyeR * 0.7} ${-eyeR} ${eyeR * 1.4} 0`} fill="none" stroke={line} strokeWidth={3} strokeLinecap="round" />)
    } else {
      eyes.push(
        <g key={`e${d}`}>
          <ellipse cx={ex} cy={eyeY} rx={eyeR * 0.86} ry={eyeR} fill="#fff" stroke={line} strokeWidth={2.4} />
          <circle cx={ex + eyeR * 0.1} cy={eyeY + eyeR * 0.18} r={eyeR * 0.5} fill="#1c2530" />
          <circle cx={ex - eyeR * 0.16} cy={eyeY - eyeR * 0.22} r={eyeR * 0.2} fill="#fff" />
          <circle cx={ex + eyeR * 0.24} cy={eyeY + eyeR * 0.34} r={eyeR * 0.1} fill="#fff" />
        </g>,
      )
    }
  }

  // ---------- cheeks + mouth/beak ----------
  const face: JSX.Element[] = [
    <ellipse key="ch1" cx={cx - rx * 0.5} cy={cheekY} rx={5} ry={3.3} fill="#ff9a9a" opacity={0.5} />,
    <ellipse key="ch2" cx={cx + rx * 0.5} cy={cheekY} rx={5} ry={3.3} fill="#ff9a9a" opacity={0.5} />,
  ]
  if (species === 'bird') {
    face.push(<path key="beak" d={`M${cx - 7} ${noseY} l7 9 l7 -9 Z`} fill={c.accent} stroke={line} strokeWidth={2.2} strokeLinejoin="round" />)
  } else {
    const mw = species === 'frog' ? 13 : 8
    face.push(
      happy ? (
        <path key="m" d={`M${cx - mw} ${mouthY} q${mw} 9 ${mw * 2} 0 Z`} fill={line} opacity={0.82} />
      ) : (
        <path key="m" d={`M${cx - mw} ${mouthY} q${mw} 6 ${mw * 2} 0`} fill="none" stroke={line} strokeWidth={2.6} strokeLinecap="round" />
      ),
    )
  }

  // ---------- elder spectacles ----------
  const elderBits: JSX.Element[] = []
  if (st.elder) {
    elderBits.push(
      <g key="g" stroke={line} strokeWidth={2.4} fill="none">
        <circle cx={cx - eyeDX} cy={eyeY} r={eyeR + 3} />
        <circle cx={cx + eyeDX} cy={eyeY} r={eyeR + 3} />
        <line x1={cx - eyeDX + eyeR + 2} y1={eyeY} x2={cx + eyeDX - eyeR - 2} y2={eyeY} />
      </g>,
    )
  }

  return (
    <svg viewBox="0 0 140 140" width={size} height={size} style={{ overflow: 'visible', display: 'block' }} role="img" aria-label={`${species} companion`}>
      {st.elder && <circle cx={cx} cy={cy} r={Math.max(rx, ry) * 1.4} fill={c.accent} opacity={0.18} className="cr-aura" />}
      {behind}
      {body}
      {front}
      {eyes}
      {face}
      {elderBits}
      {prestige > 0 && (
        <path d={`M${cx - 13} ${topY - 10} l4 -10 l5 6 l5 -8 l5 8 l5 -6 l4 10 Z`} fill="#e9c44a" stroke="#b9962f" strokeWidth={1.4} strokeLinejoin="round" />
      )}
    </svg>
  )
}
