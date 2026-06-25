import type { JSX } from 'react'
import type { PetSpecies } from '../types'

// Hand-built, parametric SVG creatures that physically EVOLVE across the six
// life stages (Pokémon-style): they grow in size, sprout limbs, their signature
// feature develops (leaves / fins / wings / horns / crest), and the Elder gains
// spectacles, sparkles and a distinguished pale palette. All cute, all on the
// blue/green/black/gray theme.

interface Palette {
  body: string
  belly: string
  accent: string
  feat: string
}

const PAL: Record<PetSpecies, Palette> = {
  sprout: { body: '#5cc08a', belly: '#dcf3e6', accent: '#2f9e7f', feat: '#46b96e' },
  frog: { body: '#3fb6a0', belly: '#dcf3ec', accent: '#1f7d72', feat: '#2f9e7f' },
  fish: { body: '#4aa3e0', belly: '#d9eefb', accent: '#2b6ea6', feat: '#3d8fd1' },
  dragon: { body: '#37a884', belly: '#dbf0e6', accent: '#1f7a62', feat: '#7fc2e8' },
  bird: { body: '#6fc0ec', belly: '#e9f6ff', accent: '#2b6ea6', feat: '#2f9e7f' },
}

interface StageDef {
  scale: number
  eye: number
  limbs: number // 0 none · 1 feet · 2 feet+arms
  feat: number // feature development
  elder?: boolean
}

const STAGES: StageDef[] = [
  { scale: 0.62, eye: 8.6, limbs: 0, feat: 0.4 }, // Baby
  { scale: 0.73, eye: 8.0, limbs: 1, feat: 0.62 }, // Toddler
  { scale: 0.83, eye: 7.3, limbs: 2, feat: 0.9 }, // Adolescent
  { scale: 0.91, eye: 6.9, limbs: 2, feat: 1.05 }, // Young Adult
  { scale: 1.0, eye: 6.6, limbs: 2, feat: 1.2 }, // Adult
  { scale: 1.0, eye: 6.6, limbs: 2, feat: 1.25, elder: true }, // Elder
]

const INK = '#16323a'

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
  const idx = Math.max(0, Math.min(STAGES.length - 1, level))
  const st = STAGES[idx]
  const pal = PAL[species] ?? PAL.frog
  const elder = !!st.elder
  const body = pal.body
  const belly = pal.belly
  const accent = elder ? '#aab8bf' : pal.accent
  const feat = elder ? '#cdd8dd' : pal.feat

  const cx = 60
  const rx = 34 * st.scale
  const ry = 33 * st.scale * (1 + idx * 0.012)
  const cy = 90 - ry
  const topY = cy - ry

  const eyeR = st.eye
  const eyeDX = rx * 0.36
  const eyeY = cy - ry * 0.1
  const mouthY = cy + ry * 0.34

  const behind: JSX.Element[] = [] // wings etc. behind the body
  const front: JSX.Element[] = [] // features on top of the body

  // --- limbs ---------------------------------------------------------------
  const limbs: JSX.Element[] = []
  const hasFins = species === 'fish'
  if (st.limbs >= 1 && !hasFins) {
    const fy = cy + ry * 0.92
    limbs.push(
      <ellipse key="f1" cx={cx - rx * 0.42} cy={fy} rx={8 * st.scale} ry={5.5 * st.scale} fill={accent} />,
      <ellipse key="f2" cx={cx + rx * 0.42} cy={fy} rx={8 * st.scale} ry={5.5 * st.scale} fill={accent} />,
    )
  }
  if (st.limbs >= 2 && !hasFins) {
    const ay = cy + ry * 0.18
    limbs.push(
      <ellipse key="a1" cx={cx - rx - 3 * st.scale} cy={ay} rx={6 * st.scale} ry={7.5 * st.scale} fill={body} />,
      <ellipse key="a2" cx={cx + rx + 3 * st.scale} cy={ay} rx={6 * st.scale} ry={7.5 * st.scale} fill={body} />,
    )
  }

  // --- signature feature per species --------------------------------------
  const f = st.feat
  if (species === 'sprout') {
    const stemTop = topY - 16 * f
    front.push(<path key="stem" d={`M${cx} ${topY + 4} L${cx} ${stemTop}`} stroke={accent} strokeWidth={3} strokeLinecap="round" fill="none" />)
    if (idx >= 4) {
      // a bloom of petals
      const r = 8 * f
      front.push(
        <g key="bloom">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx={cx} cy={stemTop} rx={4.5} ry={r} fill={feat} transform={`rotate(${a} ${cx} ${stemTop})`} />
          ))}
          <circle cx={cx} cy={stemTop} r={4} fill={elder ? '#e8eef0' : '#f4d35e'} />
        </g>,
      )
    } else {
      const leaves = f < 0.6 ? 1 : 2
      front.push(<ellipse key="lf1" cx={cx} cy={stemTop} rx={6 * f} ry={11 * f} fill={feat} transform={`rotate(-32 ${cx} ${stemTop})`} />)
      if (leaves > 1) front.push(<ellipse key="lf2" cx={cx} cy={stemTop + 4} rx={6 * f} ry={11 * f} fill={feat} transform={`rotate(32 ${cx} ${stemTop + 4})`} />)
    }
  } else if (species === 'fish') {
    // dorsal fin + tail fin + little side fins (instead of limbs)
    front.push(<path key="dorsal" d={`M${cx - 12 * f} ${topY + 6} Q${cx} ${topY - 14 * f} ${cx + 12 * f} ${topY + 6} Z`} fill={feat} />)
    behind.push(<path key="tail" d={`M${cx + rx - 2} ${cy} l${16 * f} ${-12 * f} l0 ${24 * f} Z`} fill={feat} />)
    const fy = cy + ry * 0.45
    behind.push(
      <ellipse key="sf1" cx={cx - rx * 0.9} cy={fy} rx={9 * st.scale} ry={5 * st.scale} fill={feat} transform={`rotate(28 ${cx - rx * 0.9} ${fy})`} />,
      <ellipse key="sf2" cx={cx + rx * 0.9} cy={fy} rx={9 * st.scale} ry={5 * st.scale} fill={feat} transform={`rotate(-28 ${cx + rx * 0.9} ${fy})`} />,
    )
  } else if (species === 'dragon') {
    // horns always; wings from adolescent (feat >= 0.85)
    front.push(
      <path key="h1" d={`M${cx - eyeDX} ${topY + 8} l${-3} ${-9 * f} l${6} ${4} Z`} fill={accent} />,
      <path key="h2" d={`M${cx + eyeDX} ${topY + 8} l${3} ${-9 * f} l${-6} ${4} Z`} fill={accent} />,
    )
    if (f >= 0.85) {
      const wy = cy - ry * 0.1
      behind.push(
        <path key="w1" d={`M${cx - rx * 0.7} ${wy} q${-26 * f} ${-10 * f} ${-30 * f} ${14 * f} q${16 * f} ${2} ${30 * f} ${-2} Z`} fill={feat} opacity={0.92} />,
        <path key="w2" d={`M${cx + rx * 0.7} ${wy} q${26 * f} ${-10 * f} ${30 * f} ${14 * f} q${-16 * f} ${2} ${-30 * f} ${-2} Z`} fill={feat} opacity={0.92} />,
      )
    }
    // back spikes
    front.push(<path key="spikes" d={`M${cx - 8} ${topY + 10} l4 ${-7 * f} l4 ${7 * f} l4 ${-7 * f} l4 ${7 * f}`} stroke={accent} strokeWidth={2.5} fill="none" strokeLinejoin="round" />)
    // a curling tail that grows with the stage
    behind.push(
      <path key="tail" d={`M${cx + rx * 0.8} ${cy + ry * 0.6} q${22 * f} ${4 * f} ${20 * f} ${-16 * f} q${-2} ${10 * f} ${-12 * f} ${10 * f}`} fill={body} />,
    )
  } else if (species === 'bird') {
    // crest feathers + beak; wings from adolescent
    const ct = topY + 4
    front.push(<path key="cr1" d={`M${cx} ${ct} q${-2} ${-14 * f} ${4} ${-16 * f} q${-2} ${10 * f} ${1} ${14 * f} Z`} fill={feat} />)
    if (f >= 0.85) front.push(<path key="cr2" d={`M${cx - 5} ${ct} q${-3} ${-11 * f} ${1} ${-13 * f} q${0} ${9 * f} ${4} ${12 * f} Z`} fill={feat} />)
    front.push(<path key="beak" d={`M${cx - 5} ${eyeY + eyeR + 2} l5 ${6 * f} l5 ${-6 * f} Z`} fill="#e8a13c" />)
    if (f >= 0.85) {
      const wy = cy + ry * 0.05
      behind.push(
        <ellipse key="bw1" cx={cx - rx * 0.95} cy={wy} rx={10 * f} ry={16 * f} fill={feat} transform={`rotate(18 ${cx - rx * 0.95} ${wy})`} />,
        <ellipse key="bw2" cx={cx + rx * 0.95} cy={wy} rx={10 * f} ry={16 * f} fill={feat} transform={`rotate(-18 ${cx + rx * 0.95} ${wy})`} />,
      )
      // tail feathers fan out at the back
      behind.push(
        <g key="btail">
          {[-16, 0, 16].map((a) => (
            <ellipse key={a} cx={cx} cy={cy + ry * 0.9} rx={4 * f} ry={13 * f} fill={feat} transform={`rotate(${a} ${cx} ${cy + ry * 0.9})`} />
          ))}
        </g>,
      )
    }
  } else if (species === 'frog') {
    // lily pad behind from young-adult; cheek spots
    if (idx >= 3) behind.push(<ellipse key="pad" cx={cx} cy={cy + ry * 0.95} rx={rx * 1.25} ry={7} fill={accent} opacity={0.35} />)
    front.push(
      <circle key="spot1" cx={cx - rx * 0.5} cy={cy} r={3.4 * st.scale} fill={accent} opacity={0.4} />,
      <circle key="spot2" cx={cx + rx * 0.5} cy={cy} r={3.4 * st.scale} fill={accent} opacity={0.4} />,
    )
  }

  // --- eyes ----------------------------------------------------------------
  const eyes: JSX.Element[] = []
  for (const sx of [cx - eyeDX, cx + eyeDX]) {
    if (happy) {
      eyes.push(
        <path key={`e${sx}`} d={`M${sx - eyeR * 0.7} ${eyeY + 1} q${eyeR * 0.7} ${-eyeR * 0.8} ${eyeR * 1.4} 0`} stroke={INK} strokeWidth={2.4} fill="none" strokeLinecap="round" />,
      )
    } else {
      eyes.push(
        <g key={`e${sx}`}>
          <circle cx={sx} cy={eyeY} r={eyeR} fill="#fff" />
          <circle cx={sx + eyeR * 0.12} cy={eyeY + eyeR * 0.18} r={eyeR * 0.55} fill={INK} />
          <circle cx={sx - eyeR * 0.28} cy={eyeY - eyeR * 0.28} r={eyeR * 0.22} fill="#fff" />
        </g>,
      )
    }
  }

  // --- mouth ---------------------------------------------------------------
  const mouthW = (species === 'frog' ? 14 : 9) * st.scale
  const mouth = happy ? (
    <path d={`M${cx - mouthW} ${mouthY} q${mouthW} ${10 * st.scale} ${mouthW * 2} 0 Z`} fill={INK} opacity={0.85} />
  ) : (
    <path d={`M${cx - mouthW} ${mouthY} q${mouthW} ${6 * st.scale} ${mouthW * 2} 0`} stroke={INK} strokeWidth={2.2} fill="none" strokeLinecap="round" />
  )

  // --- elder accessories ---------------------------------------------------
  const elderBits: JSX.Element[] = []
  if (elder) {
    elderBits.push(
      <g key="glasses" stroke={INK} strokeWidth={2} fill="none">
        <circle cx={cx - eyeDX} cy={eyeY} r={eyeR + 2.5} />
        <circle cx={cx + eyeDX} cy={eyeY} r={eyeR + 2.5} />
        <line x1={cx - eyeDX + eyeR + 2} y1={eyeY} x2={cx + eyeDX - eyeR - 2} y2={eyeY} />
      </g>,
    )
    const spark = (key: string, x: number, y: number, s: number) => (
      <path key={key} d={`M${x} ${y - s} L${x + s * 0.4} ${y} L${x} ${y + s} L${x - s * 0.4} ${y} Z`} fill="#f4d35e" />
    )
    elderBits.push(spark('s1', cx - rx - 6, topY + 16, 4), spark('s2', cx + rx + 6, cy, 5), spark('s3', cx + rx * 0.3, topY + 2, 3))
  }

  return (
    <svg viewBox="0 0 120 120" width={size} height={size} style={{ overflow: 'visible', display: 'block' }} role="img" aria-label={`${species} companion`}>
      {elder && <circle cx={cx} cy={cy} r={rx * 1.55} fill={feat} opacity={0.18} className="cr-aura" />}
      {behind}
      <ellipse cx={cx} cy={91} rx={rx * 0.92} ry={5} fill="rgba(24,36,43,0.12)" />
      {limbs}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={body} />
      <ellipse cx={cx} cy={cy + ry * 0.3} rx={rx * 0.6} ry={ry * 0.52} fill={belly} />
      {front}
      <ellipse cx={cx - rx * 0.56} cy={mouthY - 3} rx={5 * st.scale} ry={3.2 * st.scale} fill="rgba(255,148,148,0.30)" />
      <ellipse cx={cx + rx * 0.56} cy={mouthY - 3} rx={5 * st.scale} ry={3.2 * st.scale} fill="rgba(255,148,148,0.30)" />
      {eyes}
      {mouth}
      {elderBits}
      {prestige > 0 && (
        <g aria-hidden>
          <path d={`M${cx - 11} ${topY - 3} l3 -8 l4 5 l4 -8 l4 8 l4 -5 l3 8 Z`} fill="#e9c44a" stroke="#caa42f" strokeWidth={0.8} strokeLinejoin="round" />
          {prestige > 1 && <text x={cx + 16} y={topY - 4} fontSize={11} fontWeight={700} fill="#caa42f">×{prestige}</text>}
        </g>
      )}
    </svg>
  )
}
