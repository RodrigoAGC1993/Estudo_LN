/**
 * Theme Management (ADR-12)
 * Applies data-theme attribute, loads/saves preference to cdp_preferences.
 * Also manages font scale via --font-scale CSS custom property.
 */

export type ThemePreference = 'system' | 'light' | 'dark'

export type FontScale = 0.75 | 1 | 1.25 | 1.5
export const FONT_SCALE_STEPS: FontScale[] = [0.75, 1, 1.25, 1.5]
export const FONT_SCALE_DEFAULT: FontScale = 1

const STORAGE_KEY = 'cdp_preferences'

interface CdpPreferences {
  theme: ThemePreference
  fontScale?: number
}

/** Load saved theme preference from localStorage, defaulting to 'system'. */
export function loadThemePreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return 'system'
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'theme' in parsed &&
      isValidTheme((parsed as CdpPreferences).theme)
    ) {
      return (parsed as CdpPreferences).theme
    }
  } catch {
    // localStorage unavailable or corrupted — use default
  }
  return 'system'
}

/** Persist theme preference to localStorage. */
export function saveThemePreference(theme: ThemePreference): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    let prefs: Record<string, unknown> = {}
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw)
        if (typeof parsed === 'object' && parsed !== null) {
          prefs = parsed as Record<string, unknown>
        }
      } catch {
        // Reset if corrupted
      }
    }
    prefs.theme = theme
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // localStorage unavailable — operate in memory only
  }
}

/** Resolve the effective theme (light or dark) based on preference and system. */
function resolveEffectiveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'light') return 'light'
  if (preference === 'dark') return 'dark'
  // 'system' — follow OS
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Apply theme to the document element. */
export function applyTheme(preference: ThemePreference): void {
  const effective = resolveEffectiveTheme(preference)
  document.documentElement.setAttribute('data-theme', effective)
}

/**
 * Set up matchMedia listener for system theme changes.
 * Returns an unsubscribe function. Listener is only meaningful when preference = 'system'.
 */
export function subscribeToSystemThemeChanges(
  getCurrentPreference: () => ThemePreference
): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = () => {
    if (getCurrentPreference() === 'system') {
      applyTheme('system')
    }
  }
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}

/** Load saved font scale from localStorage. */
export function loadFontScale(): FontScale {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return FONT_SCALE_DEFAULT
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'fontScale' in parsed &&
      isValidFontScale((parsed as CdpPreferences).fontScale)
    ) {
      return (parsed as CdpPreferences).fontScale as FontScale
    }
  } catch {
    // localStorage unavailable or corrupted — use default
  }
  return FONT_SCALE_DEFAULT
}

/** Persist font scale to localStorage. */
export function saveFontScale(scale: FontScale): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    let prefs: Record<string, unknown> = {}
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw)
        if (typeof parsed === 'object' && parsed !== null) {
          prefs = parsed as Record<string, unknown>
        }
      } catch {
        // Reset if corrupted
      }
    }
    prefs.fontScale = scale
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // localStorage unavailable — operate in memory only
  }
}

/** Apply font scale via CSS custom property on <html>. */
export function applyFontScale(scale: FontScale): void {
  document.documentElement.style.setProperty('--font-scale', scale.toString())
}

function isValidFontScale(value: unknown): value is FontScale {
  return (
    typeof value === 'number' &&
    FONT_SCALE_STEPS.includes(value as FontScale)
  )
}

function isValidTheme(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}
