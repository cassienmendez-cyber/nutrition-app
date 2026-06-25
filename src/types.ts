// ---------------------------------------------------------------------------
// Bloom data model
//
// The philosophy: we are not chasing perfection or counting calories. We are
// collecting gentle evidence that someone is becoming healthier. Every type
// here is shaped around *patterns and feelings*, not judgment.
// ---------------------------------------------------------------------------

export type ISODate = string // 'YYYY-MM-DD'

export type BodyFeel = 'great' | 'good' | 'tired' | 'sore' | 'everything-hurts'

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert'

// What led to eating — captured without judgment, just data.
export type EatingReason =
  | 'hungry'
  | 'stress'
  | 'bored'
  | 'celebration'
  | 'sad'
  | 'habit'
  | 'social'
  | 'lonely'
  | 'reward'

export interface Meal {
  id: string
  slot: MealSlot
  description: string
  // Did it contain a real protein source? Patterns, not grams.
  hasProtein: boolean
  hasVeg: boolean
  // Hunger scale, 1 (starving) … 10 (stuffed). 5 = comfortably hungry.
  hunger: number
  reason: EatingReason
  loggedAt: number
}

// Pain or tightness the body is carrying today. Drives the exercise engine.
export type PainArea =
  | 'ankle'
  | 'knee'
  | 'neck'
  | 'hip'
  | 'back'
  | 'wrist'
  | 'shoulder'

export interface FertilitySigns {
  // Cervical mucus quality — a classic fertility window signal.
  mucus?: 'dry' | 'sticky' | 'creamy' | 'watery' | 'egg-white'
  // Basal body temperature in °F (optional).
  bbt?: number
  mood?: 'low' | 'okay' | 'good' | 'great'
  intimacy?: boolean
  symptoms?: string[]
}

export interface DayLog {
  date: ISODate
  bodyFeel?: BodyFeel
  pain: PainArea[]
  meals: Meal[]
  // 0–10 self-reported intake relative to your own goal.
  waterGlasses?: number
  // Movement minutes actually done (any kind counts).
  movementMinutes?: number
  movementNote?: string
  sleepHours?: number
  stress?: 'low' | 'medium' | 'high'
  prenatalTaken?: boolean
  bloodPressure?: { systolic: number; diastolic: number }
  alcohol?: boolean
  // The compassion escape hatch — shrinks the day's goals to the essentials.
  badDay?: boolean
  fertility?: FertilitySigns
  // Voice / free-text check-ins, transcribed.
  checkIns: CheckIn[]
}

export interface CheckIn {
  id: string
  text: string
  reply: string
  at: number
}

export interface Profile {
  name: string
  // Average cycle length in days; used to predict the fertile window.
  cycleLength: number
  periodLength: number
  // First day of the most recent period.
  lastPeriodStart: ISODate
  waterGoal: number // glasses per day
  proteinGoalMeals: number // # of meals that should contain protein
  movementGoal: number // minutes per day
  ttc: boolean // trying to conceive
}

export interface AppState {
  profile: Profile
  days: Record<ISODate, DayLog>
  onboarded: boolean
}

// A "win" — something worth celebrating that isn't weight loss.
export interface Win {
  emoji: string
  text: string
}
