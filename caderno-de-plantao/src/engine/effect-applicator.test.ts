import { describe, it, expect } from 'vitest'
import { applyEffects } from './effect-applicator'
import type { StateMap, StateEffect, StateDefinition } from '@domain/index'
import { ContentRuntimeError } from '@domain/index'

// === Fixtures ===

const stateDefinitions: StateDefinition[] = [
  { name: 'tempo_atrasado', type: 'integer', initialValue: 0, minimum: 0, maximum: 3 },
  { name: 'voltaren_comunicado', type: 'boolean', initialValue: false },
  { name: 'processo_heparina_seguro', type: 'boolean', initialValue: false },
  { name: 'vigilancia_ativa', type: 'integer', initialValue: 0, minimum: 0, maximum: 2 },
  { name: 'confianca_equipe', type: 'integer', initialValue: 0, minimum: -2, maximum: 2 },
  { name: 'acao_critica_a_tempo', type: 'nullable_boolean', initialValue: null },
  { name: 'status', type: 'enum', initialValue: 'idle', enumValues: ['idle', 'active', 'done'] },
]

const baseStates: StateMap = {
  tempo_atrasado: 0,
  voltaren_comunicado: false,
  processo_heparina_seguro: false,
  vigilancia_ativa: 0,
  confianca_equipe: 0,
  acao_critica_a_tempo: null,
  status: 'idle',
}

describe('applyEffects', () => {
  describe('copy-on-write', () => {
    it('returns a new object, never mutates the input', () => {
      const effects: StateEffect[] = [
        { target: 'tempo_atrasado', operation: 'increment', amount: 1 },
      ]
      const original = { ...baseStates }
      const result = applyEffects(original, effects, stateDefinitions)

      expect(result).not.toBe(original)
      expect(original.tempo_atrasado).toBe(0) // not mutated
      expect(result.tempo_atrasado).toBe(1)
    })

    it('returns a copy even when effects list is empty', () => {
      const result = applyEffects(baseStates, [], stateDefinitions)
      expect(result).not.toBe(baseStates)
      expect(result).toEqual(baseStates)
    })
  })

  describe('set operation', () => {
    it('sets integer value within bounds', () => {
      const effects: StateEffect[] = [
        { target: 'tempo_atrasado', operation: 'set', value: 2 },
      ]
      const result = applyEffects(baseStates, effects, stateDefinitions)
      expect(result.tempo_atrasado).toBe(2)
    })

    it('sets boolean value', () => {
      const effects: StateEffect[] = [
        { target: 'voltaren_comunicado', operation: 'set', value: true },
      ]
      const result = applyEffects(baseStates, effects, stateDefinitions)
      expect(result.voltaren_comunicado).toBe(true)
    })

    it('sets nullable_boolean to true', () => {
      const effects: StateEffect[] = [
        { target: 'acao_critica_a_tempo', operation: 'set', value: true },
      ]
      const result = applyEffects(baseStates, effects, stateDefinitions)
      expect(result.acao_critica_a_tempo).toBe(true)
    })

    it('sets nullable_boolean to null', () => {
      const states = { ...baseStates, acao_critica_a_tempo: true }
      const effects: StateEffect[] = [
        { target: 'acao_critica_a_tempo', operation: 'set', value: null },
      ]
      const result = applyEffects(states, effects, stateDefinitions)
      expect(result.acao_critica_a_tempo).toBeNull()
    })

    it('sets enum value to valid option', () => {
      const effects: StateEffect[] = [
        { target: 'status', operation: 'set', value: 'active' },
      ]
      const result = applyEffects(baseStates, effects, stateDefinitions)
      expect(result.status).toBe('active')
    })

    it('throws on set integer out of bounds (above maximum)', () => {
      const effects: StateEffect[] = [
        { target: 'tempo_atrasado', operation: 'set', value: 5 },
      ]
      expect(() => applyEffects(baseStates, effects, stateDefinitions)).toThrow(ContentRuntimeError)
    })

    it('throws on set integer out of bounds (below minimum)', () => {
      const effects: StateEffect[] = [
        { target: 'confianca_equipe', operation: 'set', value: -5 },
      ]
      expect(() => applyEffects(baseStates, effects, stateDefinitions)).toThrow(ContentRuntimeError)
    })

    it('throws on type mismatch: numeric set on boolean', () => {
      const effects: StateEffect[] = [
        { target: 'voltaren_comunicado', operation: 'set', value: 42 },
      ]
      expect(() => applyEffects(baseStates, effects, stateDefinitions)).toThrow(ContentRuntimeError)
    })

    it('throws on type mismatch: string set on integer', () => {
      const effects: StateEffect[] = [
        { target: 'tempo_atrasado', operation: 'set', value: 'hello' },
      ]
      expect(() => applyEffects(baseStates, effects, stateDefinitions)).toThrow(ContentRuntimeError)
    })

    it('throws on invalid enum value', () => {
      const effects: StateEffect[] = [
        { target: 'status', operation: 'set', value: 'invalid_value' },
      ]
      expect(() => applyEffects(baseStates, effects, stateDefinitions)).toThrow(ContentRuntimeError)
    })

    it('throws on numeric set on enum', () => {
      const effects: StateEffect[] = [
        { target: 'status', operation: 'set', value: 42 },
      ]
      expect(() => applyEffects(baseStates, effects, stateDefinitions)).toThrow(ContentRuntimeError)
    })
  })

  describe('increment operation', () => {
    it('increments integer within bounds', () => {
      const effects: StateEffect[] = [
        { target: 'tempo_atrasado', operation: 'increment', amount: 2 },
      ]
      const result = applyEffects(baseStates, effects, stateDefinitions)
      expect(result.tempo_atrasado).toBe(2)
    })

    it('throws on increment exceeding maximum', () => {
      const effects: StateEffect[] = [
        { target: 'tempo_atrasado', operation: 'increment', amount: 4 },
      ]
      expect(() => applyEffects(baseStates, effects, stateDefinitions)).toThrow(ContentRuntimeError)
    })

    it('throws on increment on boolean', () => {
      const effects: StateEffect[] = [
        { target: 'voltaren_comunicado', operation: 'increment', amount: 1 },
      ]
      expect(() => applyEffects(baseStates, effects, stateDefinitions)).toThrow(ContentRuntimeError)
    })

    it('throws on increment on enum', () => {
      const effects: StateEffect[] = [
        { target: 'status', operation: 'increment', amount: 1 },
      ]
      expect(() => applyEffects(baseStates, effects, stateDefinitions)).toThrow(ContentRuntimeError)
    })

    it('throws on increment on nullable_boolean', () => {
      const effects: StateEffect[] = [
        { target: 'acao_critica_a_tempo', operation: 'increment', amount: 1 },
      ]
      expect(() => applyEffects(baseStates, effects, stateDefinitions)).toThrow(ContentRuntimeError)
    })

    it('throws on amount = 0', () => {
      const effects: StateEffect[] = [
        { target: 'tempo_atrasado', operation: 'increment', amount: 0 },
      ]
      expect(() => applyEffects(baseStates, effects, stateDefinitions)).toThrow(ContentRuntimeError)
    })

    it('throws on negative amount', () => {
      const effects: StateEffect[] = [
        { target: 'tempo_atrasado', operation: 'increment', amount: -1 },
      ]
      expect(() => applyEffects(baseStates, effects, stateDefinitions)).toThrow(ContentRuntimeError)
    })

    it('throws on undefined amount', () => {
      const effects: StateEffect[] = [
        { target: 'tempo_atrasado', operation: 'increment' },
      ]
      expect(() => applyEffects(baseStates, effects, stateDefinitions)).toThrow(ContentRuntimeError)
    })
  })

  describe('decrement operation', () => {
    it('decrements integer within bounds', () => {
      const states = { ...baseStates, confianca_equipe: 2 }
      const effects: StateEffect[] = [
        { target: 'confianca_equipe', operation: 'decrement', amount: 1 },
      ]
      const result = applyEffects(states, effects, stateDefinitions)
      expect(result.confianca_equipe).toBe(1)
    })

    it('throws on decrement below minimum', () => {
      const effects: StateEffect[] = [
        { target: 'tempo_atrasado', operation: 'decrement', amount: 1 },
      ]
      expect(() => applyEffects(baseStates, effects, stateDefinitions)).toThrow(ContentRuntimeError)
    })

    it('throws on decrement on boolean', () => {
      const effects: StateEffect[] = [
        { target: 'voltaren_comunicado', operation: 'decrement', amount: 1 },
      ]
      expect(() => applyEffects(baseStates, effects, stateDefinitions)).toThrow(ContentRuntimeError)
    })

    it('throws on amount = 0', () => {
      const states = { ...baseStates, confianca_equipe: 1 }
      const effects: StateEffect[] = [
        { target: 'confianca_equipe', operation: 'decrement', amount: 0 },
      ]
      expect(() => applyEffects(states, effects, stateDefinitions)).toThrow(ContentRuntimeError)
    })

    it('throws on negative amount', () => {
      const states = { ...baseStates, confianca_equipe: 1 }
      const effects: StateEffect[] = [
        { target: 'confianca_equipe', operation: 'decrement', amount: -1 },
      ]
      expect(() => applyEffects(states, effects, stateDefinitions)).toThrow(ContentRuntimeError)
    })
  })

  describe('multiple effects', () => {
    it('applies effects sequentially', () => {
      const effects: StateEffect[] = [
        { target: 'tempo_atrasado', operation: 'increment', amount: 1 },
        { target: 'confianca_equipe', operation: 'decrement', amount: 1 },
        { target: 'voltaren_comunicado', operation: 'set', value: true },
      ]
      const result = applyEffects(baseStates, effects, stateDefinitions)
      expect(result.tempo_atrasado).toBe(1)
      expect(result.confianca_equipe).toBe(-1)
      expect(result.voltaren_comunicado).toBe(true)
    })

    it('applies cumulative increments', () => {
      const effects: StateEffect[] = [
        { target: 'tempo_atrasado', operation: 'increment', amount: 1 },
        { target: 'tempo_atrasado', operation: 'increment', amount: 1 },
      ]
      const result = applyEffects(baseStates, effects, stateDefinitions)
      expect(result.tempo_atrasado).toBe(2)
    })

    it('throws on cumulative overflow', () => {
      const effects: StateEffect[] = [
        { target: 'tempo_atrasado', operation: 'increment', amount: 2 },
        { target: 'tempo_atrasado', operation: 'increment', amount: 2 },
      ]
      expect(() => applyEffects(baseStates, effects, stateDefinitions)).toThrow(ContentRuntimeError)
    })
  })

  describe('undeclared state', () => {
    it('throws on effect targeting undeclared state', () => {
      const effects: StateEffect[] = [
        { target: 'estado_inexistente', operation: 'set', value: true },
      ]
      expect(() => applyEffects(baseStates, effects, stateDefinitions)).toThrow(ContentRuntimeError)
    })
  })

  describe('determinism', () => {
    it('produces the same result for the same inputs', () => {
      const effects: StateEffect[] = [
        { target: 'tempo_atrasado', operation: 'increment', amount: 1 },
        { target: 'confianca_equipe', operation: 'set', value: -2 },
        { target: 'voltaren_comunicado', operation: 'set', value: true },
      ]
      const result1 = applyEffects(baseStates, effects, stateDefinitions)
      const result2 = applyEffects(baseStates, effects, stateDefinitions)
      expect(result1).toEqual(result2)
    })
  })
})
