import { describe, it, expect } from 'vitest'
import { parseHash } from './use-hash-route'

describe('parseHash', () => {
  it('parses #/start correctly', () => {
    expect(parseHash('#/start')).toBe('start')
  })

  it('parses #/playing correctly', () => {
    expect(parseHash('#/playing')).toBe('playing')
  })

  it('parses #/history correctly', () => {
    expect(parseHash('#/history')).toBe('history')
  })

  it('parses #/ending correctly', () => {
    expect(parseHash('#/ending')).toBe('ending')
  })

  it('parses #/debriefing correctly', () => {
    expect(parseHash('#/debriefing')).toBe('debriefing')
  })

  it('parses #/error correctly', () => {
    expect(parseHash('#/error')).toBe('error')
  })

  it('defaults to start for empty hash', () => {
    expect(parseHash('')).toBe('start')
  })

  it('defaults to start for bare #', () => {
    expect(parseHash('#')).toBe('start')
  })

  it('defaults to start for #/', () => {
    expect(parseHash('#/')).toBe('start')
  })

  it('defaults to start for invalid route', () => {
    expect(parseHash('#/unknown')).toBe('start')
  })

  it('defaults to start for route without leading slash', () => {
    expect(parseHash('#playing')).toBe('playing')
  })
})
