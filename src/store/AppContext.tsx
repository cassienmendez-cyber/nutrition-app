import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import type { AppState, CheckIn, DayLog, ISODate, Meal, Profile } from '../types'
import { today } from '../lib/dates'
import { emptyState, seedState } from './seed'

const STORAGE_KEY = 'bloom.state.v1'

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as AppState
  } catch {
    /* ignore */
  }
  // First run ships with demo history so the app feels alive immediately.
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
