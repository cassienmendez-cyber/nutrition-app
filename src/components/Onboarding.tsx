import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { today } from '../lib/dates'

// A warm, low-pressure intro. We ask only what we need to be useful, and frame
// everything around becoming healthier — never weight.
export function Onboarding() {
  const { setProfile } = useApp()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [cycleLength, setCycleLength] = useState(28)
  const [lastPeriodStart, setLastPeriodStart] = useState(today())

  function finish() {
    setProfile({ name: name.trim() || 'friend', cycleLength, lastPeriodStart }, true)
  }

  return (
    <div className="screen" style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      {step === 0 && (
        <div className="card">
          <div className="center">
            <div style={{ fontSize: 56 }}>🌱</div>
            <h1 style={{ fontSize: 28, marginTop: 8 }}>Welcome to Bloom</h1>
            <p className="soft" style={{ marginTop: 8 }}>
              This isn’t a calorie tracker. It’s a gentle companion for building the
              healthiest version of yourself while trying to conceive. No guilt,
              no shame — just evidence that you’re becoming healthier.
            </p>
          </div>
          <button className="btn" style={{ marginTop: 16 }} onClick={() => setStep(1)}>
            Begin
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="card">
          <h2>What should I call you?</h2>
          <div className="field" style={{ marginTop: 12 }}>
            <input
              type="text"
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <button className="btn" onClick={() => setStep(2)}>Next</button>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h2>A little about your cycle</h2>
          <p className="soft">This powers gentle fertility predictions. You can change it anytime.</p>
          <div className="field" style={{ marginTop: 12 }}>
            <label>When did your last period start?</label>
            <input
              type="date"
              value={lastPeriodStart}
              max={today()}
              onChange={(e) => setLastPeriodStart(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Average cycle length</label>
            <div className="stepper">
              <button onClick={() => setCycleLength(Math.max(21, cycleLength - 1))}>−</button>
              <span className="val">{cycleLength}</span>
              <span className="unit">days</span>
              <button onClick={() => setCycleLength(Math.min(40, cycleLength + 1))}>+</button>
            </div>
          </div>
          <button className="btn" onClick={finish}>Start blooming 🌸</button>
        </div>
      )}

      <p className="center muted" style={{ fontSize: 12, marginTop: 16 }}>
        Step {step + 1} of 3
      </p>
    </div>
  )
}
