/**
 * Interface (UI) — Apresentação narrativa, interação, acessibilidade.
 * Depende de: Domain + API pública da Engine.
 */
export { App } from './App'
export { useGameStore } from './store'
export type { GameStore } from './store'
export { useHashRoute, parseHash, navigateTo } from './hooks/use-hash-route'
export type { Route } from './hooks/use-hash-route'
export { applyTheme, loadThemePreference, saveThemePreference, subscribeToSystemThemeChanges, applyFontScale, loadFontScale, saveFontScale, FONT_SCALE_STEPS, FONT_SCALE_DEFAULT } from './theme'
export type { ThemePreference, FontScale } from './theme'
