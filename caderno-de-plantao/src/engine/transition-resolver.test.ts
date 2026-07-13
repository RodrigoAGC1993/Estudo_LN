import { describe, it, expect } from 'vitest'
import { resolveTransition } from './transition-resolver'
import type { TransitionDefinition, StateMap } from '@domain/types'

describe('transition-resolver', () => {
  const states: StateMap = {
    tempo_atrasado: 2,
    voltaren_comunicado: true,
    processo_heparina_seguro: false,
    vigilancia_ativa: 1,
    confianca_equipe: -1,
    acao_critica_a_tempo: null,
  }

  describe('direct transitions', () => {
    it('returns targetNodeId for a direct transition', () => {
      const transition: TransitionDefinition = {
        kind: 'direct',
        targetNodeId: 'cena-02',
      }
      expect(resolveTransition(transition, states)).toBe('cena-02')
    })

    it('returns targetNodeId regardless of state values', () => {
      const transition: TransitionDefinition = {
        kind: 'direct',
        targetNodeId: 'ending-tragico',
      }
      expect(resolveTransition(transition, {})).toBe('ending-tragico')
    })
  })

  describe('conditional transitions — single branch', () => {
    it('returns branch target when condition is true', () => {
      const transition: TransitionDefinition = {
        kind: 'conditional',
        branches: [
          {
            condition: { op: 'gte', state: 'tempo_atrasado', value: 2 },
            targetNodeId: 'cena-04-intenso',
            priority: 1,
          },
        ],
        fallbackNodeId: 'cena-04-normal',
      }
      expect(resolveTransition(transition, states)).toBe('cena-04-intenso')
    })

    it('returns fallbackNodeId when condition is false', () => {
      const transition: TransitionDefinition = {
        kind: 'conditional',
        branches: [
          {
            condition: { op: 'eq', state: 'tempo_atrasado', value: 0 },
            targetNodeId: 'cena-04-intenso',
            priority: 1,
          },
        ],
        fallbackNodeId: 'cena-04-normal',
      }
      expect(resolveTransition(transition, states)).toBe('cena-04-normal')
    })
  })

  describe('conditional transitions — multiple branches with priority', () => {
    it('evaluates branches in priority order and returns first match', () => {
      const transition: TransitionDefinition = {
        kind: 'conditional',
        branches: [
          {
            condition: { op: 'gte', state: 'tempo_atrasado', value: 2 },
            targetNodeId: 'rota-grave',
            priority: 2,
          },
          {
            condition: { op: 'gte', state: 'tempo_atrasado', value: 1 },
            targetNodeId: 'rota-moderada',
            priority: 1,
          },
        ],
        fallbackNodeId: 'rota-leve',
      }
      // Both branches are true (tempo_atrasado=2), but priority 1 is evaluated first
      expect(resolveTransition(transition, states)).toBe('rota-moderada')
    })

    it('skips branches with false conditions regardless of priority', () => {
      const transition: TransitionDefinition = {
        kind: 'conditional',
        branches: [
          {
            condition: { op: 'eq', state: 'processo_heparina_seguro', value: true },
            targetNodeId: 'rota-segura',
            priority: 1,
          },
          {
            condition: { op: 'gte', state: 'tempo_atrasado', value: 2 },
            targetNodeId: 'rota-atrasada',
            priority: 2,
          },
        ],
        fallbackNodeId: 'rota-padrao',
      }
      // Priority 1 is false (processo_heparina_seguro=false), priority 2 is true
      expect(resolveTransition(transition, states)).toBe('rota-atrasada')
    })

    it('handles branches defined in non-sorted order', () => {
      const transition: TransitionDefinition = {
        kind: 'conditional',
        branches: [
          {
            condition: { op: 'eq', state: 'voltaren_comunicado', value: true },
            targetNodeId: 'rota-c',
            priority: 3,
          },
          {
            condition: { op: 'eq', state: 'voltaren_comunicado', value: true },
            targetNodeId: 'rota-a',
            priority: 1,
          },
          {
            condition: { op: 'eq', state: 'voltaren_comunicado', value: true },
            targetNodeId: 'rota-b',
            priority: 2,
          },
        ],
        fallbackNodeId: 'rota-fallback',
      }
      // All true, but priority 1 wins
      expect(resolveTransition(transition, states)).toBe('rota-a')
    })
  })

  describe('fallback when no branch matches', () => {
    it('returns fallbackNodeId when all branch conditions are false', () => {
      const transition: TransitionDefinition = {
        kind: 'conditional',
        branches: [
          {
            condition: { op: 'eq', state: 'tempo_atrasado', value: 0 },
            targetNodeId: 'rota-zero',
            priority: 1,
          },
          {
            condition: { op: 'eq', state: 'processo_heparina_seguro', value: true },
            targetNodeId: 'rota-segura',
            priority: 2,
          },
          {
            condition: { op: 'isNull', state: 'voltaren_comunicado' },
            targetNodeId: 'rota-null',
            priority: 3,
          },
        ],
        fallbackNodeId: 'rota-fallback',
      }
      // All branches false with current states
      expect(resolveTransition(transition, states)).toBe('rota-fallback')
    })

    it('returns fallbackNodeId when branches array is empty', () => {
      const transition: TransitionDefinition = {
        kind: 'conditional',
        branches: [],
        fallbackNodeId: 'rota-padrao',
      }
      expect(resolveTransition(transition, states)).toBe('rota-padrao')
    })
  })

  describe('complex conditions in branches', () => {
    it('handles compound conditions (and/or) within branches', () => {
      const transition: TransitionDefinition = {
        kind: 'conditional',
        branches: [
          {
            condition: {
              op: 'and',
              conditions: [
                { op: 'gte', state: 'tempo_atrasado', value: 2 },
                { op: 'eq', state: 'processo_heparina_seguro', value: false },
              ],
            },
            targetNodeId: 'rota-critica',
            priority: 1,
          },
        ],
        fallbackNodeId: 'rota-normal',
      }
      // Both sub-conditions true → branch matches
      expect(resolveTransition(transition, states)).toBe('rota-critica')
    })

    it('uses nullable state in conditional branch', () => {
      const transition: TransitionDefinition = {
        kind: 'conditional',
        branches: [
          {
            condition: { op: 'isNull', state: 'acao_critica_a_tempo' },
            targetNodeId: 'cena-04-espera',
            priority: 1,
          },
          {
            condition: { op: 'eq', state: 'acao_critica_a_tempo', value: true },
            targetNodeId: 'cena-04-rapida',
            priority: 2,
          },
        ],
        fallbackNodeId: 'cena-04-tardia',
      }
      // acao_critica_a_tempo is null → first branch matches
      expect(resolveTransition(transition, states)).toBe('cena-04-espera')

      // With acao_critica_a_tempo = true
      const statesWithAction: StateMap = { ...states, acao_critica_a_tempo: true }
      expect(resolveTransition(transition, statesWithAction)).toBe('cena-04-rapida')

      // With acao_critica_a_tempo = false → no branch matches → fallback
      const statesLate: StateMap = { ...states, acao_critica_a_tempo: false }
      expect(resolveTransition(transition, statesLate)).toBe('cena-04-tardia')
    })
  })
})
