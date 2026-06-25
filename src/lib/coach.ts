import type { AppState, DayLog, ISODate, Win } from '../types'
import { lastNDays, today, weekdayShort } from './dates'
import { pregnancyPrepScore } from './scores'

// The coach is the heart of the app. It never says "good" or "bad," never
// shames. It notices patterns and offers one practical, kind next step.
//
// In a production build these prompts would be sent to Claude; here we ship a
// transparent rule engine so the experience is fully functional offline and the
// "voice" stays consistent and compassionate.

export interface Insight {
  id: string
  tone: 'celebrate' | 'notice' | 'support'
  text: string
}

// A day "counts" for weekly stats only if the user actually logged something.
// This stops unlogged days (and today, which is still in progress) from
// deflating scores or being miscounted as a "skipped breakfast."
export function isActiveDay(d: DayLog): boolean {
  return (
    d.meals.length > 0 ||
    (d.movementMinutes ?? 0) > 0 ||
    (d.waterGlasses ?? 0) > 0 ||
    d.sleepHours != null ||
    d.prenatalTaken != null ||
    d.stress != null ||
    d.bodyFeel != null
  )
}

// The week we reflect on: the 7 days ending YESTERDAY (today is still unfolding),
// keeping only days with real activity.
export function weekDays(state: AppState): DayLog[] {
  return lastNDays(7, today())
    .filter((d) => d !== today())
    .map((d) => state.days[d])
    .filter((d): d is DayLog => !!d && isActiveDay(d))
}

function count(days: DayLog[], pred: (d: DayLog) => boolean): number {
  return days.filter(pred).length
}

function loggedMeal(d: DayLog, slot: string): boolean {
  return d.meals.some((m) => m.slot === slot)
}

const EMOTIONAL_REASONS = ['stress', 'sad', 'bored', 'lonely', 'reward'] as const

export function weeklyInsights(state: AppState): Insight[] {
  const week = weekDays(state)
  const out: Insight[] = []
  if (week.length === 0) return out

  // --- Skipped meals -------------------------------------------------------
  const skippedBreakfast = count(week, (d) => !loggedMeal(d, 'breakfast'))
  if (skippedBreakfast >= 3) {
    out.push({
      id: 'skip-breakfast',
      tone: 'notice',
      text: `You've skipped breakfast ${skippedBreakfast} days this week. Want three breakfasts that take under three minutes? Eating earlier often softens evening cravings.`,
    })
  }

  const skippedLunch = count(week, (d) => !loggedMeal(d, 'lunch'))
  const hadDessertOrSnack = count(week, (d) => loggedMeal(d, 'dessert') || loggedMeal(d, 'snack'))
  if (skippedLunch >= 3 && hadDessertOrSnack >= 3) {
    out.push({
      id: 'lunch-cravings',
      tone: 'notice',
      text: `You skipped lunch ${skippedLunch} days, and those were often the days you reached for something sweet later. That's your body asking for energy — not a willpower problem.`,
    })
  }

  // --- Protein -------------------------------------------------------------
  const lowProteinDays = count(week, (d) => d.meals.filter((m) => m.hasProtein).length <= 1)
  if (lowProteinDays >= 3) {
    out.push({
      id: 'low-protein',
      tone: 'notice',
      text: `On ${lowProteinDays} days you had protein only once. Protein steadies energy and matters while trying to conceive — even a cheese stick or Greek yogurt counts.`,
    })
  }

  // --- Emotional-eating pattern (from real logged reasons) ----------------
  const meals = week.flatMap((d) => d.meals)
  const emotional = meals.filter((m) => (EMOTIONAL_REASONS as readonly string[]).includes(m.reason))
  if (emotional.length >= 3) {
    // Name the most common trigger so it feels seen, not generic.
    const tally = emotional.reduce<Record<string, number>>((acc, m) => {
      acc[m.reason] = (acc[m.reason] ?? 0) + 1
      return acc
    }, {})
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0]
    out.push({
      id: 'emotional-eating',
      tone: 'support',
      text: `Eating followed a feeling (most often "${top}") ${emotional.length} times this week. That's information, not a failure — a short walk or some box breathing before eating can change how the meal lands.`,
    })
  }

  // --- Hunger-scale pattern (from the 1–10 logged at each meal) -----------
  const hungers = meals.map((m) => m.hunger).filter((h) => typeof h === 'number')
  if (hungers.length >= 4) {
    const starving = hungers.filter((h) => h <= 2).length
    const stuffed = hungers.filter((h) => h >= 9).length
    if (starving >= 3) {
      out.push({
        id: 'hunger-starving',
        tone: 'notice',
        text: `You often waited until you were starving (${starving} meals this week). Eating a little sooner keeps energy and mood steadier — and usually means a calmer meal.`,
      })
    } else if (stuffed >= 3) {
      out.push({
        id: 'hunger-stuffed',
        tone: 'support',
        text: `A few meals left you very full (${stuffed} this week). No judgment — it often follows a day of under-eating. Steady protein earlier tends to soften that.`,
      })
    }
  }

  // --- Hydration trend -----------------------------------------------------
  const lowWater = count(week, (d) => (d.waterGlasses ?? 0) < state.profile.waterGoal * 0.5)
  if (lowWater >= 3) {
    out.push({
      id: 'low-water',
      tone: 'notice',
      text: `Water ran low on ${lowWater} days. Try linking a glass to something you already do — every time you check your phone, a sip.`,
    })
  }

  // --- Pain / movement reroute --------------------------------------------
  const painDays = week.filter((d) => d.pain.length > 0)
  if (painDays.length >= 2) {
    const area = painDays[painDays.length - 1].pain[0]
    out.push({
      id: 'pain-reroute',
      tone: 'support',
      text: `Your ${area} flared on ${painDays.length} days. Next week we'll swap one walk for mobility work so movement doesn't depend on a pain-free body.`,
    })
  }

  return out
}

// Wins — concrete, non-weight things worth celebrating.
export function weeklyWins(state: AppState): Win[] {
  const week = weekDays(state)
  const wins: Win[] = []
  if (week.length === 0) return wins

  const movedThroughPain = week.filter((d) => d.pain.length > 0 && (d.movementMinutes ?? 0) > 0)
  if (movedThroughPain.length > 0) {
    const d = movedThroughPain[movedThroughPain.length - 1]
    wins.push({ emoji: '🎉', text: `You moved ${d.movementMinutes} minutes despite ${d.pain[0]} pain.` })
  }

  const breakfasts = count(week, (d) => d.meals.some((m) => m.slot === 'breakfast'))
  if (breakfasts >= 2) wins.push({ emoji: '🎉', text: `You ate breakfast ${breakfasts} days this week.` })

  const prenatal = count(week, (d) => !!d.prenatalTaken)
  if (prenatal >= 4) wins.push({ emoji: '🎉', text: `You remembered your prenatal ${prenatal} days.` })

  const cooked = count(week, (d) => d.meals.length >= 3)
  if (cooked >= 3) wins.push({ emoji: '🎉', text: `You nourished yourself with full meals ${cooked} days.` })

  // Protein trend: compare first vs second half of the week.
  const half = Math.floor(week.length / 2)
  const early = week.slice(0, half)
  const late = week.slice(half)
  const proteinAvg = (arr: DayLog[]) =>
    arr.length ? arr.reduce((s, d) => s + d.meals.filter((m) => m.hasProtein).length, 0) / arr.length : 0
  if (proteinAvg(late) > proteinAvg(early)) {
    wins.push({ emoji: '🎉', text: 'Your protein intake increased over the week.' })
  }

  const bps = week.filter((d) => d.bloodPressure).map((d) => d.bloodPressure!.systolic)
  if (bps.length >= 2 && bps[bps.length - 1] < bps[0]) {
    wins.push({ emoji: '🎉', text: 'Your blood pressure improved this week.' })
  }

  return wins
}

// The Sunday narrative review — the "talk to me like a person" summary.
export function weeklyReviewNarrative(state: AppState): string {
  const week = weekDays(state)
  if (week.length === 0)
    return "We don't have a full week of data yet — keep checking in, and your first review will be here soon."

  const { score } = pregnancyPrepScore(week, state.profile)
  const insights = weeklyInsights(state)
  const wins = weeklyWins(state)

  const parts: string[] = []
  parts.push(`This week your preparation score landed around ${score}%.`)

  if (wins.length) parts.push(wins.slice(0, 2).map((w) => w.text.replace(/^.. /, '')).join(' '))
  if (insights.length) parts.push(insights[0].text)

  // A forward-looking, gentle plan.
  const painDays = week.filter((d) => d.pain.length > 0)
  if (painDays.length >= 2) {
    parts.push(`Your ${painDays[0].pain[0]} was worse on ${painDays.map((d) => weekdayShort(d.date)).slice(0, 2).join(' and ')}, so next week we'll substitute mobility work for one session.`)
  }

  parts.push('None of this is about being perfect. It’s evidence that you’re becoming healthier — and that matters.')
  return parts.join(' ')
}

// The conversational check-in — responds to free text / "voice" the way the
// chat described. Keeps the no-lecture, practical-coaching voice.
export function respondToCheckIn(text: string): string {
  const t = text.toLowerCase()
  const fragments: string[] = []

  const skippedMeal = /skip|didn'?t eat|haven'?t eaten|no breakfast|no lunch/.test(t)
  const wantsSweet = /ice cream|sweet|sugar|candy|chocolate|dessert|cookie/.test(t)
  const pain = /hurt|sore|pain|ache|ankle|knee|back|neck|hip/.test(t)
  const stress = /stress|overwhelm|anxious|hard day|exhaust|tired|burn/.test(t)

  if (skippedMeal && wantsSweet) {
    fragments.push(
      "Makes sense — you've barely eaten, so your body's asking for quick energy. Have the treat if you want it, but pair it with a little protein first (a cheese stick or Greek yogurt) so the crash is softer.",
    )
  } else if (skippedMeal) {
    fragments.push(
      "Sounds like food got away from you today. No guilt — let's just get one protein-rich thing in soon so tonight doesn't snowball.",
    )
  } else if (wantsSweet) {
    fragments.push(
      "A craving isn't a moral event. Enjoy it — and if you add a bit of protein alongside, you'll feel steadier afterward.",
    )
  }

  if (pain) {
    fragments.push(
      "Since your body's hurting, today's movement can be a few minutes of mobility or stretching — that still counts, fully.",
    )
  }

  if (stress) {
    fragments.push(
      "Stressful days are real. The smallest wins are enough right now: water, one good meal, and your prenatal. That's a complete day.",
    )
  }

  if (fragments.length === 0) {
    fragments.push(
      "Thanks for telling me. Whatever today looked like, it's data, not a verdict. Want to aim for one small kind thing — a glass of water or a 5-minute walk?",
    )
  }

  fragments.push('Tomorrow we can aim for a quick breakfast so this doesn’t carry over. You’re doing better than it feels.')
  return fragments.join(' ')
}

// Bad-day mode shrinks the day to the essentials so success stays reachable.
export function badDayGoals(): { emoji: string; text: string }[] {
  return [
    { emoji: '💧', text: 'Drink a glass of water' },
    { emoji: '🍳', text: 'Eat one protein-rich thing' },
    { emoji: '🚶', text: 'Move for five minutes, if you’re able' },
    { emoji: '💊', text: 'Take your prenatal' },
  ]
}

export function streakFreeMomentum(state: AppState): { level: number; wateredToday: boolean; recentDays: ISODate[] } {
  // Momentum, not streaks: every healthy choice in the last 14 days waters the
  // plant. A missed day doesn't kill it — the plant just doesn't grow that day.
  const window = lastNDays(14)
  let level = 0
  for (const date of window) {
    const d = state.days[date]
    if (!d) continue
    const healthyChoice =
      (d.movementMinutes ?? 0) > 0 ||
      d.meals.some((m) => m.hasProtein) ||
      (d.waterGlasses ?? 0) >= state.profile.waterGoal * 0.5 ||
      d.prenatalTaken
    if (healthyChoice) level += 1
  }
  const todayLog = state.days[today()]
  const wateredToday = !!todayLog && (
    (todayLog.movementMinutes ?? 0) > 0 ||
    todayLog.meals.some((m) => m.hasProtein) ||
    (todayLog.waterGlasses ?? 0) > 0 ||
    !!todayLog.prenatalTaken
  )
  return { level, wateredToday, recentDays: window }
}
