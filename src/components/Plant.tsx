import { useApp } from '../store/AppContext'
import { streakFreeMomentum } from '../lib/coach'

// Momentum, not streaks. The plant grows with healthy choices and simply pauses
// — never dies — on a missed day. Way kinder to the brain than a broken streak.
const STAGES = ['🌱', '🌿', '☘️', '🪴', '🌵', '🌳', '🌲'] // grows with momentum

export function Plant({ compact = false }: { compact?: boolean }) {
  const { state } = useApp()
  const { level, wateredToday } = streakFreeMomentum(state)
  const stage = STAGES[Math.min(STAGES.length - 1, Math.floor(level / 2))]

  return (
    <div className="plant">
      <div className={`pot ${wateredToday ? 'grew' : ''}`}>{stage}</div>
      <div className="level">Momentum: {level} days nourished</div>
      {!compact && (
        <div className="note">
          {wateredToday
            ? 'You watered your plant today. It’s growing. 🌟'
            : 'No pressure — one kind choice waters it. It won’t wilt for waiting.'}
        </div>
      )}
    </div>
  )
}
