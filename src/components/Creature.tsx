import type { JSX } from 'react'
import type { PetSpecies } from '../types'

// Detailed, kawaii-sticker creatures — bold dark outlines, shaded belly,
// expressive sparkly eyes, cheeks, and per-species features (leaf / fins / wings
// / horns / crest). They physically evolve across six stages (grow, sprout
// limbs, develop their feature) and the Elder earns spectacles + a soft aura.

interface Cfg {
  body: string
  shade: string
  belly: string
  line: string
  accent: string // feature colour (leaf / fin / wing / crest / beak)
  horn?: string
  plates?: boolean // segmented belly (dragon)
}

const SPP: Record<PetSpecies, Cfg> = {
  sprout: { body: '#67c84f', shade: '#41a23a', belly: '#ecf7d6', line: '#245d22', accent: '#3fae5e' },
  frog: { body: '#41bf9c', shade: '#1f927a', belly: '#e2f5ec', line: '#14584a', accent: '#2f9e7f' },
  fish: { body: '#46a6e4', shade: '#2a79bd', belly: '#e3f1fc', line: '#173f63', accent: '#7cc4ef' },
  dragon: { body: '#f0934a', shade: '#d2702a', belly: '#fbe3c8', line: '#7a3a12', accent: '#f6c290', horn: '#f2e6c8', plates: true },
  bird: { body: '#f3c042', shade: '#d99b1f', belly: '#fdf2cf', line: '#6f5210', accent: '#ef8f4a' },
}

interface StageDef {
  s: number // overall scale
  f: number // feature development
  arms: boolean
  wings?: boolean
  elder?: boolean
}
const STAGES: StageDef[] = [
  { s: 0.72, f: 0.5, arms: false },
  { s: 0.8, f: 0.66, arms: true },
  { s: 0.88, f: 0.85, arms: true, wings: true },
  { s: 0.94, f: 0.96, arms: true, wings: true },
  { s: 1.0, f: 1.08, arms: true, wings: true },
  { s: 1.0, f: 1.13, arms: true, wings: true, elder: true },
]

const cx = 70
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

  const S = st.s
  const wrap = `translate(${cx * (1 - S)} ${126 * (1 - S)}) scale(${S})`

  const behind: JSX.Element[] = []
  const body: JSX.Element[] = []
  const front: JSX.Element[] = []

  // ---------- back features (wings / tail / fins / lily pad) ----------
  if (species === 'dragon') {
    behind.push(
      <path key="tail" d={`M92 104 q26 6 30 -16 q1 -10 -8 -12 q6 8 -2 14 q-8 5 -22 4 Z`} fill={c.body} stroke={line} strokeWidth={LW} strokeLinejoin="round" />,
      <path key="ttip" d={`M118 74 l12 -7 l-2 9 l8 4 l-12 5 Z`} fill={c.shade} stroke={line} strokeWidth={LW} strokeLinejoin="round" />,
    )
    if (st.wings) {
      for (const d of [-1, 1] as const) {
        const bx = cx + d * 30
        behind.push(
          <path key={`w${d}`} d={`M${bx} 66 q${d * 34 * f} ${-26 * f} ${d * 40 * f} ${6 * f} q${-d * 8 * f} ${-2} ${-d * 13 * f} ${4 * f} q${-d * 2} ${6 * f} ${-d * 9 * f} ${2 * f} q${-d * 2} ${5 * f} ${-d * 9 * f} ${1 * f} Z`} fill={c.accent} stroke={line} strokeWidth={LW} strokeLinejoin="round" />,
        )
      }
    }
  } else if (species === 'bird') {
    // tail feathers
    behind.push(
      <g key="tf">
        {[-14, 0, 14].map((a) => (
          <ellipse key={a} cx={cx} cy={118} rx={7} ry={20 * f} fill={c.accent} stroke={line} strokeWidth={2.4} transform={`rotate(${a} ${cx} 110)`} />
        ))}
      </g>,
    )
    if (st.wings) {
      for (const d of [-1, 1] as const) {
        const bx = cx + d * 36
        behind.push(<ellipse key={`bw${d}`} cx={bx} cy={86} rx={13 * f} ry={22 * f} fill={c.body} stroke={line} strokeWidth={LW} transform={`rotate(${d * 16} ${bx} 86)`} />)
      }
    }
  } else if (isFish) {
    // big caudal tail fin + side fins (no arms/legs)
    behind.push(
      <path key="caud" d={`M${cx} 110 q-26 6 -30 26 q22 -4 30 -10 q8 6 30 10 q-4 -20 -30 -26 Z`} fill={c.accent} stroke={line} strokeWidth={LW} strokeLinejoin="round" />,
    )
    for (const d of [-1, 1] as const) {
      const bx = cx + d * 40
      behind.push(<path key={`sf${d}`} d={`M${bx} 84 q${d * 22 * f} ${-6} ${d * 26 * f} ${14 * f} q${-d * 14} ${0} ${-d * 26 * f} ${-6} Z`} fill={c.accent} stroke={line} strokeWidth={LW} strokeLinejoin="round" />)
    }
  } else if (species === 'frog' && level >= 3) {
    behind.push(<ellipse key="pad" cx={cx} cy={124} rx={54} ry={11} fill={c.accent} stroke={line} strokeWidth={2} opacity={0.5} />)
  }

  // ---------- feet ----------
  if (!isFish) {
    const wide = species === 'frog' ? 18 : 15
    body.push(
      <ellipse key="f1" cx={cx - 20} cy={120} rx={wide} ry={10} fill={c.shade} stroke={line} strokeWidth={LW} />,
      <ellipse key="f2" cx={cx + 20} cy={120} rx={wide} ry={10} fill={c.shade} stroke={line} strokeWidth={LW} />,
    )
  }

  // ---------- body ----------
  body.push(<ellipse key="body" cx={cx} cy={78} rx={42} ry={44} fill={c.body} stroke={line} strokeWidth={LW} />)
  body.push(<path key="sh" d={`M30 92 a42 44 0 0 0 80 0 a42 44 0 0 1 -80 0 Z`} fill={c.shade} opacity={0.22} />)

  // belly
  body.push(<ellipse key="belly" cx={cx} cy={92} rx={26} ry={30} fill={c.belly} stroke={line} strokeWidth={2} />)
  if (c.plates) {
    body.push(
      <path key="s1" d={`M${cx - 18} 84 q18 9 36 0`} fill="none" stroke={line} strokeWidth={1.6} opacity={0.5} />,
      <path key="s2" d={`M${cx - 18} 98 q18 9 36 0`} fill="none" stroke={line} strokeWidth={1.6} opacity={0.5} />,
    )
  }

  // arms (fish uses side fins instead)
  if (st.arms && !isFish) {
    body.push(
      <ellipse key="a1" cx={cx - 38} cy={88} rx={10} ry={13} fill={c.body} stroke={line} strokeWidth={LW} transform={`rotate(18 ${cx - 38} 88)`} />,
      <ellipse key="a2" cx={cx + 38} cy={88} rx={10} ry={13} fill={c.body} stroke={line} strokeWidth={LW} transform={`rotate(-18 ${cx + 38} 88)`} />,
    )
  }

  // ---------- head features ----------
  if (species === 'dragon') {
    const h = f
    front.push(
      <path key="h1" d={`M${cx - 16} 42 q-4 ${-20 * h} 6 ${-24 * h} q-2 ${12 * h} 4 ${20 * h} Z`} fill={c.horn} stroke={line} strokeWidth={LW} strokeLinejoin="round" />,
      <path key="h2" d={`M${cx + 16} 42 q4 ${-20 * h} -6 ${-24 * h} q2 ${12 * h} -4 ${20 * h} Z`} fill={c.horn} stroke={line} strokeWidth={LW} strokeLinejoin="round" />,
      <path key="ridge" d={`M${cx - 10} 40 l4 -7 l5 6 l5 -6 l4 7`} fill="none" stroke={line} strokeWidth={2.2} strokeLinejoin="round" opacity={0.6} />,
    )
  } else if (species === 'sprout') {
    const top = 38
    front.push(<path key="stem" d={`M${cx} ${top} L${cx} ${top - 20 * f}`} stroke={c.accent} strokeWidth={4} strokeLinecap="round" fill="none" />)
    if (level >= 4) {
      const ty = top - 20 * f
      front.push(
        <g key="bloom">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx={cx} cy={ty} rx={5} ry={9 * f} fill={st.elder ? '#e9eef0' : '#f5a9c3'} stroke={line} strokeWidth={1.6} transform={`rotate(${a} ${cx} ${ty})`} />
          ))}
          <circle cx={cx} cy={ty} r={4.5} fill="#f4d35e" stroke={line} strokeWidth={1.6} />
        </g>,
      )
    } else {
      const ty = top - 20 * f
      front.push(<ellipse key="leaf" cx={cx} cy={ty} rx={7 * f} ry={13 * f} fill={c.accent} stroke={line} strokeWidth={2} transform={`rotate(-28 ${cx} ${ty})`} />)
      if (f > 0.7) front.push(<ellipse key="leaf2" cx={cx} cy={ty + 4} rx={7 * f} ry={13 * f} fill={c.accent} stroke={line} strokeWidth={2} transform={`rotate(28 ${cx} ${ty + 4})`} />)
    }
  } else if (species === 'fish') {
    front.push(<path key="dorsal" d={`M${cx - 14 * f} 44 q${14 * f} ${-22 * f} ${28 * f} 0 Z`} fill={c.accent} stroke={line} strokeWidth={LW} strokeLinejoin="round" />)
  } else if (species === 'bird') {
    const ct = 40
    front.push(
      <path key="cr1" d={`M${cx} ${ct} q-3 ${-18 * f} 4 ${-21 * f} q-2 ${13 * f} 2 ${18 * f} Z`} fill={c.accent} stroke={line} strokeWidth={2.2} strokeLinejoin="round" />,
      <path key="cr2" d={`M${cx - 7} ${ct + 2} q-4 ${-14 * f} 1 ${-16 * f} q-1 ${11 * f} 4 ${14 * f} Z`} fill={c.accent} stroke={line} strokeWidth={2.2} strokeLinejoin="round" />,
    )
  } else if (species === 'frog') {
    front.push(
      <circle key="sp1" cx={cx - 22} cy={56} r={4} fill={c.shade} opacity={0.6} />,
      <circle key="sp2" cx={cx + 22} cy={56} r={4} fill={c.shade} opacity={0.6} />,
    )
  }

  // ---------- eyes ----------
  const eyes: JSX.Element[] = []
  if (happy) {
    for (const d of [-1, 1] as const) {
      const ex = cx + d * 15
      eyes.push(<path key={`e${d}`} d={`M${ex - 7} 70 q7 -8 14 0`} fill="none" stroke={line} strokeWidth={3} strokeLinecap="round" />)
    }
  } else {
    for (const d of [-1, 1] as const) {
      const ex = cx + d * 15
      eyes.push(
        <g key={`e${d}`}>
          <ellipse cx={ex} cy={70} rx={10} ry={12} fill="#fff" stroke={line} strokeWidth={2.4} />
          <circle cx={ex + 1} cy={72} r={5.5} fill="#1c2530" />
          <circle cx={ex - 1.5} cy={69} r={2} fill="#fff" />
          <circle cx={ex + 2.5} cy={74} r={1.1} fill="#fff" />
        </g>,
      )
    }
  }

  // ---------- cheeks + mouth/beak ----------
  const face: JSX.Element[] = [
    <ellipse key="ch1" cx={cx - 24} cy={84} rx={5} ry={3.4} fill="#ff9a9a" opacity={0.5} />,
    <ellipse key="ch2" cx={cx + 24} cy={84} rx={5} ry={3.4} fill="#ff9a9a" opacity={0.5} />,
  ]
  if (species === 'bird') {
    face.push(<path key="beak" d={`M${cx - 7} 84 l7 9 l7 -9 Z`} fill={c.accent} stroke={line} strokeWidth={2.2} strokeLinejoin="round" />)
  } else {
    const mw = species === 'frog' ? 13 : 8
    face.push(
      happy ? (
        <path key="m" d={`M${cx - mw} 86 q${mw} 9 ${mw * 2} 0 Z`} fill={line} opacity={0.82} />
      ) : (
        <path key="m" d={`M${cx - mw} 87 q${mw} 6 ${mw * 2} 0`} fill="none" stroke={line} strokeWidth={2.6} strokeLinecap="round" />
      ),
    )
  }

  // ---------- elder spectacles ----------
  const elderBits: JSX.Element[] = []
  if (st.elder) {
    elderBits.push(
      <g key="g" stroke={line} strokeWidth={2.4} fill="none">
        <circle cx={cx - 15} cy={70} r={13} />
        <circle cx={cx + 15} cy={70} r={13} />
        <line x1={cx - 2} y1={70} x2={cx + 2} y2={70} />
      </g>,
    )
  }

  return (
    <svg viewBox="0 0 140 140" width={size} height={size} style={{ overflow: 'visible', display: 'block' }} role="img" aria-label={`${species} companion`}>
      {st.elder && <circle cx={cx} cy={84} r={64} fill={c.accent} opacity={0.18} className="cr-aura" />}
      <g transform={wrap}>
        {behind}
        {body}
        {front}
        {eyes}
        {face}
        {elderBits}
        {prestige > 0 && (
          <path d={`M${cx - 13} 22 l4 -10 l5 6 l5 -8 l5 8 l5 -6 l4 10 Z`} fill="#e9c44a" stroke="#b9962f" strokeWidth={1.4} strokeLinejoin="round" />
        )}
      </g>
    </svg>
  )
}
