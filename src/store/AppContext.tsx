import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import type { AppState, CheckIn, DayLog, ISODate, Meal, Pet, Profile } from '../types'
import { today } from '../lib/dates'
import { makeDefaultPet, applyFeed, type ShopItem } from '../lib/pet'
import { availablePoints } from '../lib/points'
import { emptyState, seedState } from './seed'

const STORAGE_KEY = 'bloom.state.v1'

// Validate the shape of a persisted/imported blob before trusting it. A
// corrupted or older-format value should never crash rendering — we fall back
// to the demo seed instead.
export function isValidState(value: unknown): value is AppState {
  if (!value || typeof value !== 'object') return false
  const s = value as Partial<AppState>
  if (!s.profile || typeof s.profile !== 'object') return false
  if (!s.days || typeof s.days !== 'object') return false
  const p = s.profile as Partial<Profile>
  if (typeof p.cycleLength !== 'number' || typeof p.lastPeriodStart !== 'string') return false
  // Every day entry must at least carry a date and a meals array.
  for (const day of Object.values(s.days as Record<string, unknown>)) {
    const d = day as Partial<DayLog>
    if (!d || typeof d.date !== 'string' || !Array.isArray(d.meals)) return false
  }
  return true
}

const DEFAULT_PROFILE: Profile = {
  name: '',
  cycleLength: 28,
  periodLength: 5,
  lastPeriodStart: today(),
  waterGoal: 8,
  proteinGoalMeals: 3,
  movementGoal: 20,
  ttc: true,
}

// Fill in any fields added since the saved version so older blobs keep working.
function migrate(state: AppState): AppState {
  const profile: Profile = { ...DEFAULT_PROFILE, ...state.profile }
  const days: Record<ISODate, DayLog> = {}
  for (const [date, d] of Object.entries(state.days)) {
    days[date] = { ...d, date, pain: d.pain ?? [], meals: d.meals ?? [], checkIns: d.checkIns ?? [] }
  }
  // Pet was added after the first releases — give older backups a companion.
  const pet: Pet = state.pet ? { ...makeDefaultPet(Date.now()), ...state.pet } : makeDefaultPet(Date.now())
  return { onboarded: state.onboarded ?? true, profile, pet, days }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (isValidState(parsed)) return migrate(parsed)
    }
  } catch {
    /* ignore — fall through to the seed */
  }
  // First run (or unreadable data) ships with demo history.
  return seedState()
}

function save(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

function emptyDay(date: ISODate): DayLog {
  return { date, pain: [], meals: [], checkIns: [], alcohol: false }
}

type Action =
  | { type: 'PATCH_DAY'; date: ISODate; patch: Partial<DayLog> }
  | { type: 'ADD_MEAL'; date: ISODate; meal: Meal }
  | { type: 'REMOVE_MEAL'; date: ISODate; mealId: string }
  | { type: 'ADD_CHECKIN'; date: ISODate; checkIn: CheckIn }
  | { type: 'SET_PROFILE'; profile: Partial<Profile>; onboard?: boolean }
  | { type: 'SET_PET'; patch: Partial<Pet> }
  | { type: 'FEED'; item: ShopItem }
  | { type: 'IMPORT'; state: AppState }
  | { type: 'RESET'; demo: boolean }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'PATCH_DAY': {
      const day = state.days[action.date] ?? emptyDay(action.date)
      return { ...state, days: { ...state.days, [action.date]: { ...day, ...action.patch } } }
    }
    case 'ADD_MEAL': {
      const day = state.days[action.date] ?? emptyDay(action.date)
      return {
        ...state,
        days: { ...state.days, [action.date]: { ...day, meals: [...day.meals, action.meal] } },
      }
    }
    case 'REMOVE_MEAL': {
      const day = state.days[action.date] ?? emptyDay(action.date)
      return {
        ...state,
        days: {
          ...state.days,
          [action.date]: { ...day, meals: day.meals.filter((m) => m.id !== action.mealId) },
        },
      }
    }
    case 'ADD_CHECKIN': {
      const day = state.days[action.date] ?? emptyDay(action.date)
      return {
        ...state,
        days: {
          ...state.days,
          [action.date]: { ...day, checkIns: [...day.checkIns, action.checkIn] },
        },
      }
    }
    case 'SET_PROFILE':
      return {
        ...state,
        profile: { ...state.profile, ...action.profile },
        onboarded: action.onboard ? true : state.onboarded,
      }
    case 'SET_PET':
      return { ...state, pet: { ...state.pet, ...action.patch } }
    case 'FEED': {
      // Only feed if it's affordable — guards against double taps / races.
      if (availablePoints(state) < action.item.cost) return state
      return { ...state, pet: applyFeed(state.pet, action.item, Date.now()) }
    }
    case 'IMPORT':
      return action.state
    case 'RESET':
      return action.demo ? seedState() : emptyState()
    default:
      return state
  }
}

interface Ctx {
  state: AppState
  todayLog: DayLog
  patchDay: (patch: Partial<DayLog>, date?: ISODate) => void
  addMeal: (meal: Meal, date?: ISODate) => void
  removeMeal: (mealId: string, date?: ISODate) => void
  addCheckIn: (checkIn: CheckIn, date?: ISODate) => void
  setProfile: (profile: Partial<Profile>, onboard?: boolean) => void
  setPet: (patch: Partial<Pet>) => void
  feed: (item: ShopItem) => void
  importState: (state: AppState) => void
  reset: (demo: boolean) => void
}

const AppCtx = createContext<Ctx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => save(state), [state])

  const value = useMemo<Ctx>(() => {
    const t = today()
    const todayLog = state.days[t] ?? emptyDay(t)
    return {
      state,
      todayLog,
      patchDay: (patch, date = t) => dispatch({ type: 'PATCH_DAY', date, patch }),
      addMeal: (meal, date = t) => dispatch({ type: 'ADD_MEAL', date, meal }),
      removeMeal: (mealId, date = t) => dispatch({ type: 'REMOVE_MEAL', date, mealId }),
      addCheckIn: (checkIn, date = t) => dispatch({ type: 'ADD_CHECKIN', date, checkIn }),
      setProfile: (profile, onboard) => dispatch({ type: 'SET_PROFILE', profile, onboard }),
      setPet: (patch) => dispatch({ type: 'SET_PET', patch }),
      feed: (item) => dispatch({ type: 'FEED', item }),
      importState: (next) => dispatch({ type: 'IMPORT', state: next }),
      reset: (demo) => dispatch({ type: 'RESET', demo }),
    }
  }, [state])

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp(): Ctx {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export const newId = () =>
  `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
