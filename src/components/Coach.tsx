import { useState } from 'react'
import { useApp, newId } from '../store/AppContext'
import {
  weeklyInsights,
  weeklyWins,
  weeklyReviewNarrative,
  respondToCheckIn,
} from '../lib/coach'
import { pregnancyPrepScore } from '../lib/scores'
import { buildGroceryPlan, type GroceryPlan } from '../lib/grocery'
import { lastNDays } from '../lib/dates'
import { Ring } from './Ring'

export function Coach() {
  const { state, todayLog, addCheckIn } = useApp()
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [budget, setBudget] = useState(120)
  const [plan, setPlan] = useState<GroceryPlan | null>(null)

  const week = lastNDays(7).map((d) => state.days[d]).filter(Boolean)
  const { score, pillars } = pregnancyPrepScore(week, state.profile)
  const insights = weeklyInsights(state)
  const wins = weeklyWins(state)
  const review = weeklyReviewNarrative(state)

  function send() {
    if (!text.trim()) return
    const reply = respondToCheckIn(text)
    addCheckIn({ id: newId(), text: text.trim(), reply, at: Date.now() })
    setText('')
  }

  // A friendly stand-in for true voice capture. If the browser supports the
  // Web Speech API we use it; otherwise we drop in a realistic sample so the
  // audio-first idea is still demonstrable.
  function toggleVoice() {
    const SR = (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition
    if (!SR) {
      setText(
        'I skipped breakfast, my ankle hurts, work was stressful, and all I want is ice cream.',
      )
      return
    }
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = false
    rec.onstart = () => setListening(true)
    rec.onend = () => setListening(false)
    rec.onresult = (e: SpeechResultLike) => setText(e.results[0][0].transcript)
    rec.start()
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <div className="eyebrow">Your coach</div>
        <h1>Let’s talk it through</h1>
        <p>No lectures, no “good” or “bad.” Just practical coaching that adapts to real life.</p>
      </div>

      {/* Voice-first check-in */}
      <div className="card">
        <div className="card-title">Tell me about your day</div>
        <textarea
          placeholder="“I skipped breakfast, my ankle hurts, work was stressful, and all I want is ice cream…”"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn secondary" onClick={toggleVoice}>
            {listening ? '🎙 Listening…' : '🎙 Speak'}
          </button>
          <button className="btn" onClick={send}>Send to coach</button>
        </div>

        {todayLog.checkIns.length > 0 && (
          <div style={{ marginTop: 16 }}>
            {todayLog.checkIns.map((c) => (
              <div key={c.id}>
                <div className="coach-msg you">{c.text}</div>
                <div className="coach-msg bloom">🌱 {c.reply}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly AI review */}
      <div className="card">
        <div className="card-title">Sunday review</div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 12 }}>
          <Ring value={score} size={104} stroke={10} caption="Prep score" />
          <p className="soft" style={{ margin: 0, fontSize: 14 }}>{review}</p>
        </div>
        <div className="divider" />
        <div className="card-title">Pregnancy preparation pillars</div>
        {pillars.map((p) => {
          const status = p.value >= 0.7 ? 'good' : p.value >= 0.4 ? 'okay' : 'attention'
          return (
            <div className="stat-row" key={p.label}>
              <span className="emoji">{p.emoji}</span>
              <div className="body">
                <div className="name">{p.label}</div>
                <div className={`bar ${status}`}><span style={{ width: `${p.value * 100}%` }} /></div>
              </div>
              <span className={`badge ${status}`}>{Math.round(p.value * 100)}%</span>
            </div>
          )
        })}
      </div>

      {/* Wins */}
      {wins.length > 0 && (
        <div className="card">
          <div className="card-title">Wins worth celebrating</div>
          {wins.map((w, i) => (
            <div className="win" key={i}>
              <span style={{ fontSize: 18 }}>{w.emoji}</span> {w.text}
            </div>
          ))}
        </div>
      )}

      {/* All insights */}
      {insights.length > 0 && (
        <div className="card">
          <div className="card-title">What I’m noticing</div>
          {insights.map((i) => (
            <div className={`insight ${i.tone}`} key={i.id}>
              <span className="ic">💬</span>
              <span>{i.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Grocery intelligence */}
      <div className="card">
        <div className="card-title">Grocery intelligence</div>
        <p className="soft" style={{ marginTop: 0, fontSize: 14 }}>
          Tell me your budget and I’ll build a protein-forward week + a shopping list.
        </p>
        <div className="field">
          <label>Budget for the week</label>
          <div className="stepper">
            <button onClick={() => setBudget(Math.max(40, budget - 10))}>−</button>
            <span className="val">${budget}</span>
            <button onClick={() => setBudget(budget + 10)}>+</button>
          </div>
        </div>
        <button className="btn" onClick={() => setPlan(buildGroceryPlan(budget))}>
          Build my plan
        </button>

        {plan && (
          <div style={{ marginTop: 16 }}>
            <div className="insight celebrate">
              <span className="ic">🛒</span>
              <span>
                Planned a week of meals for about <strong>${plan.total}</strong>
                {plan.underBudget ? ` — $${plan.budget - plan.total} under budget.` : '.'} {plan.proteinNote}
              </span>
            </div>
            <div className="card-title" style={{ marginTop: 12 }}>This week’s meals</div>
            {plan.meals.map((m) => (
              <div className="meal-card" key={m.slot}>
                <div>
                  <div className="slot">{m.slot}</div>
                  <div className="desc" style={{ fontSize: 14 }}>{m.idea}</div>
                </div>
              </div>
            ))}
            <div className="card-title" style={{ marginTop: 12 }}>Shopping list</div>
            <ul className="list-plain">
              {plan.shoppingList.map((s) => (
                <li key={s.item}><span>{s.item}</span><span className="muted">${s.cost}</span></li>
              ))}
              <li style={{ fontWeight: 700 }}><span>Total</span><span>${plan.total}</span></li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

// Minimal typings for the optional Web Speech API.
interface SpeechResultLike {
  results: { 0: { transcript: string } }[]
}
interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  onstart: () => void
  onend: () => void
  onresult: (e: SpeechResultLike) => void
  start: () => void
}
