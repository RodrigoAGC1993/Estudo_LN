import { describe, it, expect } from 'vitest'
import { selectImmediateBeat, selectDeferredBeat } from './beat-selector'
import type { InterpersonalBeat, StateMap } from '@domain/types'

describe('beat-selector', () => {
  // === Test fixtures ===

  const baseStates: StateMap = {
    tempo_atrasado: 1,
    voltaren_comunicado: false,
    processo_heparina_seguro: false,
    vigilancia_ativa: 0,
    confianca_equipe: 0,
    acao_critica_a_tempo: null,
  }

  const immediateBeatNegative: InterpersonalBeat = {
    id: 'beat-cena1-neg',
    sourceNodeId: 'cena-1-ecg-quente',
    band: 'negative',
    bandCondition: { op: 'lte', state: 'confianca_equipe', value: -1 },
    timing: 'immediate',
    prose: 'A enfermeira se afasta sem olhar para você.',
  }

  const immediateBeatNeutral: InterpersonalBeat = {
    id: 'beat-cena1-neutro',
    sourceNodeId: 'cena-1-ecg-quente',
    band: 'neutral',
    bandCondition: { op: 'eq', state: 'confianca_equipe', value: 0 },
    timing: 'immediate',
    prose: 'A enfermeira assente brevemente.',
  }

  const immediateBeatPositive: InterpersonalBeat = {
    id: 'beat-cena1-pos',
    sourceNodeId: 'cena-1-ecg-quente',
    band: 'positive',
    bandCondition: { op: 'gte', state: 'confianca_equipe', value: 1 },
    timing: 'immediate',
    prose: 'A enfermeira sorri e se aproxima.',
  }

  const immediateBeatWithChoiceRestriction: InterpersonalBeat = {
    id: 'beat-cena1-neg-specific',
    sourceNodeId: 'cena-1-ecg-quente',
    sourceChoiceIds: ['1a-interromper-medico'],
    band: 'negative',
    bandCondition: { op: 'lte', state: 'confianca_equipe', value: -1 },
    timing: 'immediate',
    prose: 'O médico franze a testa com a interrupção.',
  }

  const deferredBeat: InterpersonalBeat = {
    id: 'beat-cena1-deferred',
    sourceNodeId: 'cena-1-ecg-quente',
    band: 'negative',
    bandCondition: { op: 'lte', state: 'confianca_equipe', value: -1 },
    timing: 'deferred',
    prose: 'A tensão da cena anterior ainda paira no ar.',
    deferredActivationCondition: { op: 'gte', state: 'tempo_atrasado', value: 1 },
    eligibleNodeId: 'cena-2-inicio',
  }

  const deferredBeatWithChoiceRestriction: InterpersonalBeat = {
    id: 'beat-cena1-deferred-specific',
    sourceNodeId: 'cena-1-ecg-quente',
    sourceChoiceIds: ['1c-guardar-prontuario'],
    band: 'negative',
    bandCondition: { op: 'lte', state: 'confianca_equipe', value: -1 },
    timing: 'deferred',
    prose: 'A equipe lembra que você guardou o ECG sem avisar.',
    deferredActivationCondition: { op: 'eq', state: 'voltaren_comunicado', value: false },
    eligibleNodeId: 'cena-3-inicio',
  }

  const allBeats: InterpersonalBeat[] = [
    immediateBeatNegative,
    immediateBeatNeutral,
    immediateBeatPositive,
    immediateBeatWithChoiceRestriction,
    deferredBeat,
    deferredBeatWithChoiceRestriction,
  ]

  // === Immediate Beat Selection Tests ===

  describe('selectImmediateBeat', () => {
    describe('band selection', () => {
      it('selects negative band beat when confianca_equipe <= -1', () => {
        const states: StateMap = { ...baseStates, confianca_equipe: -1 }
        const result = selectImmediateBeat(allBeats, 'cena-1-ecg-quente', '1b-levar-enfermeira', states)
        expect(result).not.toBeNull()
        expect(result!.id).toBe('beat-cena1-neg')
        expect(result!.band).toBe('negative')
      })

      it('selects negative band beat when confianca_equipe = -2', () => {
        const states: StateMap = { ...baseStates, confianca_equipe: -2 }
        const result = selectImmediateBeat(allBeats, 'cena-1-ecg-quente', '1b-levar-enfermeira', states)
        expect(result).not.toBeNull()
        expect(result!.band).toBe('negative')
      })

      it('selects neutral band beat when confianca_equipe = 0', () => {
        const states: StateMap = { ...baseStates, confianca_equipe: 0 }
        const result = selectImmediateBeat(allBeats, 'cena-1-ecg-quente', '1b-levar-enfermeira', states)
        expect(result).not.toBeNull()
        expect(result!.id).toBe('beat-cena1-neutro')
        expect(result!.band).toBe('neutral')
      })

      it('selects positive band beat when confianca_equipe >= 1', () => {
        const states: StateMap = { ...baseStates, confianca_equipe: 1 }
        const result = selectImmediateBeat(allBeats, 'cena-1-ecg-quente', '1b-levar-enfermeira', states)
        expect(result).not.toBeNull()
        expect(result!.id).toBe('beat-cena1-pos')
        expect(result!.band).toBe('positive')
      })

      it('selects positive band beat when confianca_equipe = 2', () => {
        const states: StateMap = { ...baseStates, confianca_equipe: 2 }
        const result = selectImmediateBeat(allBeats, 'cena-1-ecg-quente', '1b-levar-enfermeira', states)
        expect(result).not.toBeNull()
        expect(result!.band).toBe('positive')
      })
    })

    describe('sourceNodeId filtering', () => {
      it('returns null when no beat matches the sourceNodeId', () => {
        const states: StateMap = { ...baseStates, confianca_equipe: 0 }
        const result = selectImmediateBeat(allBeats, 'cena-2-inicio', '1b-levar-enfermeira', states)
        expect(result).toBeNull()
      })
    })

    describe('sourceChoiceIds filtering', () => {
      it('selects beat restricted to specific choice when that choice is confirmed', () => {
        const states: StateMap = { ...baseStates, confianca_equipe: -1 }
        // Create beats where the choice-restricted one comes first
        const beatsWithSpecificFirst: InterpersonalBeat[] = [
          immediateBeatWithChoiceRestriction,
          immediateBeatNegative,
        ]
        const result = selectImmediateBeat(beatsWithSpecificFirst, 'cena-1-ecg-quente', '1a-interromper-medico', states)
        expect(result).not.toBeNull()
        expect(result!.id).toBe('beat-cena1-neg-specific')
      })

      it('skips beat restricted to specific choice when different choice is confirmed', () => {
        const states: StateMap = { ...baseStates, confianca_equipe: -1 }
        const beatsWithSpecificFirst: InterpersonalBeat[] = [
          immediateBeatWithChoiceRestriction,
          immediateBeatNegative,
        ]
        const result = selectImmediateBeat(beatsWithSpecificFirst, 'cena-1-ecg-quente', '1b-levar-enfermeira', states)
        expect(result).not.toBeNull()
        expect(result!.id).toBe('beat-cena1-neg')
      })
    })

    describe('bandCondition evaluation', () => {
      it('returns null when bandCondition is not satisfied', () => {
        // Create a beat with a bandCondition that won't match
        const strictBeat: InterpersonalBeat = {
          id: 'beat-strict',
          sourceNodeId: 'cena-1-ecg-quente',
          band: 'neutral',
          bandCondition: {
            op: 'and',
            conditions: [
              { op: 'eq', state: 'confianca_equipe', value: 0 },
              { op: 'eq', state: 'voltaren_comunicado', value: true },  // won't be satisfied
            ],
          },
          timing: 'immediate',
          prose: 'Unreachable beat.',
        }
        const states: StateMap = { ...baseStates, confianca_equipe: 0, voltaren_comunicado: false }
        const result = selectImmediateBeat([strictBeat], 'cena-1-ecg-quente', '1b-levar-enfermeira', states)
        expect(result).toBeNull()
      })
    })

    describe('returns at most one beat', () => {
      it('returns the first matching beat when multiple could match', () => {
        const beat1: InterpersonalBeat = {
          ...immediateBeatNeutral,
          id: 'beat-first',
        }
        const beat2: InterpersonalBeat = {
          ...immediateBeatNeutral,
          id: 'beat-second',
        }
        const states: StateMap = { ...baseStates, confianca_equipe: 0 }
        const result = selectImmediateBeat([beat1, beat2], 'cena-1-ecg-quente', '1b-levar-enfermeira', states)
        expect(result).not.toBeNull()
        expect(result!.id).toBe('beat-first')
      })
    })

    describe('ignores deferred beats', () => {
      it('does not select deferred beats even if all other criteria match', () => {
        const states: StateMap = { ...baseStates, confianca_equipe: -1 }
        const result = selectImmediateBeat([deferredBeat], 'cena-1-ecg-quente', '1b-levar-enfermeira', states)
        expect(result).toBeNull()
      })
    })

    describe('empty beats array', () => {
      it('returns null when beats array is empty', () => {
        const result = selectImmediateBeat([], 'cena-1-ecg-quente', '1b-levar-enfermeira', baseStates)
        expect(result).toBeNull()
      })
    })
  })

  // === Deferred Beat Selection Tests ===

  describe('selectDeferredBeat', () => {
    const confirmedChoices = [
      { nodeId: 'cena-1-ecg-quente', choiceId: '1a-interromper-medico', sequence: 1 },
    ]

    describe('basic deferred beat activation', () => {
      it('selects deferred beat when all conditions are met', () => {
        const states: StateMap = { ...baseStates, confianca_equipe: -1, tempo_atrasado: 1 }
        const result = selectDeferredBeat(
          allBeats,
          'cena-2-inicio',
          confirmedChoices,
          ['cena-1-ecg-quente'],  // visited nodes (not including destination yet)
          states,
        )
        expect(result).not.toBeNull()
        expect(result!.id).toBe('beat-cena1-deferred')
      })
    })

    describe('eligibleNodeId matching', () => {
      it('returns null when destination does not match eligibleNodeId', () => {
        const states: StateMap = { ...baseStates, confianca_equipe: -1, tempo_atrasado: 1 }
        const result = selectDeferredBeat(
          allBeats,
          'cena-3-inicio',  // Not the eligible node for the first deferred beat
          confirmedChoices,
          ['cena-1-ecg-quente'],
          states,
        )
        // The second deferred beat targets cena-3-inicio but requires choice '1c-guardar-prontuario'
        expect(result).toBeNull()
      })
    })

    describe('origin confirmation check', () => {
      it('returns null when the origin node was never confirmed', () => {
        const states: StateMap = { ...baseStates, confianca_equipe: -1, tempo_atrasado: 1 }
        const result = selectDeferredBeat(
          allBeats,
          'cena-2-inicio',
          [],  // No confirmed choices
          [],
          states,
        )
        expect(result).toBeNull()
      })
    })

    describe('sourceChoiceIds verification', () => {
      it('selects beat when specific choice was confirmed', () => {
        const states: StateMap = { ...baseStates, confianca_equipe: -1, voltaren_comunicado: false }
        const choices = [
          { nodeId: 'cena-1-ecg-quente', choiceId: '1c-guardar-prontuario', sequence: 1 },
        ]
        const result = selectDeferredBeat(
          [deferredBeatWithChoiceRestriction],
          'cena-3-inicio',
          choices,
          ['cena-1-ecg-quente'],
          states,
        )
        expect(result).not.toBeNull()
        expect(result!.id).toBe('beat-cena1-deferred-specific')
      })

      it('returns null when a different choice was confirmed at the source node', () => {
        const states: StateMap = { ...baseStates, confianca_equipe: -1, voltaren_comunicado: false }
        const choices = [
          { nodeId: 'cena-1-ecg-quente', choiceId: '1a-interromper-medico', sequence: 1 },
        ]
        const result = selectDeferredBeat(
          [deferredBeatWithChoiceRestriction],
          'cena-3-inicio',
          choices,
          ['cena-1-ecg-quente'],
          states,
        )
        expect(result).toBeNull()
      })
    })

    describe('consumption tracking (visitedNodes)', () => {
      it('returns null when eligibleNodeId was already visited (beat consumed)', () => {
        const states: StateMap = { ...baseStates, confianca_equipe: -1, tempo_atrasado: 1 }
        const result = selectDeferredBeat(
          allBeats,
          'cena-2-inicio',
          confirmedChoices,
          ['cena-1-ecg-quente', 'cena-2-inicio'],  // eligibleNodeId already in visitedNodes
          states,
        )
        expect(result).toBeNull()
      })
    })

    describe('deferredActivationCondition evaluation', () => {
      it('returns null when deferredActivationCondition is not satisfied', () => {
        const states: StateMap = { ...baseStates, confianca_equipe: -1, tempo_atrasado: 0 }
        // deferredBeat requires tempo_atrasado >= 1
        const result = selectDeferredBeat(
          [deferredBeat],
          'cena-2-inicio',
          confirmedChoices,
          ['cena-1-ecg-quente'],
          states,
        )
        expect(result).toBeNull()
      })
    })

    describe('bandCondition evaluation', () => {
      it('returns null when bandCondition is not satisfied', () => {
        // deferredBeat bandCondition requires confianca_equipe <= -1
        const states: StateMap = { ...baseStates, confianca_equipe: 0, tempo_atrasado: 1 }
        const result = selectDeferredBeat(
          [deferredBeat],
          'cena-2-inicio',
          confirmedChoices,
          ['cena-1-ecg-quente'],
          states,
        )
        expect(result).toBeNull()
      })
    })

    describe('returns at most one beat', () => {
      it('returns the first matching deferred beat', () => {
        const beat1: InterpersonalBeat = {
          ...deferredBeat,
          id: 'deferred-first',
        }
        const beat2: InterpersonalBeat = {
          ...deferredBeat,
          id: 'deferred-second',
        }
        const states: StateMap = { ...baseStates, confianca_equipe: -1, tempo_atrasado: 1 }
        const result = selectDeferredBeat(
          [beat1, beat2],
          'cena-2-inicio',
          confirmedChoices,
          ['cena-1-ecg-quente'],
          states,
        )
        expect(result).not.toBeNull()
        expect(result!.id).toBe('deferred-first')
      })
    })

    describe('ignores immediate beats', () => {
      it('does not select immediate beats', () => {
        const states: StateMap = { ...baseStates, confianca_equipe: -1 }
        const result = selectDeferredBeat(
          [immediateBeatNegative],
          'cena-1-ecg-quente',
          confirmedChoices,
          [],
          states,
        )
        expect(result).toBeNull()
      })
    })

    describe('empty beats array', () => {
      it('returns null when beats array is empty', () => {
        const result = selectDeferredBeat(
          [],
          'cena-2-inicio',
          confirmedChoices,
          ['cena-1-ecg-quente'],
          baseStates,
        )
        expect(result).toBeNull()
      })
    })

    describe('deferred beat without deferredActivationCondition', () => {
      it('selects beat when no deferredActivationCondition is specified', () => {
        const beatNoCondition: InterpersonalBeat = {
          id: 'beat-no-deferred-cond',
          sourceNodeId: 'cena-1-ecg-quente',
          band: 'negative',
          bandCondition: { op: 'lte', state: 'confianca_equipe', value: -1 },
          timing: 'deferred',
          prose: 'A equipe percebe a mudança no ambiente.',
          eligibleNodeId: 'cena-2-inicio',
        }
        const states: StateMap = { ...baseStates, confianca_equipe: -1 }
        const result = selectDeferredBeat(
          [beatNoCondition],
          'cena-2-inicio',
          confirmedChoices,
          ['cena-1-ecg-quente'],
          states,
        )
        expect(result).not.toBeNull()
        expect(result!.id).toBe('beat-no-deferred-cond')
      })
    })
  })
})
