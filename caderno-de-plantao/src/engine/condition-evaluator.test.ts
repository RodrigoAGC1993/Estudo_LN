import { describe, it, expect } from 'vitest'
import { evaluate } from './condition-evaluator'
import type { ConditionExpression, StateMap } from '@domain/types'

describe('condition-evaluator', () => {
  const states: StateMap = {
    tempo_atrasado: 2,
    voltaren_comunicado: true,
    processo_heparina_seguro: false,
    vigilancia_ativa: 1,
    confianca_equipe: -1,
    acao_critica_a_tempo: null,
  }

  describe('eq', () => {
    it('returns true when state equals value (number)', () => {
      const cond: ConditionExpression = { op: 'eq', state: 'tempo_atrasado', value: 2 }
      expect(evaluate(cond, states)).toBe(true)
    })

    it('returns false when state does not equal value', () => {
      const cond: ConditionExpression = { op: 'eq', state: 'tempo_atrasado', value: 3 }
      expect(evaluate(cond, states)).toBe(false)
    })

    it('returns true when state equals boolean value', () => {
      const cond: ConditionExpression = { op: 'eq', state: 'voltaren_comunicado', value: true }
      expect(evaluate(cond, states)).toBe(true)
    })

    it('returns true when state equals null', () => {
      const cond: ConditionExpression = { op: 'eq', state: 'acao_critica_a_tempo', value: null }
      expect(evaluate(cond, states)).toBe(true)
    })

    it('returns false when state is null but value is not', () => {
      const cond: ConditionExpression = { op: 'eq', state: 'acao_critica_a_tempo', value: false }
      expect(evaluate(cond, states)).toBe(false)
    })
  })

  describe('neq', () => {
    it('returns true when state differs from value', () => {
      const cond: ConditionExpression = { op: 'neq', state: 'tempo_atrasado', value: 0 }
      expect(evaluate(cond, states)).toBe(true)
    })

    it('returns false when state equals value', () => {
      const cond: ConditionExpression = { op: 'neq', state: 'tempo_atrasado', value: 2 }
      expect(evaluate(cond, states)).toBe(false)
    })
  })

  describe('gt', () => {
    it('returns true when state is greater', () => {
      const cond: ConditionExpression = { op: 'gt', state: 'tempo_atrasado', value: 1 }
      expect(evaluate(cond, states)).toBe(true)
    })

    it('returns false when state is equal', () => {
      const cond: ConditionExpression = { op: 'gt', state: 'tempo_atrasado', value: 2 }
      expect(evaluate(cond, states)).toBe(false)
    })

    it('returns false when state is less', () => {
      const cond: ConditionExpression = { op: 'gt', state: 'tempo_atrasado', value: 3 }
      expect(evaluate(cond, states)).toBe(false)
    })
  })

  describe('gte', () => {
    it('returns true when state is greater', () => {
      const cond: ConditionExpression = { op: 'gte', state: 'tempo_atrasado', value: 1 }
      expect(evaluate(cond, states)).toBe(true)
    })

    it('returns true when state is equal', () => {
      const cond: ConditionExpression = { op: 'gte', state: 'tempo_atrasado', value: 2 }
      expect(evaluate(cond, states)).toBe(true)
    })

    it('returns false when state is less', () => {
      const cond: ConditionExpression = { op: 'gte', state: 'tempo_atrasado', value: 3 }
      expect(evaluate(cond, states)).toBe(false)
    })
  })

  describe('lt', () => {
    it('returns true when state is less', () => {
      const cond: ConditionExpression = { op: 'lt', state: 'vigilancia_ativa', value: 2 }
      expect(evaluate(cond, states)).toBe(true)
    })

    it('returns false when state is equal', () => {
      const cond: ConditionExpression = { op: 'lt', state: 'vigilancia_ativa', value: 1 }
      expect(evaluate(cond, states)).toBe(false)
    })

    it('returns false when state is greater', () => {
      const cond: ConditionExpression = { op: 'lt', state: 'vigilancia_ativa', value: 0 }
      expect(evaluate(cond, states)).toBe(false)
    })
  })

  describe('lte', () => {
    it('returns true when state is less', () => {
      const cond: ConditionExpression = { op: 'lte', state: 'vigilancia_ativa', value: 2 }
      expect(evaluate(cond, states)).toBe(true)
    })

    it('returns true when state is equal', () => {
      const cond: ConditionExpression = { op: 'lte', state: 'vigilancia_ativa', value: 1 }
      expect(evaluate(cond, states)).toBe(true)
    })

    it('returns false when state is greater', () => {
      const cond: ConditionExpression = { op: 'lte', state: 'vigilancia_ativa', value: 0 }
      expect(evaluate(cond, states)).toBe(false)
    })
  })

  describe('isNull', () => {
    it('returns true when state is null', () => {
      const cond: ConditionExpression = { op: 'isNull', state: 'acao_critica_a_tempo' }
      expect(evaluate(cond, states)).toBe(true)
    })

    it('returns false when state is not null', () => {
      const cond: ConditionExpression = { op: 'isNull', state: 'voltaren_comunicado' }
      expect(evaluate(cond, states)).toBe(false)
    })
  })

  describe('isNotNull', () => {
    it('returns true when state is not null', () => {
      const cond: ConditionExpression = { op: 'isNotNull', state: 'voltaren_comunicado' }
      expect(evaluate(cond, states)).toBe(true)
    })

    it('returns false when state is null', () => {
      const cond: ConditionExpression = { op: 'isNotNull', state: 'acao_critica_a_tempo' }
      expect(evaluate(cond, states)).toBe(false)
    })
  })

  describe('and', () => {
    it('returns true when all conditions are true', () => {
      const cond: ConditionExpression = {
        op: 'and',
        conditions: [
          { op: 'eq', state: 'voltaren_comunicado', value: true },
          { op: 'gte', state: 'tempo_atrasado', value: 2 },
        ],
      }
      expect(evaluate(cond, states)).toBe(true)
    })

    it('returns false when any condition is false', () => {
      const cond: ConditionExpression = {
        op: 'and',
        conditions: [
          { op: 'eq', state: 'voltaren_comunicado', value: true },
          { op: 'eq', state: 'processo_heparina_seguro', value: true },
        ],
      }
      expect(evaluate(cond, states)).toBe(false)
    })

    it('returns true for empty conditions (vacuous truth)', () => {
      const cond: ConditionExpression = { op: 'and', conditions: [] }
      expect(evaluate(cond, states)).toBe(true)
    })
  })

  describe('or', () => {
    it('returns true when at least one condition is true', () => {
      const cond: ConditionExpression = {
        op: 'or',
        conditions: [
          { op: 'eq', state: 'processo_heparina_seguro', value: true },
          { op: 'eq', state: 'voltaren_comunicado', value: true },
        ],
      }
      expect(evaluate(cond, states)).toBe(true)
    })

    it('returns false when all conditions are false', () => {
      const cond: ConditionExpression = {
        op: 'or',
        conditions: [
          { op: 'eq', state: 'processo_heparina_seguro', value: true },
          { op: 'eq', state: 'tempo_atrasado', value: 0 },
        ],
      }
      expect(evaluate(cond, states)).toBe(false)
    })

    it('returns false for empty conditions', () => {
      const cond: ConditionExpression = { op: 'or', conditions: [] }
      expect(evaluate(cond, states)).toBe(false)
    })
  })

  describe('not', () => {
    it('negates a true condition', () => {
      const cond: ConditionExpression = {
        op: 'not',
        condition: { op: 'eq', state: 'voltaren_comunicado', value: true },
      }
      expect(evaluate(cond, states)).toBe(false)
    })

    it('negates a false condition', () => {
      const cond: ConditionExpression = {
        op: 'not',
        condition: { op: 'eq', state: 'processo_heparina_seguro', value: true },
      }
      expect(evaluate(cond, states)).toBe(true)
    })
  })

  describe('recursive composition', () => {
    it('evaluates the tragico ending condition from Case 01', () => {
      // From design §5.6: tragico requires acao_critica_a_tempo=false AND
      // vigilancia_ativa=0 AND (tempo_atrasado >= 2 OR processo_heparina_seguro=false)
      const tragicoCond: ConditionExpression = {
        op: 'and',
        conditions: [
          { op: 'eq', state: 'acao_critica_a_tempo', value: false },
          { op: 'eq', state: 'vigilancia_ativa', value: 0 },
          {
            op: 'or',
            conditions: [
              { op: 'gte', state: 'tempo_atrasado', value: 2 },
              { op: 'eq', state: 'processo_heparina_seguro', value: false },
            ],
          },
        ],
      }

      // With current states: acao_critica_a_tempo=null (not false), so should be false
      expect(evaluate(tragicoCond, states)).toBe(false)

      // With acao_critica_a_tempo=false, vigilancia_ativa=0, tempo_atrasado=2
      const tragicoStates: StateMap = {
        ...states,
        acao_critica_a_tempo: false,
        vigilancia_ativa: 0,
      }
      expect(evaluate(tragicoCond, tragicoStates)).toBe(true)
    })

    it('evaluates deeply nested not inside and inside or', () => {
      const cond: ConditionExpression = {
        op: 'or',
        conditions: [
          {
            op: 'and',
            conditions: [
              { op: 'not', condition: { op: 'isNull', state: 'voltaren_comunicado' } },
              { op: 'gt', state: 'tempo_atrasado', value: 1 },
            ],
          },
          { op: 'eq', state: 'processo_heparina_seguro', value: true },
        ],
      }
      // First branch: voltaren_comunicado is not null (true) AND tempo_atrasado > 1 (true) → true
      expect(evaluate(cond, states)).toBe(true)
    })

    it('handles triple nesting', () => {
      const cond: ConditionExpression = {
        op: 'not',
        condition: {
          op: 'and',
          conditions: [
            {
              op: 'or',
              conditions: [
                { op: 'eq', state: 'tempo_atrasado', value: 0 },
                { op: 'eq', state: 'tempo_atrasado', value: 1 },
              ],
            },
            { op: 'eq', state: 'voltaren_comunicado', value: true },
          ],
        },
      }
      // or: tempo_atrasado is 2, neither 0 nor 1 → false
      // and: false AND true → false
      // not: !false → true
      expect(evaluate(cond, states)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles undefined state key (returns undefined which is !== any value)', () => {
      const cond: ConditionExpression = { op: 'eq', state: 'nonexistent', value: null }
      // undefined !== null in strict equality
      expect(evaluate(cond, { tempo_atrasado: 0 })).toBe(false)
    })

    it('handles isNull on undefined state (undefined is not null)', () => {
      const cond: ConditionExpression = { op: 'isNull', state: 'nonexistent' }
      // undefined !== null → false (strict ===)
      expect(evaluate(cond, { tempo_atrasado: 0 })).toBe(false)
    })

    it('handles comparison operators with zero', () => {
      const s: StateMap = { count: 0 }
      expect(evaluate({ op: 'gte', state: 'count', value: 0 }, s)).toBe(true)
      expect(evaluate({ op: 'lte', state: 'count', value: 0 }, s)).toBe(true)
      expect(evaluate({ op: 'gt', state: 'count', value: 0 }, s)).toBe(false)
      expect(evaluate({ op: 'lt', state: 'count', value: 0 }, s)).toBe(false)
    })

    it('handles negative numbers in comparisons', () => {
      const s: StateMap = { confianca: -2 }
      expect(evaluate({ op: 'lt', state: 'confianca', value: 0 }, s)).toBe(true)
      expect(evaluate({ op: 'lte', state: 'confianca', value: -2 }, s)).toBe(true)
      expect(evaluate({ op: 'eq', state: 'confianca', value: -2 }, s)).toBe(true)
    })
  })
})
