import { describe, it, expect } from 'vitest'
import { resolveOutcome } from './outcome-resolver'
import type { StateMap, EndingDefinition } from '@domain/types'
import { ContentRuntimeError } from '@domain/index'

// === Fixtures — 4 endings do Caso 01 (Design §5.6) ===

const endings: EndingDefinition[] = [
  {
    id: 'ending-tragico',
    name: 'tragico',
    evaluationOrder: 1,
    condition: {
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
    },
    prose: 'O monitor silencia...',
  },
  {
    id: 'ending-grave',
    name: 'grave',
    evaluationOrder: 2,
    condition: {
      op: 'and',
      conditions: [
        { op: 'eq', state: 'acao_critica_a_tempo', value: false },
        {
          op: 'not',
          condition: {
            op: 'and',
            conditions: [
              { op: 'eq', state: 'vigilancia_ativa', value: 0 },
              {
                op: 'or',
                conditions: [
                  { op: 'gte', state: 'tempo_atrasado', value: 2 },
                  { op: 'eq', state: 'processo_heparina_seguro', value: false },
                ],
              },
            ],
          },
        },
      ],
    },
    prose: 'UTI prolongada...',
  },
  {
    id: 'ending-excelente',
    name: 'excelente',
    evaluationOrder: 3,
    condition: {
      op: 'and',
      conditions: [
        { op: 'eq', state: 'acao_critica_a_tempo', value: true },
        { op: 'lte', state: 'tempo_atrasado', value: 1 },
        { op: 'eq', state: 'processo_heparina_seguro', value: true },
        { op: 'eq', state: 'voltaren_comunicado', value: true },
      ],
    },
    prose: 'Meses depois, uma buzina...',
  },
  {
    id: 'ending-bom',
    name: 'bom',
    evaluationOrder: 4,
    condition: {
      op: 'and',
      conditions: [
        { op: 'eq', state: 'acao_critica_a_tempo', value: true },
        {
          op: 'not',
          condition: {
            op: 'and',
            conditions: [
              { op: 'lte', state: 'tempo_atrasado', value: 1 },
              { op: 'eq', state: 'processo_heparina_seguro', value: true },
              { op: 'eq', state: 'voltaren_comunicado', value: true },
            ],
          },
        },
      ],
    },
    prose: 'Sobrevive. Quase-evento...',
  },
]

describe('outcome-resolver', () => {
  describe('normal resolution', () => {
    it('resolves to "tragico" when acao_critica false, vigilancia 0, tempo >= 2', () => {
      const states: StateMap = {
        acao_critica_a_tempo: false,
        vigilancia_ativa: 0,
        tempo_atrasado: 3,
        processo_heparina_seguro: true,
        voltaren_comunicado: false,
        confianca_equipe: 0,
      }

      const result = resolveOutcome(states, endings)
      expect(result.name).toBe('tragico')
      expect(result.id).toBe('ending-tragico')
    })

    it('resolves to "grave" when acao_critica false but not meeting tragico conditions', () => {
      const states: StateMap = {
        acao_critica_a_tempo: false,
        vigilancia_ativa: 1,
        tempo_atrasado: 1,
        processo_heparina_seguro: true,
        voltaren_comunicado: true,
        confianca_equipe: 1,
      }

      const result = resolveOutcome(states, endings)
      expect(result.name).toBe('grave')
      expect(result.id).toBe('ending-grave')
    })

    it('resolves to "excelente" when all positive conditions met', () => {
      const states: StateMap = {
        acao_critica_a_tempo: true,
        vigilancia_ativa: 2,
        tempo_atrasado: 0,
        processo_heparina_seguro: true,
        voltaren_comunicado: true,
        confianca_equipe: 2,
      }

      const result = resolveOutcome(states, endings)
      expect(result.name).toBe('excelente')
      expect(result.id).toBe('ending-excelente')
    })

    it('resolves to "bom" when acao_critica true but not all excelente conditions met', () => {
      const states: StateMap = {
        acao_critica_a_tempo: true,
        vigilancia_ativa: 1,
        tempo_atrasado: 2,
        processo_heparina_seguro: false,
        voltaren_comunicado: false,
        confianca_equipe: 0,
      }

      const result = resolveOutcome(states, endings)
      expect(result.name).toBe('bom')
      expect(result.id).toBe('ending-bom')
    })
  })

  describe('precedence order', () => {
    it('evaluates tragico before grave when both could match', () => {
      // States that satisfy both tragico and grave: acao_critica=false, vigilancia=0, heparina=false
      const states: StateMap = {
        acao_critica_a_tempo: false,
        vigilancia_ativa: 0,
        tempo_atrasado: 2,
        processo_heparina_seguro: false,
        voltaren_comunicado: false,
        confianca_equipe: -2,
      }

      const result = resolveOutcome(states, endings)
      expect(result.name).toBe('tragico')
    })

    it('respects evaluationOrder regardless of array insertion order', () => {
      // Provide endings in reverse order to verify sort behavior
      const reversedEndings = [...endings].reverse()
      const states: StateMap = {
        acao_critica_a_tempo: true,
        vigilancia_ativa: 2,
        tempo_atrasado: 0,
        processo_heparina_seguro: true,
        voltaren_comunicado: true,
        confianca_equipe: 2,
      }

      const result = resolveOutcome(states, reversedEndings)
      expect(result.name).toBe('excelente')
    })

    it('evaluates excelente (order 3) before bom (order 4)', () => {
      // States that satisfy excelente — should pick excelente, not bom
      const states: StateMap = {
        acao_critica_a_tempo: true,
        vigilancia_ativa: 2,
        tempo_atrasado: 1,
        processo_heparina_seguro: true,
        voltaren_comunicado: true,
        confianca_equipe: 1,
      }

      const result = resolveOutcome(states, endings)
      expect(result.name).toBe('excelente')
    })
  })

  describe('error: acao_critica_a_tempo null', () => {
    it('throws ContentRuntimeError when acao_critica_a_tempo is null', () => {
      const states: StateMap = {
        acao_critica_a_tempo: null,
        vigilancia_ativa: 1,
        tempo_atrasado: 1,
        processo_heparina_seguro: true,
        voltaren_comunicado: true,
        confianca_equipe: 0,
      }

      expect(() => resolveOutcome(states, endings)).toThrow(ContentRuntimeError)
      expect(() => resolveOutcome(states, endings)).toThrow(
        "Estado crítico 'acao_critica_a_tempo' indefinido",
      )
    })

    it('throws ContentRuntimeError when acao_critica_a_tempo is undefined (not in states)', () => {
      const states: StateMap = {
        vigilancia_ativa: 1,
        tempo_atrasado: 1,
        processo_heparina_seguro: true,
        voltaren_comunicado: true,
        confianca_equipe: 0,
      }

      expect(() => resolveOutcome(states, endings)).toThrow(ContentRuntimeError)
    })

    it('includes error code CRITICAL_STATE_NULL', () => {
      const states: StateMap = {
        acao_critica_a_tempo: null,
        vigilancia_ativa: 0,
        tempo_atrasado: 0,
        processo_heparina_seguro: false,
        voltaren_comunicado: false,
        confianca_equipe: 0,
      }

      try {
        resolveOutcome(states, endings)
        expect.fail('should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(ContentRuntimeError)
        expect((e as ContentRuntimeError).code).toBe('CRITICAL_STATE_NULL')
      }
    })
  })

  describe('error: no match', () => {
    it('throws ContentRuntimeError when no ending conditions are satisfied', () => {
      // Use an empty endings array to guarantee no match
      const states: StateMap = {
        acao_critica_a_tempo: true,
        vigilancia_ativa: 1,
        tempo_atrasado: 0,
        processo_heparina_seguro: true,
        voltaren_comunicado: true,
        confianca_equipe: 0,
      }

      expect(() => resolveOutcome(states, [])).toThrow(ContentRuntimeError)
      expect(() => resolveOutcome(states, [])).toThrow(
        'Nenhuma regra de desfecho satisfeita',
      )
    })

    it('throws with error code NO_ENDING_MATCHED when conditions are unsatisfiable', () => {
      // Craft endings with impossible conditions
      const impossibleEndings: EndingDefinition[] = [
        {
          id: 'impossible',
          name: 'tragico',
          evaluationOrder: 1,
          condition: {
            op: 'and',
            conditions: [
              { op: 'eq', state: 'acao_critica_a_tempo', value: true },
              { op: 'eq', state: 'acao_critica_a_tempo', value: false },
            ],
          },
          prose: 'never matches',
        },
      ]

      const states: StateMap = {
        acao_critica_a_tempo: true,
        vigilancia_ativa: 1,
        tempo_atrasado: 0,
        processo_heparina_seguro: true,
        voltaren_comunicado: true,
        confianca_equipe: 0,
      }

      try {
        resolveOutcome(states, impossibleEndings)
        expect.fail('should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(ContentRuntimeError)
        expect((e as ContentRuntimeError).code).toBe('NO_ENDING_MATCHED')
      }
    })
  })
})
