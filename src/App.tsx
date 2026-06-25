import { useEffect, useState } from 'react'
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

      {tab === 'today' && <Dashboard go={(t) => setTab(t as Tab)} />}
      {tab === 'move' && <Exercise />}
      {tab === 'eat' && <Nutrition />}
      {tab === 'cycle' && <Fertility />}
      {tab === 'trends' && <Trends />}
      {tab === 'coach' && <Coach />}

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
            onClick={() => setTab(t.key)}
          >
            <span className="ico">{t.ico}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
