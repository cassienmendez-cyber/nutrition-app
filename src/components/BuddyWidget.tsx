import { useApp } from '../store/AppContext'
import { Creature } from './Creature'
import { petLevelInfo, mood, settlePet, happiness } from '../lib/pet'
import { availablePoints } from '../lib/points'

// The quick actions shown in the buddy widget. `go` is also used as the deep
// link (/?go=<go>) for the home-screen shortcut + standalone widget links.
export type WidgetAction = 'eat' | 'track' | 'water' | 'coach'

export const WIDGET_ACTIONS: { key: WidgetAction; emoji: string; label: string }[] = [
  { key: 'eat', emoji: '🥗', label: 'Log meal' },
  { key: 'track', emoji: '🤸', label: 'Workout' },
  { key: 'water', emoji: '💧', label: 'Water +1' },
  { key: 'coach', emoji: '💬', label: 'Coach' },
]

// The compact buddy + quick-add strip. Used two ways:
//  - in-app (Today screen): pass `onAction` to run the action inline.
//  - standalone (/#widget): omit `onAction`; buttons deep-link into the app.
export function BuddyWidget({ onAction, compact }: { onAction?: (a: WidgetAction) => void; compact?: boolean }) {
  const { state } = useApp()
  const pet = state.pet
  const settled = settlePet(pet, Date.now())
  const lvl = petLevelInfo(pet)
  const m = mood(settled)
  const pts = availablePoints(state)
  const happy = happiness(settled) >= 55

  return (
    <div className={`buddy-widget${compact ? ' compact' : ''}`}>
      <div className="bw-top">
        <div className="bw-pet">
          <Creature species={pet.species} level={pet.level} size={compact ? 64 : 96} happy={happy} prestige={pet.prestige} />
        </div>
        <div className="bw-info">
          <div className="bw-name">{pet.name}</div>
          <div className="bw-sub">{lvl.name} {m.emoji} {m.text}</div>
          <div className="bw-pts">⭐ {pts.toLocaleString()} points</div>
        </div>
      </div>

      <div className="bw-actions">
        {WIDGET_ACTIONS.map((a) =>
          onAction ? (
            <button key={a.key} className="bw-btn" onClick={() => onAction(a.key)}>
              <span className="bw-emoji">{a.emoji}</span>
              <span>{a.label}</span>
            </button>
          ) : (
            <a key={a.key} className="bw-btn" href={`/?go=${a.key}`}>
              <span className="bw-emoji">{a.emoji}</span>
              <span>{a.label}</span>
            </a>
          ),
        )}
      </div>
    </div>
  )
}

// Full-screen standalone widget view (route: /#widget). Buttons deep-link into
// the app, so this can back a PWA widget surface or a focused quick-glance.
export function WidgetView() {
  const { state } = useApp()
  return (
    <div className="widget-screen">
      <div className="widget-card">
        <div className="widget-brand">🌱 {state.pet.name}</div>
        <BuddyWidget />
        <a className="widget-open" href="/">Open Bloom →</a>
      </div>
    </div>
  )
}
