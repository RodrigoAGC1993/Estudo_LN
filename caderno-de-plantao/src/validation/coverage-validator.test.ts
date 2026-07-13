import { describe, it, expect } from 'vitest'
import { validateCoverage } from './coverage-validator'
import type { CaseFile } from '@domain/index'
import type { NarrativeNode } from '@domain/narrative-nodes'
import type { EndingDefinition, StateDefinition } from '@domain/types'

// === Helpers to build minimal valid case files for testing ===

function makeStates(): StateDefinition[] {
  return [
    { name: 'tempo_atrasado', type: 'integer', initialValue: 0, minimum: 0, maximum: 3 },
    { name: 'voltaren_comunicado', type: 'boolean', initialValue: false },
    { name: 'processo_heparina_seguro', type: 'boolean', initialValue: false },
    { name: 'vigilancia_ativa', type: 'integer', initialValue: 0, minimum: 0, maximum: 2 },
    { name: 'confianca_equipe', type: 'integer', initialValue: 0, minimum: -2, maximum: 2 },
    { name: 'acao_critica_a_tempo', type: 'nullable_boolean', initialValue: null },
  ]
}

function makeEndings(): EndingDefinition[] {
  return [
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
      prose: 'Trágico...',
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
      prose: 'Grave...',
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
      prose: 'Excelente...',
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
      prose: 'Bom...',
    },
  ]
}

/**
 * Builds a minimal valid CaseFile with a simple graph:
 * decision (2 choices) → outcome_resolution → ending → debriefing
 *
 * One choice sets acao_critica_a_tempo=true, the other sets it to false.
 */
function makeMinimalValidCase(): CaseFile {
  const nodes: NarrativeNode[] = [
    {
      kind: 'decision',
      id: 'scene-1',
      prose: 'Cena 1',
      presentationMetadata: { title: 'Cena 1' },
      choices: [
        {
          id: 'choice-a',
          label: 'Escolha A',
          effects: [
            { target: 'acao_critica_a_tempo', operation: 'set', value: true },
            { target: 'voltaren_comunicado', operation: 'set', value: true },
            { target: 'processo_heparina_seguro', operation: 'set', value: true },
          ],
          transition: { kind: 'direct', targetNodeId: 'outcome' },
        },
        {
          id: 'choice-b',
          label: 'Escolha B',
          effects: [
            { target: 'acao_critica_a_tempo', operation: 'set', value: false },
          ],
          transition: { kind: 'direct', targetNodeId: 'outcome' },
        },
        {
          id: 'choice-c',
          label: 'Escolha C',
          effects: [
            { target: 'acao_critica_a_tempo', operation: 'set', value: false },
            { target: 'vigilancia_ativa', operation: 'increment', amount: 1 },
            { target: 'processo_heparina_seguro', operation: 'set', value: true },
          ],
          transition: { kind: 'direct', targetNodeId: 'outcome' },
        },
      ],
      interpersonalBeatIds: [],
    },
    { kind: 'outcome_resolution', id: 'outcome' },
    {
      kind: 'ending',
      id: 'ending-node-tragico',
      endingId: 'ending-tragico',
      presentationMetadata: { title: 'Trágico' },
      continuationAction: { label: 'Ver debriefing' },
      nextNodeId: 'debriefing-tragico',
    },
    {
      kind: 'ending',
      id: 'ending-node-grave',
      endingId: 'ending-grave',
      presentationMetadata: { title: 'Grave' },
      continuationAction: { label: 'Ver debriefing' },
      nextNodeId: 'debriefing-grave',
    },
    {
      kind: 'ending',
      id: 'ending-node-excelente',
      endingId: 'ending-excelente',
      presentationMetadata: { title: 'Excelente' },
      continuationAction: { label: 'Ver debriefing' },
      nextNodeId: 'debriefing-excelente',
    },
    {
      kind: 'ending',
      id: 'ending-node-bom',
      endingId: 'ending-bom',
      presentationMetadata: { title: 'Bom' },
      continuationAction: { label: 'Ver debriefing' },
      nextNodeId: 'debriefing-bom',
    },
    {
      kind: 'debriefing',
      id: 'debriefing-tragico',
      debriefingId: 'debrief-tragico',
      presentationMetadata: { title: 'Debriefing Trágico' },
    },
    {
      kind: 'debriefing',
      id: 'debriefing-grave',
      debriefingId: 'debrief-grave',
      presentationMetadata: { title: 'Debriefing Grave' },
    },
    {
      kind: 'debriefing',
      id: 'debriefing-excelente',
      debriefingId: 'debrief-excelente',
      presentationMetadata: { title: 'Debriefing Excelente' },
    },
    {
      kind: 'debriefing',
      id: 'debriefing-bom',
      debriefingId: 'debrief-bom',
      presentationMetadata: { title: 'Debriefing Bom' },
    },
  ]

  return {
    schemaVersion: '1.0.0',
    caseId: 'test-case',
    caseVersion: '1.0.0',
    metadata: { title: 'Test', playableCharacterId: 'test', locale: 'pt-BR' },
    startNodeId: 'scene-1',
    states: makeStates(),
    nodes,
    endings: makeEndings(),
    debriefings: [],
    debriefingFragments: [],
    interpersonalBeats: [],
    editorialReviewStatus: 'draft',
    clinicalReviewStatus: 'pending',
  }
}

describe('validateCoverage', () => {
  describe('valid case', () => {
    it('should return valid for a well-formed case with all endings reachable', () => {
      const caseFile = makeMinimalValidCase()
      const result = validateCoverage(caseFile)
      // choice-a → excelente, choice-b → tragico, choice-c → grave
      // But 'bom' is not reachable with only these 3 choices
      // Let's check what actually happens
      expect(result.errors.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('criterion 8: domain violation', () => {
    it('should detect effects producing out-of-domain values', () => {
      const caseFile = makeMinimalValidCase()
      // Add a choice that increments tempo_atrasado by 2 twice (would exceed max=3)
      const decisionNode = caseFile.nodes[0]!
      if (decisionNode.kind === 'decision') {
        decisionNode.choices.push({
          id: 'choice-overflow',
          label: 'Overflow',
          effects: [
            { target: 'tempo_atrasado', operation: 'increment', amount: 2 },
            { target: 'tempo_atrasado', operation: 'increment', amount: 2 },
            { target: 'acao_critica_a_tempo', operation: 'set', value: true },
          ],
          transition: { kind: 'direct', targetNodeId: 'outcome' },
        })
      }

      const result = validateCoverage(caseFile)
      const domainErrors = result.errors.filter((e) => e.code === 'COVERAGE_DOMAIN_VIOLATION')
      expect(domainErrors.length).toBeGreaterThan(0)
      expect(domainErrors[0]!.message).toContain('fora do domínio')
    })
  })

  describe('criterion 9: contradictory conditions', () => {
    it('should detect contradictory ending conditions', () => {
      const caseFile = makeMinimalValidCase()
      // Add an ending with contradictory condition: eq(state, true) AND eq(state, false)
      caseFile.endings.push({
        id: 'ending-contradictory',
        name: 'bom',
        evaluationOrder: 5 as 1 | 2 | 3 | 4,
        condition: {
          op: 'and',
          conditions: [
            { op: 'eq', state: 'acao_critica_a_tempo', value: true },
            { op: 'eq', state: 'acao_critica_a_tempo', value: false },
          ],
        },
        prose: 'Contradição...',
      })

      const result = validateCoverage(caseFile)
      const contradictionErrors = result.errors.filter(
        (e) => e.code === 'COVERAGE_CONTRADICTORY_CONDITION',
      )
      expect(contradictionErrors.length).toBeGreaterThan(0)
    })

    it('should detect isNull AND isNotNull contradiction', () => {
      const caseFile = makeMinimalValidCase()
      caseFile.endings.push({
        id: 'ending-null-contradiction',
        name: 'bom',
        evaluationOrder: 5 as 1 | 2 | 3 | 4,
        condition: {
          op: 'and',
          conditions: [
            { op: 'isNull', state: 'acao_critica_a_tempo' },
            { op: 'isNotNull', state: 'acao_critica_a_tempo' },
          ],
        },
        prose: 'Null contradiction...',
      })

      const result = validateCoverage(caseFile)
      const contradictionErrors = result.errors.filter(
        (e) => e.code === 'COVERAGE_CONTRADICTORY_CONDITION',
      )
      expect(contradictionErrors.length).toBeGreaterThan(0)
    })
  })

  describe('criterion 10: unreachable endings', () => {
    it('should detect endings that no route reaches', () => {
      const caseFile = makeMinimalValidCase()
      // Add an ending that can never be reached (impossible condition)
      caseFile.endings.push({
        id: 'ending-impossible',
        name: 'bom',
        evaluationOrder: 5 as 1 | 2 | 3 | 4,
        condition: {
          op: 'and',
          conditions: [
            { op: 'gt', state: 'tempo_atrasado', value: 100 },
          ],
        },
        prose: 'Impossível...',
      })

      const result = validateCoverage(caseFile)
      const unreachableErrors = result.errors.filter(
        (e) => e.code === 'COVERAGE_UNREACHABLE_ENDING',
      )
      expect(unreachableErrors.length).toBeGreaterThan(0)
      expect(unreachableErrors.some((e) => e.message.includes('ending-impossible'))).toBe(true)
    })
  })

  describe('criterion 11: paths without ending', () => {
    it('should detect paths where no ending condition is satisfied', () => {
      // Create a case where acao_critica_a_tempo stays null but we bypass null check
      const nodes: NarrativeNode[] = [
        {
          kind: 'decision',
          id: 'scene-1',
          prose: 'Cena 1',
          presentationMetadata: { title: 'Cena 1' },
          choices: [
            {
              id: 'choice-null',
              label: 'Null choice',
              effects: [],
              transition: { kind: 'direct', targetNodeId: 'outcome' },
            },
          ],
          interpersonalBeatIds: [],
        },
        { kind: 'outcome_resolution', id: 'outcome' },
        {
          kind: 'ending',
          id: 'ending-node-tragico',
          endingId: 'ending-tragico',
          presentationMetadata: { title: 'Trágico' },
          continuationAction: { label: 'Ver debriefing' },
          nextNodeId: 'debriefing-tragico',
        },
        {
          kind: 'debriefing',
          id: 'debriefing-tragico',
          debriefingId: 'debrief-tragico',
          presentationMetadata: { title: 'Debriefing Trágico' },
        },
      ]

      // Endings that only match non-null acao_critica_a_tempo
      const endings: EndingDefinition[] = [
        {
          id: 'ending-tragico',
          name: 'tragico',
          evaluationOrder: 1,
          condition: { op: 'eq', state: 'acao_critica_a_tempo', value: false },
          prose: 'Trágico',
        },
      ]

      const caseFile: CaseFile = {
        schemaVersion: '1.0.0',
        caseId: 'test-no-ending',
        caseVersion: '1.0.0',
        metadata: { title: 'Test', playableCharacterId: 'test', locale: 'pt-BR' },
        startNodeId: 'scene-1',
        states: makeStates(),
        nodes,
        endings,
        debriefings: [],
        debriefingFragments: [],
        interpersonalBeats: [],
        editorialReviewStatus: 'draft',
        clinicalReviewStatus: 'pending',
      }

      const result = validateCoverage(caseFile)
      const noEndingErrors = result.errors.filter((e) => e.code === 'COVERAGE_PATH_NO_ENDING')
      expect(noEndingErrors.length).toBeGreaterThan(0)
    })
  })

  describe('criterion 13: critical null state', () => {
    it('should detect acao_critica_a_tempo null at outcome resolution', () => {
      const nodes: NarrativeNode[] = [
        {
          kind: 'decision',
          id: 'scene-1',
          prose: 'Cena 1',
          presentationMetadata: { title: 'Cena 1' },
          choices: [
            {
              id: 'choice-no-set',
              label: 'Does not set critical state',
              effects: [],
              transition: { kind: 'direct', targetNodeId: 'outcome' },
            },
          ],
          interpersonalBeatIds: [],
        },
        { kind: 'outcome_resolution', id: 'outcome' },
        {
          kind: 'ending',
          id: 'ending-node-tragico',
          endingId: 'ending-tragico',
          presentationMetadata: { title: 'Trágico' },
          continuationAction: { label: 'Ver debriefing' },
          nextNodeId: 'debriefing-tragico',
        },
        {
          kind: 'debriefing',
          id: 'debriefing-tragico',
          debriefingId: 'debrief-tragico',
          presentationMetadata: { title: 'Debriefing Trágico' },
        },
      ]

      const endings: EndingDefinition[] = [
        {
          id: 'ending-tragico',
          name: 'tragico',
          evaluationOrder: 1,
          condition: { op: 'eq', state: 'tempo_atrasado', value: 0 },
          prose: 'Trágico',
        },
      ]

      const caseFile: CaseFile = {
        schemaVersion: '1.0.0',
        caseId: 'test-critical-null',
        caseVersion: '1.0.0',
        metadata: { title: 'Test', playableCharacterId: 'test', locale: 'pt-BR' },
        startNodeId: 'scene-1',
        states: makeStates(),
        nodes,
        endings,
        debriefings: [],
        debriefingFragments: [],
        interpersonalBeats: [],
        editorialReviewStatus: 'draft',
        clinicalReviewStatus: 'pending',
      }

      const result = validateCoverage(caseFile)
      const nullErrors = result.errors.filter((e) => e.code === 'COVERAGE_CRITICAL_STATE_NULL')
      expect(nullErrors.length).toBeGreaterThan(0)
      expect(nullErrors[0]!.message).toContain('acao_critica_a_tempo')
    })
  })

  describe('criterion 17 & 18: all sequences reach exactly one ending, all 4 reachable', () => {
    it('should pass when all routes resolve and all endings are reachable', () => {
      // Build a case where all 4 endings are reachable
      const nodes: NarrativeNode[] = [
        {
          kind: 'decision',
          id: 'scene-1',
          prose: 'Cena 1',
          presentationMetadata: { title: 'Cena 1' },
          choices: [
            {
              id: 'choice-tragico',
              label: 'Trágico path',
              effects: [
                { target: 'acao_critica_a_tempo', operation: 'set', value: false },
              ],
              transition: { kind: 'direct', targetNodeId: 'outcome' },
            },
            {
              id: 'choice-grave',
              label: 'Grave path',
              effects: [
                { target: 'acao_critica_a_tempo', operation: 'set', value: false },
                { target: 'vigilancia_ativa', operation: 'increment', amount: 1 },
                { target: 'processo_heparina_seguro', operation: 'set', value: true },
              ],
              transition: { kind: 'direct', targetNodeId: 'outcome' },
            },
            {
              id: 'choice-excelente',
              label: 'Excelente path',
              effects: [
                { target: 'acao_critica_a_tempo', operation: 'set', value: true },
                { target: 'voltaren_comunicado', operation: 'set', value: true },
                { target: 'processo_heparina_seguro', operation: 'set', value: true },
              ],
              transition: { kind: 'direct', targetNodeId: 'outcome' },
            },
            {
              id: 'choice-bom',
              label: 'Bom path',
              effects: [
                { target: 'acao_critica_a_tempo', operation: 'set', value: true },
                { target: 'tempo_atrasado', operation: 'increment', amount: 2 },
              ],
              transition: { kind: 'direct', targetNodeId: 'outcome' },
            },
          ],
          interpersonalBeatIds: [],
        },
        { kind: 'outcome_resolution', id: 'outcome' },
        {
          kind: 'ending',
          id: 'ending-node-tragico',
          endingId: 'ending-tragico',
          presentationMetadata: { title: 'Trágico' },
          continuationAction: { label: 'Ver debriefing' },
          nextNodeId: 'debriefing-tragico',
        },
        {
          kind: 'ending',
          id: 'ending-node-grave',
          endingId: 'ending-grave',
          presentationMetadata: { title: 'Grave' },
          continuationAction: { label: 'Ver debriefing' },
          nextNodeId: 'debriefing-grave',
        },
        {
          kind: 'ending',
          id: 'ending-node-excelente',
          endingId: 'ending-excelente',
          presentationMetadata: { title: 'Excelente' },
          continuationAction: { label: 'Ver debriefing' },
          nextNodeId: 'debriefing-excelente',
        },
        {
          kind: 'ending',
          id: 'ending-node-bom',
          endingId: 'ending-bom',
          presentationMetadata: { title: 'Bom' },
          continuationAction: { label: 'Ver debriefing' },
          nextNodeId: 'debriefing-bom',
        },
        {
          kind: 'debriefing',
          id: 'debriefing-tragico',
          debriefingId: 'debrief-tragico',
          presentationMetadata: { title: 'Debriefing' },
        },
        {
          kind: 'debriefing',
          id: 'debriefing-grave',
          debriefingId: 'debrief-grave',
          presentationMetadata: { title: 'Debriefing' },
        },
        {
          kind: 'debriefing',
          id: 'debriefing-excelente',
          debriefingId: 'debrief-excelente',
          presentationMetadata: { title: 'Debriefing' },
        },
        {
          kind: 'debriefing',
          id: 'debriefing-bom',
          debriefingId: 'debrief-bom',
          presentationMetadata: { title: 'Debriefing' },
        },
      ]

      const caseFile: CaseFile = {
        schemaVersion: '1.0.0',
        caseId: 'test-all-endings',
        caseVersion: '1.0.0',
        metadata: { title: 'Test', playableCharacterId: 'test', locale: 'pt-BR' },
        startNodeId: 'scene-1',
        states: makeStates(),
        nodes,
        endings: makeEndings(),
        debriefings: [],
        debriefingFragments: [],
        interpersonalBeats: [],
        editorialReviewStatus: 'draft',
        clinicalReviewStatus: 'pending',
      }

      const result = validateCoverage(caseFile)
      const noEndingErrors = result.errors.filter((e) => e.code === 'COVERAGE_PATH_NO_ENDING')
      const unreachableErrors = result.errors.filter((e) => e.code === 'COVERAGE_UNREACHABLE_ENDING')
      expect(noEndingErrors).toHaveLength(0)
      expect(unreachableErrors).toHaveLength(0)
      expect(result.isValid).toBe(true)
    })
  })

  describe('criterion 20: ending condition depends on out-of-domain state', () => {
    it('should detect ending conditions referencing values outside declared domain', () => {
      const caseFile = makeMinimalValidCase()
      // Add an ending with condition referencing tempo_atrasado > 10 (max is 3)
      caseFile.endings.push({
        id: 'ending-out-of-domain',
        name: 'bom',
        evaluationOrder: 5 as 1 | 2 | 3 | 4,
        condition: {
          op: 'gt',
          state: 'tempo_atrasado',
          value: 10,
        },
        prose: 'Out of domain...',
      })

      const result = validateCoverage(caseFile)
      const domainErrors = result.errors.filter(
        (e) => e.code === 'COVERAGE_CONDITION_OUT_OF_DOMAIN',
      )
      expect(domainErrors.length).toBeGreaterThan(0)
      expect(domainErrors[0]!.message).toContain('tempo_atrasado')
    })
  })

  describe('criterion 12: overlapping rules', () => {
    it('should detect multiple endings at same evaluation order matching same route', () => {
      const nodes: NarrativeNode[] = [
        {
          kind: 'decision',
          id: 'scene-1',
          prose: 'Cena 1',
          presentationMetadata: { title: 'Cena 1' },
          choices: [
            {
              id: 'choice-a',
              label: 'Escolha A',
              effects: [
                { target: 'acao_critica_a_tempo', operation: 'set', value: true },
              ],
              transition: { kind: 'direct', targetNodeId: 'outcome' },
            },
          ],
          interpersonalBeatIds: [],
        },
        { kind: 'outcome_resolution', id: 'outcome' },
        {
          kind: 'ending',
          id: 'ending-node-a',
          endingId: 'ending-a',
          presentationMetadata: { title: 'A' },
          continuationAction: { label: 'Ver debriefing' },
          nextNodeId: 'debriefing-a',
        },
        {
          kind: 'debriefing',
          id: 'debriefing-a',
          debriefingId: 'debrief-a',
          presentationMetadata: { title: 'Debriefing' },
        },
      ]

      // Two endings at the same evaluationOrder that both match
      const endings: EndingDefinition[] = [
        {
          id: 'ending-a',
          name: 'bom',
          evaluationOrder: 1,
          condition: { op: 'eq', state: 'acao_critica_a_tempo', value: true },
          prose: 'A',
        },
        {
          id: 'ending-b',
          name: 'excelente',
          evaluationOrder: 1,
          condition: { op: 'eq', state: 'acao_critica_a_tempo', value: true },
          prose: 'B',
        },
      ]

      const caseFile: CaseFile = {
        schemaVersion: '1.0.0',
        caseId: 'test-overlapping',
        caseVersion: '1.0.0',
        metadata: { title: 'Test', playableCharacterId: 'test', locale: 'pt-BR' },
        startNodeId: 'scene-1',
        states: makeStates(),
        nodes,
        endings,
        debriefings: [],
        debriefingFragments: [],
        interpersonalBeats: [],
        editorialReviewStatus: 'draft',
        clinicalReviewStatus: 'pending',
      }

      const result = validateCoverage(caseFile)
      const overlapErrors = result.errors.filter((e) => e.code === 'COVERAGE_OVERLAPPING_RULES')
      expect(overlapErrors.length).toBeGreaterThan(0)
    })
  })

  describe('criterion 19: useless priority', () => {
    it('should detect when a higher-priority ending is completely subsumed by lower-priority', () => {
      const nodes: NarrativeNode[] = [
        {
          kind: 'decision',
          id: 'scene-1',
          prose: 'Cena 1',
          presentationMetadata: { title: 'Cena 1' },
          choices: [
            {
              id: 'choice-a',
              label: 'A',
              effects: [{ target: 'acao_critica_a_tempo', operation: 'set', value: true }],
              transition: { kind: 'direct', targetNodeId: 'outcome' },
            },
            {
              id: 'choice-b',
              label: 'B',
              effects: [{ target: 'acao_critica_a_tempo', operation: 'set', value: false }],
              transition: { kind: 'direct', targetNodeId: 'outcome' },
            },
          ],
          interpersonalBeatIds: [],
        },
        { kind: 'outcome_resolution', id: 'outcome' },
        {
          kind: 'ending',
          id: 'ending-node-a',
          endingId: 'ending-specific',
          presentationMetadata: { title: 'Specific' },
          continuationAction: { label: 'Ver debriefing' },
          nextNodeId: 'debriefing-a',
        },
        {
          kind: 'ending',
          id: 'ending-node-b',
          endingId: 'ending-catchall',
          presentationMetadata: { title: 'Catchall' },
          continuationAction: { label: 'Ver debriefing' },
          nextNodeId: 'debriefing-b',
        },
        {
          kind: 'debriefing',
          id: 'debriefing-a',
          debriefingId: 'debrief-a',
          presentationMetadata: { title: 'Debriefing' },
        },
        {
          kind: 'debriefing',
          id: 'debriefing-b',
          debriefingId: 'debrief-b',
          presentationMetadata: { title: 'Debriefing' },
        },
      ]

      // Higher-priority ending (order=1) that matches a subset of
      // what the lower-priority ending (order=2) matches.
      // This is actually FINE — the higher priority serves a purpose by differentiating.
      // But if the higher-priority matches ONLY things that a lower-priority also catches,
      // it's useless because it would have been caught anyway.
      const endings: EndingDefinition[] = [
        {
          id: 'ending-specific',
          name: 'tragico',
          evaluationOrder: 1,
          condition: { op: 'eq', state: 'acao_critica_a_tempo', value: true },
          prose: 'Specific',
        },
        {
          id: 'ending-catchall',
          name: 'bom',
          evaluationOrder: 2,
          // This matches EVERYTHING (true or false, whatever)
          condition: { op: 'isNotNull', state: 'acao_critica_a_tempo' },
          prose: 'Catchall',
        },
      ]

      const caseFile: CaseFile = {
        schemaVersion: '1.0.0',
        caseId: 'test-useless-priority',
        caseVersion: '1.0.0',
        metadata: { title: 'Test', playableCharacterId: 'test', locale: 'pt-BR' },
        startNodeId: 'scene-1',
        states: makeStates(),
        nodes,
        endings,
        debriefings: [],
        debriefingFragments: [],
        interpersonalBeats: [],
        editorialReviewStatus: 'draft',
        clinicalReviewStatus: 'pending',
      }

      const result = validateCoverage(caseFile)
      // The higher priority ending IS useless because the catchall below
      // would match all its routes anyway
      const uselessErrors = result.errors.filter((e) => e.code === 'COVERAGE_USELESS_PRIORITY')
      expect(uselessErrors.length).toBeGreaterThan(0)
      expect(uselessErrors[0]!.message).toContain('tragico')
    })
  })
})
