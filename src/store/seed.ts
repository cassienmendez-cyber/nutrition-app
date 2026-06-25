import type { AppState, DayLog, EatingReason, MealSlot } from '../types'
import { addDays, lastNDays, today } from '../lib/dates'

let idc = 0
const id = () => `seed-${idc++}`

function meal(slot: MealSlot, description: string, hasProtein: boolean, hasVeg: boolean, hunger: number, reason: EatingReason) {
  return { id: id(), slot, description, hasProtein, hasVeg, hunger, reason, loggedAt: 0 }
}

// Build ~14 days of believable history so the dashboard, patterns, wins, and
// weekly review all have something honest to say on first open. The story it
// tells: skips breakfast & lunch often, sweet cravings at night, an ankle that
// flares, but improving protein and faithful prenatals.
function buildDays(): Record<string, DayLog> {
  const dates = lastNDays(14)
  const days: Record<string, DayLog> = {}

  dates.forEach((date, i) => {
    const skipBreakfast = [0, 2, 5, 8, 11].includes(i)
    const skipLunch = [1, 3, 6, 9].includes(i)
    const ankleDay = [3, 4, 9, 10].includes(i)
    const stressDay = [2, 6, 9, 12].includes(i)
    const improving = i > 7 // protein picks up in the back half

    const meals: DayLog['meals'] = []
    if (!skipBreakfast) meals.push(meal('breakfast', 'Greek yogurt & berries', true, false, 4, 'hungry'))
    if (!skipLunch) meals.push(meal('lunch', improving ? 'Chicken burrito bowl' : 'Side salad', improving, true, 5, 'hungry'))
    meals.push(meal('dinner', improving ? 'Sheet-pan chicken & veg' : 'Pasta', improving, true, 6, 'hungry'))
    if (stressDay) meals.push(meal('dessert', 'Ice cream', false, false, 8, 'stress'))
    if (skipLunch) meals.push(meal('snack', 'Cookies', false, false, 7, 'stress'))

    days[date] = {
      date,
      bodyFeel: ankleDay ? 'sore' : i % 3 === 0 ? 'tired' : 'good',
      pain: ankleDay ? ['ankle'] : [],
      meals,
      waterGlasses: [2, 3, 4, 5, 6, 6, 7][i % 7],
      movementMinutes: ankleDay ? 10 : [0, 15, 20, 25, 30][i % 5],
      movementNote: ankleDay ? 'Chair workout — ankle' : '',
      sleepHours: [5.5, 6, 6.5, 7, 7.5, 8][i % 6],
      stress: stressDay ? 'high' : i % 2 === 0 ? 'medium' : 'low',
      prenatalTaken: i !== 4, // remembered almost every day
      bloodPressure: i % 4 === 0 ? { systolic: 124 - Math.floor(i / 4) * 2, diastolic: 80 } : undefined,
      alcohol: false,
      fertility: {
        mucus: i >= 11 ? 'egg-white' : i >= 9 ? 'watery' : 'creamy',
        mood: stressDay ? 'low' : 'okay',
      },
      checkIns: [],
    }
  })

  // Clear today's log so the user starts fresh but with history behind them.
  days[today()] = {
    date: today(),
    pain: [],
    meals: [],
    checkIns: [],
    alcohol: false,
  }

  return days
}

export function seedState(): AppState {
  return {
    onboarded: true,
    profile: {
      name: 'friend',
      cycleLength: 28,
      periodLength: 5,
      // Set the last period so that today lands near the fertile window.
      lastPeriodStart: addDays(today(), -13),
      waterGoal: 8,
      proteinGoalMeals: 3,
      movementGoal: 20,
      ttc: true,
    },
    days: buildDays(),
  }
}

export function emptyState(): AppState {
  return {
    onboarded: false,
    profile: {
      name: '',
      cycleLength: 28,
      periodLength: 5,
      lastPeriodStart: today(),
      waterGoal: 8,
      proteinGoalMeals: 3,
      movementGoal: 20,
      ttc: true,
    },
    days: {
      [today()]: { date: today(), pain: [], meals: [], checkIns: [], alcohol: false },
    },
  }
}
