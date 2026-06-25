import type { AppState } from '../types'
import { lastNDays } from './dates'

// Export / import all Bloom data. Local-first means the user owns their data —
// they can take it with them (JSON for backup/restore, CSV for spreadsheets)
// and bring it back. Nothing leaves the device unless the user saves a file.

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function stamp(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function exportJSON(state: AppState) {
  download(`bloom-backup-${stamp()}.json`, JSON.stringify(state, null, 2), 'application/json')
}

// A friendly spreadsheet of the last 90 days — the building blocks, not weight.
export function exportCSV(state: AppState) {
  const headers = [
    'date',
    'body_feel',
    'pain',
    'meals_logged',
    'protein_meals',
    'veg_meals',
    'water_glasses',
    'movement_minutes',
    'sleep_hours',
    'stress',
    'prenatal_taken',
    'alcohol',
    'bad_day',
  ]
  const rows = lastNDays(90)
    .map((date) => state.days[date])
    .filter(Boolean)
    .map((d) => {
      const cells = [
        d.date,
        d.bodyFeel ?? '',
        d.pain.join('|'),
        d.meals.length,
        d.meals.filter((m) => m.hasProtein).length,
        d.meals.filter((m) => m.hasVeg).length,
        d.waterGlasses ?? '',
        d.movementMinutes ?? '',
        d.sleepHours ?? '',
        d.stress ?? '',
        d.prenatalTaken ? 'yes' : 'no',
        d.alcohol ? 'yes' : 'no',
        d.badDay ? 'yes' : 'no',
      ]
      return cells.join(',')
    })
  download(`bloom-log-${stamp()}.csv`, [headers.join(','), ...rows].join('\n'), 'text/csv')
}

export async function importJSON(file: File): Promise<AppState> {
  const text = await file.text()
  const data = JSON.parse(text) as AppState
  // Light validation — must look like a Bloom backup.
  if (!data || typeof data !== 'object' || !data.profile || !data.days) {
    throw new Error('That doesn’t look like a Bloom backup file.')
  }
  return data
}
