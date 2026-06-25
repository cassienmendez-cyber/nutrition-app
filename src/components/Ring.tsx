interface Props {
  value: number // 0–100
  size?: number
  stroke?: number
  caption?: string
}

// A soft progress ring for the Fertility / Prep score. Color shifts gently with
// the value — never an alarming red.
export function Ring({ value, size = 132, stroke = 12, caption = 'Fertility' }: Props) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  const offset = c - (pct / 100) * c
  const color = pct >= 70 ? 'var(--sage)' : pct >= 45 ? 'var(--gold)' : 'var(--clay)'

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="label">
        <div className="num">{pct}%</div>
        <div className="cap">{caption}</div>
      </div>
    </div>
  )
}
