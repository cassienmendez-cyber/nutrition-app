import { useState } from 'react'
import { useApp } from './store/AppContext'
import { Dashboard } from './components/Dashboard'
import { Exercise } from './components/Exercise'
import { Nutrition } from './components/Nutrition'
import { Fertility } from './components/Fertility'
import { Coach } from './components/Coach'
import { Onboarding } from './components/Onboarding'
import { BadDay } from './components/BadDay'

type Tab = 'today' | 'move' | 'eat' | 'cycle' | 'coach'

const TABS: { key: Tab; ico: string; label: string }[] = [
  { key: 'today', ico: '🏡', label: 'Today' },
  { key: 'move', ico: '🤸', label: 'Move' },
  { key: 'eat', ico: '🥗', label: 'Eat' },
  { key: 'cycle', ico: '🌸', label: 'Cycle' },
  { key: 'coach', ico: '💬', label: 'Coach' },
]

export default function App() {
  const { state } = useApp()
  const [tab, setTab] = useState<Tab>('today')
  const [badDayOpen, setBadDayOpen] = useState(false)

  if (!state.onboarded) return <Onboarding />

  return (
    <div className="app">
      {tab === 'today' && <Dashboard go={(t) => setTab(t as Tab)} />}
      {tab === 'move' && <Exercise />}
      {tab === 'eat' && <Nutrition />}
      {tab === 'cycle' && <Fertility />}
      {tab === 'coach' && <Coach />}

      {/* The Bad Day button — always within reach */}
      <button className="fab" title="Having a bad day?" onClick={() => setBadDayOpen(true)}>
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
