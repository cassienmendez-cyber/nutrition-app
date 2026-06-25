import type { JSX } from 'react'
import type { PetSpecies } from '../types'

// Detailed kawaii creatures that genuinely MATURE as they evolve, each in its
// own way. Shared arc: a baby is almost all head with huge eyes and no body;
// each stage shrinks the head relative to a taller torso, sprouts limbs and
// stands up, and shrinks/raises the eyes. On top of that, per-species "notes"
// give each its own growing-up character (frog haunches + top eyes, bird twig
// legs + beak, fish streamlining + fins, dragon horns/wings/snout/spikes,
// sprout leaves → bloom).

interface Cfg {
  body: string
  shade: string
  belly: string
  line: string
  accent: string
  horn?: string
  plates?: boolean
  snout?: boolean
}

const SPP: Record<PetSpecies, Cfg> = {
  sprout: { body: '#67c84f', shade: '#41a23a', belly: '#ecf7d6', line: '#245d22', accent: '#3fae5e' },
  frog: { body: '#41bf9c', shade: '#1f927a', belly: '#e2f5ec', line: '#14584a', accent: '#2f9e7f' },
  fish: { body: '#46a6e4', shade: '#2a79bd', belly: '#e3f1fc', line: '#173f63', accent: '#7cc4ef' },
  dragon: { body: '#f0934a', shade: '#d2702a', belly: '#fbe3c8', line: '#7a3a12', accent: '#f6c290', horn: '#f2e6c8', plates: true, snout: true },
  bird: { body: '#f3c042', shade: '#d99b1f', belly: '#fdf2cf', line: '#6f5210', accent: '#ef8f4a' },
  // German Shepherd: tan coat, cream chest, black saddle / ears / muzzle.
  dog: { body: '#d79a52', shade: '#b67c31', belly: '#f1ddb6', line: '#2e2113', accent: '#2b2218' },
}

// Per-species growing-up notes.
type LegStyle = 'stand' | 'twig' | 'frog' | 'none'
const NOTES: Record<PetSpecies, { rxMul: number; ryMul: number; leg: LegStyle; eyeDy: number; topEyes?: boolean }> = {
  dragon: { rxMul: 1, ryMul: 1, leg: 'stand', eyeDy: 0 },
  sprout: { rxMul: 1.03, ryMul: 0.97, leg: 'stand', eyeDy: 1 },
  frog: { rxMul: 1.12, ryMul: 0.86, leg: 'frog', eyeDy: -3, topEyes: true },
  fish: { rxMul: 0.88, ryMul: 1.14, leg: 'none', eyeDy: 0 },
  bird: { rxMul: 0.9, ryMul: 1.0, leg: 'twig', eyeDy: 0 },
  dog: { rxMul: 1.02, ryMul: 0.98, leg: 'stand', eyeDy: 1 },
}

interface StageDef {
  headR: number
  torsoRx: number
  torsoRy: number
  legLen: number
  eye: number
  arms: boolean
  wings?: boolean
  snout: number
  f: number
  elder?: boolean
}
const STAGES: StageDef[] = [
  { headR: 37, torsoRx: 20, torsoRy: 11, legLen: 0, eye: 12.5, arms: false, snout: 0, f: 0.42 }, // Baby — almost all head
  { headR: 33, torsoRx: 26, torsoRy: 20, legLen: 0, eye: 10.6, arms: true, snout: 0, f: 0.6 }, // Toddler
  { headR: 28, torsoRx: 28, torsoRy: 28, legLen: 9, eye: 9.3, arms: true, wings: true, snout: 0.4, f: 0.82 }, // Adolescent
  { headR: 24, torsoRx: 28, torsoRy: 33, legLen: 13, eye: 8.4, arms: true, wings: true, snout: 0.7, f: 0.97 }, // Young Adult
  { headR: 21, torsoRx: 27, torsoRy: 37, legLen: 15, eye: 7.8, arms: true, wings: true, snout: 1, f: 1.1 }, // Adult
  { headR: 21, torsoRx: 26, torsoRy: 37, legLen: 14, eye: 7.4, arms: true, wings: true, snout: 1, f: 1.15, elder: true }, // Elder
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
  const lvl = Math.max(0, Math.min(5, level))
  const g = STAGES[lvl]
  const c = SPP[species] ?? SPP.frog
  const n = NOTES[species] ?? NOTES.frog
  const line = g.elder ? '#5b6770' : c.line
  const f = g.f
  const isFish = species === 'fish'
  const isDog = species === 'dog'

  // Per-species torso shaping; fish streamlines progressively (taller + narrower)
  const torsoRx = g.torsoRx * n.rxMul * (isFish ? 1 - lvl * 0.03 : 1)
  const torsoRy = g.torsoRy * n.ryMul * (isFish ? 1 + lvl * 0.05 : 1)
  const legLen = n.leg === 'none' ? 0 : g.legLen

  const torsoBottom = FLOOR - legLen
  const torsoCy = torsoBottom - torsoRy
  const torsoTop = torsoCy - torsoRy
  const headR = g.headR
  const headCy = torsoTop - headR * 0.5
  const headTop = headCy - headR

  const eyeR = g.eye
  const eyeY = headCy + headR * 0.06 + n.eyeDy
  const eyeDX = headR * 0.42
  const snoutCy = eyeY + eyeR + 4 + g.snout * 3
  const mouthY = g.snout > 0.2 ? snoutCy + 4 : eyeY + eyeR + 8
  const cheekY = eyeY + eyeR + 1

  const behind: JSX.Element[] = []
  const mid: JSX.Element[] = []
  const front: JSX.Element[] = []

  // ---------- back features ----------
  if (species === 'dragon') {
    const tx = cx + torsoRx * 0.5
    const ty = torsoCy + torsoRy * 0.4
    const ts = 0.7 + f * 0.5 // tail grows
    behind.push(
      <path key="tail" d={`M${tx} ${ty} q${26 * ts} ${8} ${30 * ts} ${-14} q1 -10 -8 -12 q6 8 -2 14 q-8 6 -22 4 Z`} fill={c.body} stroke={line} strokeWidth={LW} strokeLinejoin="round" />,
      <path key="ttip" d={`M${tx + 26 * ts} ${ty - 26 * ts} l12 -7 l-2 9 l8 4 l-12 5 Z`} fill={c.shade} stroke={line} strokeWidth={LW} strokeLinejoin="round" />,
    )
    if (g.wings) {
      const wm = 0.8 + (lvl - 2) * 0.18 // wings grow dramatically
      const wy = torsoCy - torsoRy * 0.25
      for (const d of [-1, 1] as const) {
        const bx = cx + d * torsoRx * 0.7
        behind.push(<path key={`w${d}`} d={`M${bx} ${wy} q${d * 36 * wm} ${-30 * wm} ${d * 44 * wm} ${6 * wm} q${-d * 9 * wm} ${-2} ${-d * 14 * wm} ${5 * wm} q${-d * 2} ${7 * wm} ${-d * 10 * wm} ${2 * wm} q${-d * 2} ${6 * wm} ${-d * 10 * wm} ${1 * wm} Z`} fill={c.accent} stroke={line} strokeWidth={LW} strokeLinejoin="round" />)
      }
    }
  } else if (species === 'bird') {
    if (g.wings) {
      const wy = torsoCy
      for (const d of [-1, 1] as const) {
        const bx = cx + d * torsoRx * 0.92
        behind.push(<ellipse key={`bw${d}`} cx={bx} cy={wy} rx={12 * f} ry={22 * f} fill={c.body} stroke={line} strokeWidth={LW} transform={`rotate(${d * 16} ${bx} ${wy})`} />)
      }
    }
    behind.push(
      <g key="tf">
        {[-16, 0, 16].map((a) => (
          <ellipse key={a} cx={cx} cy={FLOOR + 2} rx={6} ry={14 + 12 * f} fill={c.accent} stroke={line} strokeWidth={2.2} transform={`rotate(${a} ${cx} ${FLOOR - 8})`} />
        ))}
      </g>,
    )
  } else if (isFish) {
    const ty = torsoBottom
    const ts = 0.8 + f * 0.5
    behind.push(<path key="caud" d={`M${cx} ${ty - 4} q${-24 * ts} ${6} ${-28 * ts} ${24} q${20 * ts} -4 ${28 * ts} -10 q${8 * ts} 6 ${28 * ts} 10 q-4 ${-18} ${-28 * ts} ${-24} Z`} fill={c.accent} stroke={line} strokeWidth={LW} strokeLinejoin="round" />)
    const sy = torsoCy
    for (const d of [-1, 1] as const) {
      const bx = cx + d * torsoRx * 0.95
      behind.push(<path key={`sf${d}`} d={`M${bx} ${sy} q${d * 24 * f} ${-6} ${d * 28 * f} ${15 * f} q${-d * 15} 0 ${-d * 28 * f} ${-6} Z`} fill={c.accent} stroke={line} strokeWidth={LW} strokeLinejoin="round" />)
    }
  } else if (species === 'frog' && lvl >= 3) {
    behind.push(<ellipse key="pad" cx={cx} cy={FLOOR + 3} rx={torsoRx * 1.6} ry={10} fill={c.accent} stroke={line} strokeWidth={2} opacity={0.5} />)
  } else if (isDog) {
    // Bushy tail that fills out with age, sweeping down then up behind the hip.
    const tx = cx + torsoRx * 0.78
    const ty = torsoCy + torsoRy * 0.35
    const ts = 0.7 + f * 0.5
    behind.push(
      <path
        key="tail"
        d={`M${tx} ${ty} q${20 * ts} ${4 * ts} ${24 * ts} ${-18 * ts} q${4 * ts} ${-16 * ts} ${-4 * ts} ${-24 * ts} q${3 * ts} ${14 * ts} ${-8 * ts} ${20 * ts} q${-9 * ts} ${5 * ts} ${-12 * ts} ${18 * ts} Z`}
        fill={c.body}
        stroke={line}
        strokeWidth={LW}
        strokeLinejoin="round"
      />,
      <path key="tailtip" d={`M${tx + 18 * ts} ${ty - 36 * ts} q${4 * ts} ${-8 * ts} ${-4 * ts} ${-14 * ts} q${3 * ts} ${10 * ts} ${-6 * ts} ${14 * ts} Z`} fill={c.accent} stroke={line} strokeWidth={2.2} strokeLinejoin="round" opacity={0.9} />,
    )
  }

  // ---------- legs / feet ----------
  if (n.leg !== 'none') {
    if (n.leg === 'frog' && lvl >= 3) {
      // big folded haunches
      for (const d of [-1, 1] as const) {
        const hx = cx + d * torsoRx * 0.74
        mid.push(
          <ellipse key={`ha${d}`} cx={hx} cy={torsoBottom - 2} rx={13} ry={16} fill={c.body} stroke={line} strokeWidth={LW} transform={`rotate(${d * 18} ${hx} ${torsoBottom - 2})`} />,
          <ellipse key={`hf${d}`} cx={hx + d * 4} cy={FLOOR} rx={15} ry={6} fill={c.shade} stroke={line} strokeWidth={LW} />,
        )
      }
    } else if (g.legLen > 0) {
      const twig = n.leg === 'twig'
      for (const d of [-1, 1] as const) {
        const lx = cx + d * torsoRx * (twig ? 0.4 : 0.46)
        mid.push(
          <rect key={`leg${d}`} x={lx - (twig ? 2.5 : 6)} y={torsoBottom - 4} width={twig ? 5 : 12} height={g.legLen + 6} rx={twig ? 2.5 : 6} fill={twig ? c.accent : c.body} stroke={line} strokeWidth={twig ? 2.4 : LW} />,
          <ellipse key={`foot${d}`} cx={lx + d * 2} cy={FLOOR} rx={twig ? 9 : 11} ry={twig ? 5 : 7} fill={twig ? c.accent : c.shade} stroke={line} strokeWidth={twig ? 2.4 : LW} />,
        )
      }
    } else {
      const footW = species === 'frog' ? 13 : 11
      for (const d of [-1, 1] as const) {
        mid.push(<ellipse key={`foot${d}`} cx={cx + d * torsoRx * 0.5} cy={torsoBottom + 1} rx={footW} ry={8} fill={c.shade} stroke={line} strokeWidth={LW} />)
      }
    }
  }

  // ---------- torso ----------
  mid.push(<ellipse key="torso" cx={cx} cy={torsoCy} rx={torsoRx} ry={torsoRy} fill={c.body} stroke={line} strokeWidth={LW} />)
  mid.push(<path key="tsh" d={`M${cx - torsoRx} ${torsoCy + torsoRy * 0.2} a${torsoRx} ${torsoRy} 0 0 0 ${torsoRx * 2} 0 a${torsoRx} ${torsoRy} 0 0 1 ${-torsoRx * 2} 0 Z`} fill={c.shade} opacity={0.2} />)
  const bRx = torsoRx * 0.62
  const bRy = torsoRy * 0.62
  const bCy = torsoCy + torsoRy * 0.24
  mid.push(<ellipse key="belly" cx={cx} cy={bCy} rx={bRx} ry={bRy} fill={c.belly} stroke={line} strokeWidth={2} />)
  // German Shepherd black saddle riding HIGH over the back & shoulders, so the
  // chest below stays tan (like Riley). Clipped to the torso silhouette.
  if (isDog) {
    const clip = `saddle-${species}-${lvl}`
    mid.push(
      <clipPath key="sclip" id={clip}>
        <ellipse cx={cx} cy={torsoCy} rx={torsoRx} ry={torsoRy} />
      </clipPath>,
      <path
        key="saddle"
        clipPath={`url(#${clip})`}
        d={`M${cx - torsoRx} ${torsoCy - torsoRy * 0.32} Q${cx} ${torsoCy - torsoRy * 1.3} ${cx + torsoRx} ${torsoCy - torsoRy * 0.32} Q${cx + torsoRx * 0.5} ${torsoCy + torsoRy * 0.04} ${cx} ${torsoCy - torsoRy * 0.08} Q${cx - torsoRx * 0.5} ${torsoCy + torsoRy * 0.04} ${cx - torsoRx} ${torsoCy - torsoRy * 0.32} Z`}
        fill={c.accent}
        opacity={0.95}
      />,
    )
  }
  if (c.plates) {
    mid.push(
      <path key="s1" d={`M${cx - bRx * 0.7} ${bCy - bRy * 0.25} q${bRx * 0.7} ${bRy * 0.3} ${bRx * 1.4} 0`} fill="none" stroke={line} strokeWidth={1.5} opacity={0.5} />,
      <path key="s2" d={`M${cx - bRx * 0.7} ${bCy + bRy * 0.2} q${bRx * 0.7} ${bRy * 0.3} ${bRx * 1.4} 0`} fill="none" stroke={line} strokeWidth={1.5} opacity={0.5} />,
    )
  }
  // gills for an older fish
  if (isFish && lvl >= 4) {
    for (const d of [-1, 1] as const) {
      const gx = cx + d * torsoRx * 0.45
      mid.push(<path key={`gill${d}`} d={`M${gx} ${torsoCy - 6} q${d * 4} 6 0 12`} fill="none" stroke={line} strokeWidth={2} opacity={0.5} />)
    }
  }
  // arms (fish uses fins)
  if (g.arms && !isFish) {
    const ay = torsoCy - torsoRy * 0.15
    const armRy = 10 + lvl * 1.6
    mid.push(
      <ellipse key="a1" cx={cx - torsoRx - 1} cy={ay} rx={7.5} ry={armRy} fill={c.body} stroke={line} strokeWidth={LW} transform={`rotate(14 ${cx - torsoRx - 1} ${ay})`} />,
      <ellipse key="a2" cx={cx + torsoRx + 1} cy={ay} rx={7.5} ry={armRy} fill={c.body} stroke={line} strokeWidth={LW} transform={`rotate(-14 ${cx + torsoRx + 1} ${ay})`} />,
    )
  }

  // ---------- head ----------
  front.push(<circle key="head" cx={cx} cy={headCy} r={headR} fill={c.body} stroke={line} strokeWidth={LW} />)

  // frog eyes-on-top bumps (grow with age)
  if (n.topEyes && lvl >= 2) {
    for (const d of [-1, 1] as const) {
      front.push(<circle key={`bump${d}`} cx={cx + d * eyeDX} cy={headTop + headR * 0.34} r={eyeR + 2} fill={c.body} stroke={line} strokeWidth={LW} />)
    }
  }

  // head-top features
  if (species === 'dragon') {
    const hm = 0.4 + lvl * 0.16 // horns lengthen with age
    for (const d of [-1, 1] as const) {
      const hx = cx + d * headR * 0.44
      front.push(<path key={`h${d}`} d={`M${hx} ${headTop + 6} q${-d * 5} ${-26 * hm} ${d * 7} ${-30 * hm} q${-d * 2} ${15 * hm} ${d * 5} ${24 * hm} Z`} fill={c.horn} stroke={line} strokeWidth={LW} strokeLinejoin="round" />)
    }
    // back spikes at adult+
    if (lvl >= 4) front.push(<path key="spikes" d={`M${cx - 12} ${headTop + headR * 1.0} l5 -9 l5 9 l5 -9 l5 9`} fill="none" stroke={line} strokeWidth={2.4} strokeLinejoin="round" opacity={0.65} />)
  } else if (species === 'sprout') {
    const sy = headTop + 2
    const ty = sy - 22 * f
    front.push(<path key="stem" d={`M${cx} ${sy} L${cx} ${ty}`} stroke={c.accent} strokeWidth={4} strokeLinecap="round" fill="none" />)
    if (lvl >= 4) {
      front.push(
        <g key="bloom">
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <ellipse key={a} cx={cx} cy={ty} rx={5.5} ry={10 * f} fill={g.elder ? '#e9eef0' : '#f5a9c3'} stroke={line} strokeWidth={1.6} transform={`rotate(${a} ${cx} ${ty})`} />
          ))}
          <circle cx={cx} cy={ty} r={5} fill="#f4d35e" stroke={line} strokeWidth={1.6} />
        </g>,
      )
    } else {
      const leaves = lvl >= 2 ? 2 : 1
      front.push(<ellipse key="leaf" cx={cx} cy={ty} rx={7 * f} ry={14 * f} fill={c.accent} stroke={line} strokeWidth={2} transform={`rotate(-28 ${cx} ${ty})`} />)
      if (leaves > 1) front.push(<ellipse key="leaf2" cx={cx} cy={ty + 4} rx={7 * f} ry={14 * f} fill={c.accent} stroke={line} strokeWidth={2} transform={`rotate(28 ${cx} ${ty + 4})`} />)
      if (lvl >= 3) front.push(<ellipse key="leaf3" cx={cx - 7} cy={ty + 8} rx={5 * f} ry={11 * f} fill={c.accent} stroke={line} strokeWidth={2} transform={`rotate(-60 ${cx - 7} ${ty + 8})`} />)
    }
  } else if (isFish) {
    front.push(<path key="dorsal" d={`M${cx - 14 * f} ${headTop + 6} q${14 * f} ${-24 * f} ${28 * f} 0 Z`} fill={c.accent} stroke={line} strokeWidth={LW} strokeLinejoin="round" />)
  } else if (species === 'bird') {
    const ct = headTop + 2
    const cm = 0.7 + lvl * 0.12
    front.push(
      <path key="cr1" d={`M${cx} ${ct} q-3 ${-20 * cm} 4 ${-23 * cm} q-2 ${14 * cm} 2 ${19 * cm} Z`} fill={c.accent} stroke={line} strokeWidth={2.2} strokeLinejoin="round" />,
      <path key="cr2" d={`M${cx - 7} ${ct + 2} q-4 ${-15 * cm} 1 ${-17 * cm} q-1 ${11 * cm} 4 ${14 * cm} Z`} fill={c.accent} stroke={line} strokeWidth={2.2} strokeLinejoin="round" />,
    )
  } else if (species === 'frog') {
    if (lvl < 2) {
      front.push(
        <circle key="sp1" cx={cx - headR * 0.5} cy={headTop + headR * 0.5} r={3.4} fill={c.shade} opacity={0.55} />,
        <circle key="sp2" cx={cx + headR * 0.5} cy={headTop + headR * 0.5} r={3.4} fill={c.shade} opacity={0.55} />,
      )
    }
  } else if (isDog) {
    const pink = '#d6a79c'
    // Ears: tan with pink insides and dark tips. Floppy as a pup, then erect.
    const erect = lvl >= 2
    for (const d of [-1, 1] as const) {
      if (erect) {
        const eh = 17 + (lvl - 2) * 3.5 // ears grow taller as it matures
        const baseOutX = cx + d * headR * 0.74
        const baseInX = cx + d * headR * 0.3
        const baseY = headTop + headR * 0.34
        const baseInY = headTop + headR * 0.22
        const tipX = cx + d * headR * 0.6
        const tipY = headTop + headR * 0.08 - eh
        front.push(
          <path key={`ear${d}`} d={`M${baseInX} ${baseInY} L${tipX} ${tipY} L${baseOutX} ${baseY} Z`} fill={c.body} stroke={line} strokeWidth={LW} strokeLinejoin="round" />,
          <path key={`earin${d}`} d={`M${baseInX + d * 4} ${baseInY + 3} L${tipX} ${tipY + eh * 0.42} L${baseOutX - d * 5} ${baseY - 3} Z`} fill={pink} stroke="none" />,
          <path key={`eart${d}`} d={`M${tipX - d * 6} ${tipY + eh * 0.28} L${tipX} ${tipY} L${tipX + d * 4} ${tipY + eh * 0.2} Z`} fill={c.accent} stroke="none" />,
        )
      } else {
        const ex = cx + d * headR * 0.82
        const ey = headTop + headR * 0.6
        front.push(
          <ellipse key={`ear${d}`} cx={ex} cy={ey} rx={9} ry={15} fill={c.body} stroke={line} strokeWidth={LW} transform={`rotate(${d * 24} ${ex} ${ey})`} />,
          <ellipse key={`earin${d}`} cx={ex} cy={ey - 1} rx={4.5} ry={9} fill={pink} opacity={0.85} transform={`rotate(${d * 24} ${ex} ${ey})`} />,
          <ellipse key={`eart${d}`} cx={ex} cy={ey + 8} rx={5.5} ry={6.5} fill={c.accent} opacity={0.85} transform={`rotate(${d * 24} ${ex} ${ey})`} />,
        )
      }
    }
    // Dark mask: a crown over the forehead pointing down between the eyes.
    front.push(
      <path key="crown" d={`M${cx - headR * 0.52} ${headTop + headR * 0.42} Q${cx} ${headTop} ${cx + headR * 0.52} ${headTop + headR * 0.42} Q${cx + headR * 0.16} ${eyeY - eyeR * 0.4} ${cx} ${eyeY + eyeR * 0.3} Q${cx - headR * 0.16} ${eyeY - eyeR * 0.4} ${cx - headR * 0.52} ${headTop + headR * 0.42} Z`} fill={c.accent} />,
    )
    // Muzzle: tan lower jaw (mouth shows), dark bridge stripe, black nose.
    const mrx = headR * (0.42 + g.snout * 0.12)
    const mry = headR * (0.34 + g.snout * 0.1)
    front.push(
      <ellipse key="muzzle" cx={cx} cy={snoutCy} rx={mrx} ry={mry} fill={c.body} stroke={line} strokeWidth={2} />,
      <path key="bridge" d={`M${cx - headR * 0.14} ${eyeY} Q${cx - mrx * 0.5} ${snoutCy - mry * 0.4} ${cx - mrx * 0.42} ${snoutCy} Q${cx} ${snoutCy + 2} ${cx + mrx * 0.42} ${snoutCy} Q${cx + mrx * 0.5} ${snoutCy - mry * 0.4} ${cx + headR * 0.14} ${eyeY} Q${cx} ${eyeY - eyeR * 0.3} ${cx - headR * 0.14} ${eyeY} Z`} fill={c.accent} />,
      <path key="nose" d={`M${cx - 5.5} ${snoutCy - mry * 0.5} q5.5 -4.5 11 0 q1.5 5.5 -5.5 7.5 q-7 -2 -5.5 -7.5 Z`} fill="#191210" stroke={line} strokeWidth={1.2} strokeLinejoin="round" />,
    )
    // Tan "eyebrow" dots on the dark mask — a classic Shepherd expression.
    for (const d of [-1, 1] as const) {
      front.push(<ellipse key={`brow${d}`} cx={cx + d * eyeDX * 0.74} cy={eyeY - eyeR * 0.95} rx={eyeR * 0.42} ry={eyeR * 0.32} fill={c.body} />)
    }
    // Riley's signature happy tongue.
    if (happy) {
      front.push(<path key="tongue" d={`M${cx - 4.5} ${mouthY} q4.5 8 9 0 q-1 6.5 -4.5 7.5 q-3.5 -1 -4.5 -7.5 Z`} fill="#ef93a0" stroke={line} strokeWidth={1.1} strokeLinejoin="round" />)
    }
  }

  // snout / muzzle (dragon, grows)
  if (c.snout && g.snout > 0.2) {
    front.push(
      <ellipse key="snout" cx={cx} cy={snoutCy} rx={headR * (0.36 + g.snout * 0.14)} ry={headR * (0.24 + g.snout * 0.07)} fill={c.belly} stroke={line} strokeWidth={2} />,
      <circle key="nl" cx={cx - 4} cy={snoutCy - 1} r={1.3} fill={line} />,
      <circle key="nr" cx={cx + 4} cy={snoutCy - 1} r={1.3} fill={line} />,
    )
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
    const bl = 7 + lvl * 1.4 // beak grows
    front.push(<path key="beak" d={`M${cx - bl * 0.5} ${eyeY + eyeR + 2} l${bl * 0.5} ${bl} l${bl * 0.5} ${-bl} Z`} fill={c.accent} stroke={line} strokeWidth={2.2} strokeLinejoin="round" />)
  } else {
    const mw = species === 'frog' ? 9 + lvl * 1.2 : 7 // frog mouth widens with age
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
      {g.elder && <circle cx={cx} cy={torsoCy} r={Math.max(torsoRx, torsoRy) * 1.5} fill={c.accent} opacity={0.16} className="cr-aura" />}
      {behind}
      {mid}
      {front}
    </svg>
  )
}
