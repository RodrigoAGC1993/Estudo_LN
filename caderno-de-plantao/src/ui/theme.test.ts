import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { loadThemePreference, saveThemePreference, applyTheme, loadFontScale, saveFontScale, applyFontScale, FONT_SCALE_STEPS, FONT_SCALE_DEFAULT } from './theme'

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    mockMatchMedia(false) // default: light system theme
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('loadThemePreference', () => {
    it('returns system when no preference is stored', () => {
      expect(loadThemePreference()).toBe('system')
    })

    it('returns stored theme when valid', () => {
      localStorage.setItem('cdp_preferences', JSON.stringify({ theme: 'dark' }))
      expect(loadThemePreference()).toBe('dark')
    })

    it('returns system for invalid theme value', () => {
      localStorage.setItem('cdp_preferences', JSON.stringify({ theme: 'invalid' }))
      expect(loadThemePreference()).toBe('system')
    })

    it('returns system for corrupted JSON', () => {
      localStorage.setItem('cdp_preferences', 'not-json')
      expect(loadThemePreference()).toBe('system')
    })

    it('returns system when localStorage throws', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Access denied')
      })
      expect(loadThemePreference()).toBe('system')
    })
  })

  describe('saveThemePreference', () => {
    it('saves theme preference to cdp_preferences key', () => {
      saveThemePreference('dark')
      const stored = JSON.parse(localStorage.getItem('cdp_preferences')!)
      expect(stored.theme).toBe('dark')
    })

    it('preserves other preferences when saving theme', () => {
      localStorage.setItem('cdp_preferences', JSON.stringify({ fontSize: 16 }))
      saveThemePreference('light')
      const stored = JSON.parse(localStorage.getItem('cdp_preferences')!)
      expect(stored.fontSize).toBe(16)
      expect(stored.theme).toBe('light')
    })

    it('does not throw when localStorage is unavailable', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceeded')
      })
      expect(() => saveThemePreference('dark')).not.toThrow()
    })
  })

  describe('applyTheme', () => {
    it('sets data-theme=light for light preference', () => {
      applyTheme('light')
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    })

    it('sets data-theme=dark for dark preference', () => {
      applyTheme('dark')
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })

    it('resolves system theme from matchMedia (light)', () => {
      mockMatchMedia(false)
      applyTheme('system')
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    })

    it('resolves system theme from matchMedia (dark)', () => {
      mockMatchMedia(true)
      applyTheme('system')
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })
  })
})


describe('font scale', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.style.removeProperty('--font-scale')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('loadFontScale', () => {
    it('returns default (1) when no preference is stored', () => {
      expect(loadFontScale()).toBe(FONT_SCALE_DEFAULT)
    })

    it('returns stored font scale when valid', () => {
      localStorage.setItem('cdp_preferences', JSON.stringify({ fontScale: 1.25 }))
      expect(loadFontScale()).toBe(1.25)
    })

    it('returns default for invalid font scale value', () => {
      localStorage.setItem('cdp_preferences', JSON.stringify({ fontScale: 2.0 }))
      expect(loadFontScale()).toBe(FONT_SCALE_DEFAULT)
    })

    it('returns default when localStorage throws', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Access denied')
      })
      expect(loadFontScale()).toBe(FONT_SCALE_DEFAULT)
    })
  })

  describe('saveFontScale', () => {
    it('saves font scale to cdp_preferences key', () => {
      saveFontScale(1.5)
      const stored = JSON.parse(localStorage.getItem('cdp_preferences')!)
      expect(stored.fontScale).toBe(1.5)
    })

    it('preserves other preferences when saving font scale', () => {
      localStorage.setItem('cdp_preferences', JSON.stringify({ theme: 'dark' }))
      saveFontScale(0.75)
      const stored = JSON.parse(localStorage.getItem('cdp_preferences')!)
      expect(stored.theme).toBe('dark')
      expect(stored.fontScale).toBe(0.75)
    })

    it('does not throw when localStorage is unavailable', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceeded')
      })
      expect(() => saveFontScale(1.25)).not.toThrow()
    })
  })

  describe('applyFontScale', () => {
    it('sets --font-scale custom property on <html>', () => {
      applyFontScale(1.25)
      expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1.25')
    })

    it('sets --font-scale to 0.75 for minimum scale', () => {
      applyFontScale(0.75)
      expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('0.75')
    })

    it('sets --font-scale to 1.5 for maximum scale', () => {
      applyFontScale(1.5)
      expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1.5')
    })
  })

  describe('FONT_SCALE_STEPS', () => {
    it('contains exactly 4 steps from 75% to 150%', () => {
      expect(FONT_SCALE_STEPS).toEqual([0.75, 1, 1.25, 1.5])
    })
  })
})
