import { useEffect, useRef, useState } from 'react'
import { useApp } from './store/AppContext'
import { Dashboard } from './components/Dashboard'
import { Exercise } from './components/Exercise'
import { Nutrition } from './components/Nutrition'
import { Fertility } from './components/Fertility'
import { Coach } from './components/Coach'
import { Trends } from './components/Trends'
import { Onboarding } from './components/Onboarding'
import { BadDay } from './components/BadDay'
import { Settings } from './components/Settings'
import { loadReminders, registerServiceWorker, startReminderScheduler } from './lib/notifications'
import { detectNewTrophy, TIER_META, type EarnedEvent } from './lib/achievements'
import { detectPetLevelUp } from './lib/pet'
import { playEvolve } from './lib/sound'
import { Creature } from './components/Creature'
import { EvolutionGallery } from './components/EvolutionGallery'

type Tab = 'today' | 'move' | 'eat' | 'cycle' | 'trends' | 'coach'

const TABS: { key: Tab; ico: string; label: string }[] = [
  { key: 'today', ico: '🏡', label: 'Today' },
  { key: 'move', ico: '🤸', label: 'Move' },
  { key: 'eat', ico: '🥗', label: 'Eat' },
  { key: 'cycle', ico: '🌸', label: 'Cycle' },
  { key: 'trends', ico: '🏆', label: 'Goals' },
  { key: 'coach', ico: '💬', label: 'Coach' },
]

export default function App() {
  const { state } = useApp()
  const [tab, setTab] = useState<Tab>('today')
  const [badDayOpen, setBadDayOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [celebration, setCelebration] = useState<EarnedEvent | null>(null)
  const [grewUp, setGrewUp] = useState<string | null>(null)
  const [dir, setDir] = useState<'l' | 'r'>('r')
  const touch = useRef<{ x: number; y: number } | null>(null)

  const idx = TABS.findIndex((t) => t.key === tab)

  // Switch tabs with a direction-aware slide (used by swipe, nav and links).
  function goTab(next: Tab) {
    const ni = TABS.findIndex((t) => t.key === next)
    setDir(ni >= idx ? 'r' : 'l')
    setTab(next)
  }

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    touch.current = { x: t.clientX, y: t.clientY }
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (!touch.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touch.current.x
    const dy = t.clientY - touch.current.y
    touch.current = null
    // Require a deliberate, horizontal-dominant swipe.
    if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.7) return
    // Don't hijack swipes inside overlays, scrollers or form fields.
    const el = e.target as HTMLElement
    if (el.closest('.sheet-overlay, input, textarea, select, [data-no-swipe]')) return
    if (dx < 0 && idx < TABS.length - 1) goTab(TABS[idx + 1].key)
    else if (dx > 0 && idx > 0) goTab(TABS[idx - 1].key)
  }

  // Register the service worker and resume reminders if the user enabled them.
  useEffect(() => {
    registerServiceWorker()
    if (loadReminders().enabled) startReminderScheduler()
  }, [])

  // Celebrate the moment a trophy tier is unlocked (first run just baselines).
  useEffect(() => {
    const earned = detectNewTrophy(state)
    if (earned) {
      setCelebration(earned)
      const t = setTimeout(() => setCelebration(null), 5500)
      return () => clearTimeout(t)
    }
  }, [state])

  // Celebrate when the companion evolves to a new life stage.
  useEffect(() => {
    const stageName = detectPetLevelUp(state.pet.level)
    if (stageName) {
      setGrewUp(stageName)
      playEvolve()
      const t = setTimeout(() => setGrewUp(null), 6000)
      return () => clearTimeout(t)
    }
  }, [state.pet.level])

  // Reference chart of all creature evolutions, at /#evolutions.
  if (typeof window !== 'undefined' && window.location.hash === '#evolutions') return <EvolutionGallery />

  if (!state.onboarded) return <Onboarding />

  return (
    <div className="app">
      {/* Settings entry point */}
      <button
        title="Settings"
        aria-label="Open settings"
        onClick={() => setSettingsOpen(true)}
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          width: 38,
          height: 38,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.6)',
          fontSize: 18,
          zIndex: 20,
        }}
      >
        ⚙️
      </button>
      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}

      {/* Swipeable content — swipe left/right to move between sections */}
      <div className="swipe-area" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className={`tab-pane ${dir}`} key={tab}>
          {tab === 'today' && <Dashboard go={(t) => goTab(t as Tab)} />}
          {tab === 'move' && <Exercise />}
          {tab === 'eat' && <Nutrition />}
          {tab === 'cycle' && <Fertility />}
          {tab === 'trends' && <Trends />}
          {tab === 'coach' && <Coach />}
        </div>
      </div>

      {/* Page dots — show where you are across the sections */}
      <div className="swipe-dots" aria-hidden="true">
        {TABS.map((t) => (
          <i key={t.key} className={t.key === tab ? 'on' : ''} />
        ))}
      </div>

      {/* Trophy unlock celebration */}
      {celebration && (
        <div className="trophy-toast" role="status" onClick={() => setCelebration(null)}>
          <span className="big">{celebration.def.emoji}</span>
          <div>
            <div className="t-head">{TIER_META[celebration.tier].emoji} {TIER_META[celebration.tier].label} unlocked!</div>
            <div className="t-body">{celebration.def.title} — {celebration.def.blurb.toLowerCase()}.</div>
          </div>
        </div>
      )}

      {/* Companion evolved */}
      {grewUp && (
        <div className="trophy-toast" role="status" onClick={() => setGrewUp(null)} style={{ background: 'linear-gradient(135deg, var(--blue) 0%, var(--sage-deep) 100%)' }}>
          <span style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 14, padding: 4, display: 'flex' }}>
            <Creature species={state.pet.species} level={state.pet.level} size={48} happy />
          </span>
          <div>
            <div className="t-head">{grewUp === 'Elder' ? '🌟 ' : '🎉 '}{state.pet.name} evolved to {grewUp}!</div>
            <div className="t-body">Your care is helping them flourish. Keep it up. 💚</div>
          </div>
        </div>
      )}

      {/* The Bad Day button — always within reach */}
      <button className="fab" title="Having a bad day?" aria-label="Having a bad day? Switch to support mode" onClick={() => setBadDayOpen(true)}>
        🫶
      </button>
      {badDayOpen && <BadDay onClose={() => setBadDayOpen(false)} />}

      <nav className="nav">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? 'active' : ''}
            onClick={() => goTab(t.key)}
          >
            <span className="ico">{t.ico}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
