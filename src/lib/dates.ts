import type { ISODate } from '../types'

export function toISO(d: Date): ISODate {
  // Use LOCAL date components — not toISOString(), which is UTC and would roll
  // the day over for anyone west of UTC (e.g. a New Yorker at 8pm EST would be
  // logged to "tomorrow"). This adapts to EST/EDT automatically.
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function today(): ISODate {
  return toISO(new Date())
}

export function parseISO(s: ISODate): Date {
  // Anchor at noon to dodge timezone/DST off-by-one issues.
  return new Date(s + 'T12:00:00')
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = parseISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export function daysBetween(a: ISODate, b: ISODate): number {
  const ms = parseISO(b).getTime() - parseISO(a).getTime()
  return Math.round(ms / 86_400_000)
}

export function lastNDays(n: number, end: ISODate = today()): ISODate[] {
  return Array.from({ length: n }, (_, i) => addDays(end, -(n - 1 - i)))
}

export function weekdayShort(s: ISODate): string {
  return parseISO(s).toLocaleDateString(undefined, { weekday: 'short' })
}

export function prettyDate(s: ISODate): string {
  return parseISO(s).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}
