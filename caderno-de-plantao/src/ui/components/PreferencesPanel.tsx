/**
 * PreferencesPanel — Appearance dropdown with theme and font scale.
 *
 * Requirements: RC-3.1, RC-3.2, RC-3.3, RC-3.4, RC-3.5, RC-4.1, RC-4.2
 * Design §16, §19 (canonical header layout)
 *
 * Dropdown trigger shows: "Aparência: {current}" with ▾ indicator.
 * Three options: Automático / Claro / Escuro with descriptions.
 * Active item marked. Footer note about local persistence.
 * Escape closes, click-outside closes, immediate application.
 */

import { useState, useRef, useEffect, useCallback } from 'preact/hooks'
import { useGameStore } from '../store'
import type { ThemePreference } from '../theme'
import './PreferencesPanel.css'

const THEME_OPTIONS: Array<{
  value: ThemePreference
  label: string
  description: string
}> = [
  { value: 'system', label: 'Automático', description: 'Segue o tema do sistema operacional' },
  { value: 'light', label: 'Claro', description: 'Fundo claro, texto escuro' },
  { value: 'dark', label: 'Escuro', description: 'Fundo escuro, texto claro' },
]

export function PreferencesPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const theme = useGameStore((s) => s.theme)
  const setTheme = useGameStore((s) => s.setTheme)

  const close = useCallback(() => {
    setIsOpen(false)
    toggleRef.current?.focus()
  }, [])

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  // Escape key closes the panel
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, close])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        toggleRef.current &&
        !toggleRef.current.contains(e.target as Node)
      ) {
        close()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, close])

  const handleThemeChange = (newTheme: ThemePreference) => {
    setTheme(newTheme)
  }

  const currentLabel = THEME_OPTIONS.find((o) => o.value === theme)?.label ?? 'Automático'

  return (
    <div class="preferences-wrapper">
      <button
        ref={toggleRef}
        type="button"
        class="preferences-toggle-btn"
        aria-expanded={isOpen}
        aria-controls="preferences-panel"
        aria-label="Preferências"
        onClick={toggle}
      >
        <span class="preferences-toggle-btn__label">
          Aparência: {currentLabel}
        </span>
        <span class="preferences-toggle-btn__chevron" aria-hidden="true">▾</span>
      </button>

      <div
        ref={panelRef}
        id="preferences-panel"
        class="preferences-panel"
        data-open={isOpen}
        role="region"
        aria-label="Preferências de exibição"
      >
        <ul class="preferences-panel__options" role="listbox" aria-label="Tema de aparência">
          {THEME_OPTIONS.map((option) => {
            const isActive = theme === option.value
            return (
              <li
                key={option.value}
                class={`preferences-panel__option${isActive ? ' preferences-panel__option--active' : ''}`}
                role="option"
                aria-selected={isActive}
              >
                <button
                  type="button"
                  class="preferences-panel__option-btn"
                  onClick={() => handleThemeChange(option.value)}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <span class="preferences-panel__option-check" aria-hidden="true">
                    {isActive ? '✓' : ''}
                  </span>
                  <span class="preferences-panel__option-content">
                    <span class="preferences-panel__option-label">{option.label}</span>
                    <span class="preferences-panel__option-desc">{option.description}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <p class="preferences-panel__footer">
          A aparência não altera sua partida. Preferência salva localmente.
        </p>
      </div>
    </div>
  )
}
