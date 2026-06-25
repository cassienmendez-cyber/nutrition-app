import { useState } from 'react'
import { useApp, newId } from '../store/AppContext'
import { weeklyInsights } from '../lib/coach'
import { suggestMeals, CRAVING_OPTIONS, type Craving } from '../lib/grocery'
import type { EatingReason, MealSlot } from '../types'

const SLOTS: { value: MealSlot; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
  { value: 'dessert', label: 'Dessert' },
]

const REASONS: { value: EatingReason; label: string }[] = [
  { value: 'hungry', label: 'Actually hungry' },
  { value: 'stress', label: 'Stress' },
  { value: 'bored', label: 'Bored' },
  { value: 'celebration', label: 'Celebration' },
  { value: 'sad', label: 'Sad' },
  { value: 'habit', label: 'Habit' },
  { value: 'social', label: 'Social event' },
  { value: 'lonely', label: 'Lonely' },
  { value: 'reward', label: 'Reward' },
]

const HUNGER_LABELS: Record<number, string> = {
  1: 'Starving',
  3: 'Pretty hungry',
  5: 'Comfortably hungry',
  8: 'Satisfied',
  10: 'Stuffed',
}

export function Nutrition() {
  const { state, todayLog, addMeal, removeMeal } = useApp()
  const [open, setOpen] = useState(false)
  const [slot, setSlot] = useState<MealSlot>('breakfast')
  const [desc, setDesc] = useState('')
  const [hasProtein, setHasProtein] = useState(false)
  const [hasVeg, setHasVeg] = useState(false)
  const [hunger, setHunger] = useState(5)
  const [reason, setReason] = useState<EatingReason>('hungry')
  const [craving, setCraving] = useState<Craving | null>(null)

  const insights = weeklyInsights(state).filter((i) =>
    ['skip-breakfast', 'lunch-cravings', 'low-protein', 'stress-eating'].includes(i.id),
  )

  function save() {
    if (!desc.trim()) return
    addMeal({
      id: newId(),
      slot,
      description: desc.trim(),
      hasProtein,
      hasVeg,
      hunger,
      reason,
      loggedAt: Date.now(),
    })
    setDesc('')
    setHasProtein(false)
    setHasVeg(false)
    setHunger(5)
    setReason('hungry')
    setOpen(false)
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <div className="eyebrow">Nutrition</div>
        <h1>What did you eat?</h1>
        <p>Just log the meal — no calories, no good or bad foods. We find the patterns.</p>
      </div>

      {/* Pattern insights */}
      {insights.length > 0 && (
        <div className="card">
          <div className="card-title">Patterns we’re noticing</div>
          {insights.map((i) => (
            <div className={`insight ${i.tone}`} key={i.id}>
              <span className="ic">🔍</span>
              <span>{i.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Today's meals */}
      <div className="card">
        <div className="card-title">Today’s meals</div>
        {todayLog.meals.length === 0 && (
          <p className="muted" style={{ margin: '4px 0' }}>Nothing logged yet — and that’s fine.</p>
        )}
        {todayLog.meals.map((m) => (
          <div className="meal-card" key={m.id}>
            <div>
              <div className="slot">{m.slot}</div>
              <div className="desc">{m.description}</div>
              <div className="tags">
                {m.hasProtein ? '💪 protein · ' : ''}
                {m.hasVeg ? '🥦 veg · ' : ''}
                hunger {m.hunger}/10 · {REASONS.find((r) => r.value === m.reason)?.label}
              </div>
            </div>
            <button className="del" aria-label={`Remove ${m.slot}: ${m.description}`} onClick={() => removeMeal(m.id)}>✕</button>
          </div>
        ))}
        {!open ? (
          <button className="btn" style={{ marginTop: 12 }} onClick={() => setOpen(true)}>
            + Log a meal
          </button>
        ) : (
          <div style={{ marginTop: 14 }}>
            <div className="field">
              <label>Which meal?</label>
              <div className="chip-row">
                {SLOTS.map((s) => (
                  <button
                    key={s.value}
                    className={`chip ${slot === s.value ? 'selected' : ''}`}
                    onClick={() => setSlot(s.value)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>What was it?</label>
              <input
                type="text"
                value={desc}
                placeholder="e.g. yogurt & berries, or pizza — no judgment"
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>

            <div className="field">
              <label>What was in it?</label>
              <div className="chip-row">
                <button className={`chip ${hasProtein ? 'selected' : ''}`} onClick={() => setHasProtein(!hasProtein)}>
                  💪 Had protein
                </button>
                <button className={`chip ${hasVeg ? 'selected' : ''}`} onClick={() => setHasVeg(!hasVeg)}>
                  🥦 Had veg/fruit
                </button>
              </div>
            </div>

            <div className="field">
              <label>How hungry were you? — {hunger}/10 · {HUNGER_LABELS[hunger] ?? ''}</label>
              <input
                type="range"
                min={1}
                max={10}
                value={hunger}
                onChange={(e) => setHunger(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between' }} className="muted">
                <span>Starving</span><span>Comfortable</span><span>Stuffed</span>
              </div>
            </div>

            <div className="field">
              <label>What led to eating?</label>
              <div className="chip-row">
                {REASONS.map((r) => (
                  <button
                    key={r.value}
                    className={`chip ${reason === r.value ? 'selected' : ''}`}
                    onClick={() => setReason(r.value)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="row">
              <button className="btn secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn" onClick={save}>Save meal</button>
            </div>
          </div>
        )}
      </div>

      {/* Smart meal suggestions */}
      <div className="card">
        <div className="card-title">What sounds good?</div>
        <div className="chip-row">
          {CRAVING_OPTIONS.map((c) => (
            <button
              key={c.value}
              className={`chip ${craving === c.value ? 'selected' : ''}`}
              onClick={() => setCraving(c.value)}
            >
              <span className="emoji">{c.emoji}</span> {c.label}
            </button>
          ))}
        </div>
        {craving && (
          <div style={{ marginTop: 12 }}>
            {suggestMeals(craving).map((idea) => (
              <div className="move-item" key={idea.name}>
                <span className="min">{idea.protein ? '💪' : '🍽'}</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{idea.name}</div>
                  <div className="muted" style={{ fontSize: 13 }}>{idea.why}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
