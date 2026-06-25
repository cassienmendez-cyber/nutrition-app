// Light / dark / auto theme. The initial theme is applied by an inline script
// in index.html (so there's no flash); this module keeps it in sync and lets
// Settings change it.

export type ThemePref = 'auto' | 'light' | 'dark'

const KEY = 'bloom.theme.v1'

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'auto') return v
  } catch {
    /* ignore */
  }
  return 'auto'
}

export function isDark(pref: ThemePref = getThemePref()): boolean {
  if (pref === 'dark') return true
  if (pref === 'light') return false
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyTheme(pref: ThemePref = getThemePref()): void {
  if (typeof document === 'undefined') return
  const dark = isDark(pref)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  const tc = document.querySelector('meta[name=theme-color]')
  if (tc) tc.setAttribute('content', dark ? '#0f1518' : '#2f9e7f')
}

export function setThemePref(pref: ThemePref): void {
  try {
    localStorage.setItem(KEY, pref)
  } catch {
    /* ignore */
  }
  applyTheme(pref)
}

// Keep "auto" in step with the OS toggling dark mode while the app is open.
export function watchSystemTheme(): void {
  if (typeof matchMedia === 'undefined') return
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getThemePref() === 'auto') applyTheme('auto')
  })
}
