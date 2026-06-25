import type { ISODate, Profile } from '../types'
import { addDays, daysBetween, today } from './dates'

export type CyclePhase = 'menstrual' | 'follicular' | 'fertile' | 'ovulation' | 'luteal'

export interface CycleInfo {
  cycleDay: number
  phase: CyclePhase
  ovulationDate: ISODate
  fertileStart: ISODate
  fertileEnd: ISODate
  nextPeriod: ISODate
  daysUntilOvulation: number
  inFertileWindow: boolean
  ovulationTomorrow: boolean
}

// Standard model: ovulation ~14 days before the next period (luteal phase is
// the more stable half). The fertile window is the 5 days before ovulation
// plus the day of, reflecting sperm survival.
export function cycleInfo(profile: Profile, on: ISODate = today()): CycleInfo {
  const { cycleLength, lastPeriodStart } = profile

  // Find the start of the cycle that `on` falls within.
  let cycleStart = lastPeriodStart
  while (daysBetween(cycleStart, on) >= cycleLength) {
    cycleStart = addDays(cycleStart, cycleLength)
  }
  // Guard against an `on` date before the recorded period.
  while (daysBetween(cycleStart, on) < 0) {
    cycleStart = addDays(cycleStart, -cycleLength)
  }

  const cycleDay = daysBetween(cycleStart, on) + 1
  const ovulationDate = addDays(cycleStart, cycleLength - 14)
  const fertileStart = addDays(ovulationDate, -5)
  const fertileEnd = addDays(ovulationDate, 1)
  const nextPeriod = addDays(cycleStart, cycleLength)
  const daysUntilOvulation = daysBetween(on, ovulationDate)

  const inFertileWindow =
    daysBetween(fertileStart, on) >= 0 && daysBetween(on, fertileEnd) >= 0

  let phase: CyclePhase
  if (cycleDay <= profile.periodLength) phase = 'menstrual'
  else if (daysUntilOvulation === 0) phase = 'ovulation'
  else if (inFertileWindow) phase = 'fertile'
  else if (cycleDay < cycleLength - 14) phase = 'follicular'
  else phase = 'luteal'

  return {
    cycleDay,
    phase,
    ovulationDate,
    fertileStart,
    fertileEnd,
    nextPeriod,
    daysUntilOvulation,
    inFertileWindow,
    ovulationTomorrow: daysUntilOvulation === 1,
  }
}

export const PHASE_COPY: Record<CyclePhase, { label: string; note: string }> = {
  menstrual: {
    label: 'Menstrual',
    note: 'Rest is productive right now. Iron-rich foods and gentle movement help.',
  },
  follicular: {
    label: 'Follicular',
    note: 'Energy is climbing. A good week to build strength and try new meals.',
  },
  fertile: {
    label: 'Fertile window',
    note: 'Your most fertile days. Hydration, sleep, and low stress matter most now.',
  },
  ovulation: {
    label: 'Ovulation',
    note: 'Peak fertility today. Be kind to yourself and stay well-nourished.',
  },
  luteal: {
    label: 'Luteal',
    note: 'Cravings and fatigue are normal here. Steady protein smooths the dips.',
  },
}
