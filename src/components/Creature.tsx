import type { JSX } from 'react'
import type { PetSpecies } from '../types'

// Detailed kawaii creatures that genuinely MATURE as they evolve — not just
// scaled or stretched. We model a head + a torso: a baby is almost all head
// with huge eyes and no real body; with each stage the head shrinks relative to
// a taller torso, the creature sprouts legs and stands up, limbs lengthen, a
// snout/features develop, and the eyes shrink and rise — ending in a slender,
// dignified Elder with spectacles.

interface Cfg {
  body: string
  shade: string
  belly: string
  line: string
  accent: string
  horn?: string
  plates?: boolean
  snout?: boolean // grows a muzzle as it matures (dragon)
}

const SPP: Record<PetSpecies, Cfg> = {
  sprout: { body: '#67c84f', shade: '#41a23a', belly: '#ecf7d6', line: '#245d22', accent: '#3fae5e' },
  frog: { body: '#41bf9c', shade: '#1f927a', belly: '#e2f5ec', line: '#14584a', accent: '#2f9e7f' },
  fish: { body: '#46a6e4', shade: '#2a79bd', belly: '#e3f1fc', line: '#173f63', accent: '#7cc4ef' },
  dragon: { body: '#f0934a', shade: '#d2702a', belly: '#fbe3c8', line: '#7a3a12', accent: '#f6c290', horn: '#f2e6c8', plates: true, snout: true },
  bird: { body: '#f3c042', shade: '#d99b1f', belly: '#fdf2cf', line: '#6f5210', accent: '#ef8f4a' },
}

interface StageDef {
  headR: number
  torsoRx: number
  torsoRy: number
  legLen: number
  eye: number
  arms: boolean
  wings?: boolean
  snout: number // 0..1
  f: number // feature development
  elder?: boolean
}
// Baby = giant head, no body, huge eyes, sitting. Each stage: head shrinks vs a
// taller torso, legs grow (it stands), eyes shrink, snout/features develop.
const STAGES: StageDef[] = [
  { headR: 34, torsoRx: 23, torsoRy: 14, legLen: 0, eye: 11.5, arms: false, snout: 0, f: 0.45 }, // Baby
  { headR: 31, torsoRx: 27, torsoRy: 22, legLen: 0, eye: 10.2, arms: true, snout: 0, f: 0.62 }, // Toddler
  { headR: 27, torsoRx: 29, torsoRy: 27, legLen: 7, eye: 9.2, arms: true, wings: true, snout: 0.4, f: 0.82 }, // Adolescent
  { headR: 24, torsoRx: 29, torsoRy: 32, legLen: 11, eye: 8.5, arms: true, wings: true, snout: 0.7, f: 0.96 }, // Young Adult
  { headR: 22, torsoRx: 29, torsoRy: 36, legLen: 13, eye: 8, arms: true, wings: true, snout: 1, f: 1.08 }, // Adult
  { headR: 22, torsoRx: 28, torsoRy: 36, legLen: 12, eye: 7.6, arms: true, wings: true, snout: 1, f: 1.12, elder: true }, // Elder
]

const cx = 70
const FLOOR = 120
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
  const g = STAGES[Math.max(0, Math.min(5, level))]
  const c = SPP[species] ?? SPP.frog
  const line = g.elder ? '#5b6770' : c.line
  const f = g.f
  const isFish = species === 'fish'

  // ----- vertical stack: legs (bottom) → torso → head (top) -----
  const torsoBottom = FLOOR - g.legLen
  const torsoCy = torsoBottom - g.torsoRy
  const torsoTop = torsoCy - g.torsoRy
  const headR = g.headR
  const headCy = torsoTop - headR * 0.5
  const headTop = headCy - headR

  const eyeR = g.eye
  const eyeY = headCy + headR * 0.06
  const eyeDX = headR * 0.42
  const snoutCy = eyeY + eyeR + 4 + g.snout * 3
  const mouthY = g.snout > 0.2 ? snoutCy + 4 : eyeY + eyeR + 8
  const cheekY = eyeY + eyeR + 1

  const behind: JSX.Element[] = []
  const mid: JSX.Element[] = []
  const front: JSX.Element[] = []

  // ---------- back features ----------
  if (species === 'dragon') {
    const tx = cx + g.torsoRx * 0.5
    const ty = torsoCy + g.torsoRy * 0.4
    behind.push(
      <path key="tail" d={`M${tx} ${ty} q26 8 30 -14 q1 -10 -8 -12 q6 8 -2 14 q-8 6 -22 4 Z`} fill={c.body} stroke={line} strokeWidth={LW} strokeLinejoin="round" />,
      <path key="ttip" d={`M${tx + 26} ${ty - 26} l12 -7 l-2 9 l8 4 l-12 5 Z`} fill={c.shade} stroke={line} strokeWidth={LW} strokeLinejoin="round" />,
    )
    if (g.wings) {
      const wy = torsoCy - g.torsoRy * 0.25
      for (const d of [-1, 1] as const) {
        const bx = cx + d * g.torsoRx * 0.7
        behind.push(<path key={`w${d}`} d={`M${bx} ${wy} q${d * 34 * f} ${-26 * f} ${d * 40 * f} ${6 * f} q${-d * 8 * f} ${-2} ${-d * 13 * f} ${4 * f} q${-d * 2} ${6 * f} ${-d * 9 * f} ${2 * f} q${-d * 2} ${5 * f} ${-d * 9 * f} ${1 * f} Z`} fill={c.accent} stroke={line} strokeWidth={LW} strokeLinejoin="round" />)
      }
    }
  } else if (species === 'bird') {
    if (g.wings) {
      const wy = torsoCy
      for (const d of [-1, 1] as const) {
        const bx = cx + d * g.torsoRx * 0.92
        behind.push(<ellipse key={`bw${d}`} cx={bx} cy={wy} rx={12 * f} ry={20 * f} fill={c.body} stroke={line} strokeWidth={LW} transform={`rotate(${d * 16} ${bx} ${wy})`} />)
      }
    }
    behind.push(
      <g key="tf">
        {[-13, 0, 13].map((a) => (
          <ellipse key={a} cx={cx} cy={FLOOR + 2} rx={6} ry={16 * f} fill={c.accent} stroke={line} strokeWidth={2.2} transform={`rotate(${a} ${cx} ${FLOOR - 6})`} />
        ))}
      </g>,
    )
  } else if (isFish) {
    const ty = torsoBottom
    behind.push(<path key="caud" d={`M${cx} ${ty - 4} q-24 6 -28 24 q20 -4 28 -10 q8 6 28 10 q-4 -18 -28 -24 Z`} fill={c.accent} stroke={line} strokeWidth={LW} strokeLinejoin="round" />)
    const sy = torsoCy
    for (const d of [-1, 1] as const) {
      const bx = cx + d * g.torsoRx * 0.95
      behind.push(<path key={`sf${d}`} d={`M${bx} ${sy} q${d * 22 * f} ${-6} ${d * 26 * f} ${14 * f} q${-d * 14} 0 ${-d * 26 * f} ${-6} Z`} fill={c.accent} stroke={line} strokeWidth={LW} strokeLinejoin="round" />)
    }
  } else if (species === 'frog' && level >= 3) {
    behind.push(<ellipse key="pad" cx={cx} cy={FLOOR + 3} rx={g.torsoRx * 1.5} ry={10} fill={c.accent} stroke={line} strokeWidth={2} opacity={0.5} />)
  }

  // ---------- legs / feet ----------
  if (!isFish) {
    const footW = species === 'frog' ? 13 : 11
    if (g.legLen > 0) {
      for (const d of [-1, 1] as const) {
        const lx = cx + d * g.torsoRx * 0.46
        mid.push(
          <rect key={`leg${d}`} x={lx - 6} y={torsoBottom - 4} width={12} height={g.legLen + 6} rx={6} fill={c.body} stroke={line} strokeWidth={LW} />,
          <ellipse key={`foot${d}`} cx={lx + d * 2} cy={FLOOR} rx={footW} ry={7} fill={c.shade} stroke={line} strokeWidth={LW} />,
        )
      }
    } else {
      for (const d of [-1, 1] as const) {
        mid.push(<ellipse key={`foot${d}`} cx={cx + d * g.torsoRx * 0.5} cy={torsoBottom + 1} rx={footW} ry={8} fill={c.shade} stroke={line} strokeWidth={LW} />)
      }
    }
  }

  // ---------- torso ----------
  mid.push(<ellipse key="torso" cx={cx} cy={torsoCy} rx={g.torsoRx} ry={g.torsoRy} fill={c.body} stroke={line} strokeWidth={LW} />)
  mid.push(<path key="tsh" d={`M${cx - g.torsoRx} ${torsoCy + g.torsoRy * 0.2} a${g.torsoRx} ${g.torsoRy} 0 0 0 ${g.torsoRx * 2} 0 a${g.torsoRx} ${g.torsoRy} 0 0 1 ${-g.torsoRx * 2} 0 Z`} fill={c.shade} opacity={0.2} />)
  // belly on torso
  const bRx = g.torsoRx * 0.62
  const bRy = g.torsoRy * 0.62
  const bCy = torsoCy + g.torsoRy * 0.24
  mid.push(<ellipse key="belly" cx={cx} cy={bCy} rx={bRx} ry={bRy} fill={c.belly} stroke={line} strokeWidth={2} />)
  if (c.plates) {
    mid.push(
      <path key="s1" d={`M${cx - bRx * 0.7} ${bCy - bRy * 0.25} q${bRx * 0.7} ${bRy * 0.3} ${bRx * 1.4} 0`} fill="none" stroke={line} strokeWidth={1.5} opacity={0.5} />,
      <path key="s2" d={`M${cx - bRx * 0.7} ${bCy + bRy * 0.2} q${bRx * 0.7} ${bRy * 0.3} ${bRx * 1.4} 0`} fill="none" stroke={line} strokeWidth={1.5} opacity={0.5} />,
    )
  }
  // arms on torso (fish uses fins)
  if (g.arms && !isFish) {
    const ay = torsoCy - g.torsoRy * 0.15
    const armRy = 10 + level * 1.4
    mid.push(
      <ellipse key="a1" cx={cx - g.torsoRx - 1} cy={ay} rx={7.5} ry={armRy} fill={c.body} stroke={line} strokeWidth={LW} transform={`rotate(14 ${cx - g.torsoRx - 1} ${ay})`} />,
      <ellipse key="a2" cx={cx + g.torsoRx + 1} cy={ay} rx={7.5} ry={armRy} fill={c.body} stroke={line} strokeWidth={LW} transform={`rotate(-14 ${cx + g.torsoRx + 1} ${ay})`} />,
    )
  }

  // ---------- head ----------
  front.push(<circle key="head" cx={cx} cy={headCy} r={headR} fill={c.body} stroke={line} strokeWidth={LW} />)

  // head-top features
  if (species === 'dragon') {
    const h = f
    for (const d of [-1, 1] as const) {
      const hx = cx + d * headR * 0.42
      front.push(<path key={`h${d}`} d={`M${hx} ${headTop + 6} q${-d * 4} ${-20 * h} ${d * 6} ${-24 * h} q${-d * 2} ${12 * h} ${d * 4} ${20 * h} Z`} fill={c.horn} stroke={line} strokeWidth={LW} strokeLinejoin="round" />)
    }
  } else if (species === 'sprout') {
    const sy = headTop + 2
    const ty = sy - 20 * f
    front.push(<path key="stem" d={`M${cx} ${sy} L${cx} ${ty}`} stroke={c.accent} strokeWidth={4} strokeLinecap="round" fill="none" />)
    if (level >= 4) {
      front.push(
        <g key="bloom">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx={cx} cy={ty} rx={5} ry={9 * f} fill={g.elder ? '#e9eef0' : '#f5a9c3'} stroke={line} strokeWidth={1.6} transform={`rotate(${a} ${cx} ${ty})`} />
          ))}
          <circle cx={cx} cy={ty} r={4.5} fill="#f4d35e" stroke={line} strokeWidth={1.6} />
        </g>,
      )
    } else {
      front.push(<ellipse key="leaf" cx={cx} cy={ty} rx={7 * f} ry={13 * f} fill={c.accent} stroke={line} strokeWidth={2} transform={`rotate(-28 ${cx} ${ty})`} />)
      if (f > 0.7) front.push(<ellipse key="leaf2" cx={cx} cy={ty + 4} rx={7 * f} ry={13 * f} fill={c.accent} stroke={line} strokeWidth={2} transform={`rotate(28 ${cx} ${ty + 4})`} />)
    }
  } else if (isFish) {
    front.push(<path key="dorsal" d={`M${cx - 13 * f} ${headTop + 6} q${13 * f} ${-20 * f} ${26 * f} 0 Z`} fill={c.accent} stroke={line} strokeWidth={LW} strokeLinejoin="round" />)
  } else if (species === 'bird') {
    const ct = headTop + 2
    front.push(
      <path key="cr1" d={`M${cx} ${ct} q-3 ${-17 * f} 4 ${-20 * f} q-2 ${12 * f} 2 ${17 * f} Z`} fill={c.accent} stroke={line} strokeWidth={2.2} strokeLinejoin="round" />,
      <path key="cr2" d={`M${cx - 6} ${ct + 2} q-4 ${-13 * f} 1 ${-15 * f} q-1 ${10 * f} 4 ${13 * f} Z`} fill={c.accent} stroke={line} strokeWidth={2.2} strokeLinejoin="round" />,
    )
  } else if (species === 'frog') {
    front.push(
      <circle key="sp1" cx={cx - headR * 0.5} cy={headTop + headR * 0.5} r={3.4} fill={c.shade} opacity={0.55} />,
      <circle key="sp2" cx={cx + headR * 0.5} cy={headTop + headR * 0.5} r={3.4} fill={c.shade} opacity={0.55} />,
    )
  }

  // snout / muzzle (dragon, grows with age)
  if (c.snout && g.snout > 0.2) {
    front.push(<ellipse key="snout" cx={cx} cy={snoutCy} rx={headR * (0.36 + g.snout * 0.12)} ry={headR * (0.24 + g.snout * 0.06)} fill={c.belly} stroke={line} strokeWidth={2} />)
    front.push(<circle key="nl" cx={cx - 4} cy={snoutCy - 1} r={1.3} fill={line} />, <circle key="nr" cx={cx + 4} cy={snoutCy - 1} r={1.3} fill={line} />)
  }

  // ---------- eyes ----------
  for (const d of [-1, 1] as const) {
    const ex = cx + d * eyeDX
    if (happy) {
      front.push(<path key={`e${d}`} d={`M${ex - eyeR * 0.7} ${eyeY} q${eyeR * 0.7} ${-eyeR} ${eyeR * 1.4} 0`} fill="none" stroke={line} strokeWidth={3} strokeLinecap="round" />)
    } else {
      front.push(
        <g key={`e${d}`}>
          <ellipse cx={ex} cy={eyeY} rx={eyeR * 0.86} ry={eyeR} fill="#fff" stroke={line} strokeWidth={2.4} />
          <circle cx={ex + eyeR * 0.1} cy={eyeY + eyeR * 0.18} r={eyeR * 0.5} fill="#1c2530" />
          <circle cx={ex - eyeR * 0.16} cy={eyeY - eyeR * 0.22} r={eyeR * 0.2} fill="#fff" />
          <circle cx={ex + eyeR * 0.24} cy={eyeY + eyeR * 0.34} r={eyeR * 0.1} fill="#fff" />
        </g>,
      )
    }
  }

  // cheeks + mouth/beak
  front.push(
    <ellipse key="ch1" cx={cx - headR * 0.56} cy={cheekY} rx={4.6} ry={3.1} fill="#ff9a9a" opacity={0.5} />,
    <ellipse key="ch2" cx={cx + headR * 0.56} cy={cheekY} rx={4.6} ry={3.1} fill="#ff9a9a" opacity={0.5} />,
  )
  if (species === 'bird') {
    front.push(<path key="beak" d={`M${cx - 7} ${eyeY + eyeR + 2} l7 9 l7 -9 Z`} fill={c.accent} stroke={line} strokeWidth={2.2} strokeLinejoin="round" />)
  } else {
    const mw = species === 'frog' ? 12 : 7
    front.push(
      happy ? (
        <path key="m" d={`M${cx - mw} ${mouthY} q${mw} 8 ${mw * 2} 0 Z`} fill={line} opacity={0.82} />
      ) : (
        <path key="m" d={`M${cx - mw} ${mouthY} q${mw} 6 ${mw * 2} 0`} fill="none" stroke={line} strokeWidth={2.4} strokeLinecap="round" />
      ),
    )
  }

  if (g.elder) {
    front.push(
      <g key="glasses" stroke={line} strokeWidth={2.4} fill="none">
        <circle cx={cx - eyeDX} cy={eyeY} r={eyeR + 3} />
        <circle cx={cx + eyeDX} cy={eyeY} r={eyeR + 3} />
        <line x1={cx - eyeDX + eyeR + 2} y1={eyeY} x2={cx + eyeDX - eyeR - 2} y2={eyeY} />
      </g>,
    )
  }
  if (prestige > 0) {
    front.push(<path key="crown" d={`M${cx - 13} ${headTop - 8} l4 -10 l5 6 l5 -8 l5 8 l5 -6 l4 10 Z`} fill="#e9c44a" stroke="#b9962f" strokeWidth={1.4} strokeLinejoin="round" />)
  }

  return (
    <svg viewBox="0 0 140 140" width={size} height={size} style={{ overflow: 'visible', display: 'block' }} role="img" aria-label={`${species} companion`}>
      {g.elder && <circle cx={cx} cy={torsoCy} r={Math.max(g.torsoRx, g.torsoRy) * 1.5} fill={c.accent} opacity={0.16} className="cr-aura" />}
      {behind}
      {mid}
      {front}
    </svg>
  )
}
