import { describe, it, expect } from 'vitest'
import { validateStructure } from './structural-validator'
import type { CaseFile } from '@domain/case-file'
import type { NarrativeNode } from '@domain/narrative-nodes'
import type {
  StateDefinition,
  EndingDefinition,
  DebriefingDefinition,
  InterpersonalBeat,
  DebriefingFragment,
} from '@domain/types'

/**
 * Helper: creates a minimal valid CaseFile for testing.
 * Tests override specific fields to trigger validation errors.
 */
function createMinimalValidCase(overrides?: Partial<CaseFile>): CaseFile {
  const states: StateDefinition[] = [
    { name: 'tempo_atrasado', type: 'integer', initialValue: 0, minimum: 0, maximum: 3 },
    { name: 'confianca_equipe', type: 'integer', initialValue: 0, minimum: -2, maximum: 2 },
    { name: 'acao_critica', type: 'nullable_boolean', initialValue: null },
  ]

  const nodes: NarrativeNode[] = [
    {
      kind: 'decision',
      id: 'node-1',
      prose: 'Cena 1',
      presentationMetadata: { title: 'Cena 1' },
      choices: [
        {
          id: 'choice-1a',
          label: 'Opção A',
          effects: [{ target: 'tempo_atrasado', operation: 'increment', amount: 1 }],
          transition: { kind: 'direct', targetNodeId: 'node-2' },
        },
        {
          id: 'choice-1b',
          label: 'Opção B',
          effects: [{ target: 'confianca_equipe', operation: 'set', value: 1 }],
          transition: { kind: 'direct', targetNodeId: 'node-2' },
        },
        {
          id: 'choice-1c',
          label: 'Opção C',
          effects: [],
          transition: { kind: 'direct', targetNodeId: 'node-2' },
        },
      ],
      interpersonalBeatIds: ['beat-1-neg', 'beat-1-neutral', 'beat-1-pos'],
    },
    {
      kind: 'progression',
      id: 'node-2',
      prose: 'Progressão',
      presentationMetadata: { title: 'Progressão' },
      continuationAction: { label: 'Continuar' },
      transition: { kind: 'direct', targetNodeId: 'outcome-node' },
    },
    {
      kind: 'outcome_resolution',
      id: 'outcome-node',
    },
    {
      kind: 'ending',
      id: 'ending-node-bom',
      endingId: 'ending-bom',
      presentationMetadata: { title: 'Bom Desfecho' },
      continuationAction: { label: 'Ver debriefing' },
      nextNodeId: 'debriefing-node-bom',
    },
    {
      kind: 'debriefing',
      id: 'debriefing-node-bom',
      debriefingId: 'debrief-bom',
      presentationMetadata: { title: 'Debriefing' },
    },
  ]

  const endings: EndingDefinition[] = [
    {
      id: 'ending-bom',
      name: 'bom',
      evaluationOrder: 4,
      condition: { op: 'eq', state: 'acao_critica', value: true },
      prose: 'Bom desfecho.',
    },
  ]

  const debriefings: DebriefingDefinition[] = [
    {
      id: 'debrief-bom',
      endingId: 'ending-bom',
      outcomeFragmentId: 'frag-outcome',
      fragmentIds: [],
      closingFragmentId: 'frag-closing',
    },
  ]

  const debriefingFragments: DebriefingFragment[] = [
    {
      id: 'frag-outcome',
      section: 'desfecho',
      priority: 1,
      content: 'Resultado bom.',
    },
    {
      id: 'frag-closing',
      section: 'aprendizado',
      priority: 1,
      content: 'Aprendizado.',
    },
  ]

  const interpersonalBeats: InterpersonalBeat[] = [
    {
      id: 'beat-1-neg',
      sourceNodeId: 'node-1',
      band: 'negative',
      bandCondition: { op: 'lte', state: 'confianca_equipe', value: -1 },
      timing: 'immediate',
      prose: 'Beat negativo.',
    },
    {
      id: 'beat-1-neutral',
      sourceNodeId: 'node-1',
      band: 'neutral',
      bandCondition: { op: 'eq', state: 'confianca_equipe', value: 0 },
      timing: 'immediate',
      prose: 'Beat neutro.',
    },
    {
      id: 'beat-1-pos',
      sourceNodeId: 'node-1',
      band: 'positive',
      bandCondition: { op: 'gte', state: 'confianca_equipe', value: 1 },
      timing: 'immediate',
      prose: 'Beat positivo.',
    },
  ]

  return {
    schemaVersion: '1.0.0',
    caseId: 'test-case',
    caseVersion: '1.0.0',
    metadata: {
      title: 'Caso Teste',
      playableCharacterId: 'jessica',
      locale: 'pt-BR',
    },
    startNodeId: 'node-1',
    states,
    nodes,
    endings,
    debriefings,
    debriefingFragments,
    interpersonalBeats,
    editorialReviewStatus: 'draft',
    clinicalReviewStatus: 'pending',
    ...overrides,
  }
}

describe('validateStructure', () => {
  it('validates a minimal valid case file without errors', () => {
    const caseFile = createMinimalValidCase()
    const result = validateStructure(caseFile)

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  describe('Criterion 1: Duplicate IDs', () => {
    it('detects duplicate node IDs', () => {
      const caseFile = createMinimalValidCase()
      // Add a node with duplicate ID
      caseFile.nodes.push({
        kind: 'progression',
        id: 'node-1', // duplicate
        prose: 'Duplicata',
        presentationMetadata: {},
        continuationAction: { label: 'Continuar' },
        transition: { kind: 'direct', targetNodeId: 'node-2' },
      })

      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'DUPLICATE_NODE_ID')).toBe(true)
    })

    it('detects duplicate choice IDs', () => {
      const caseFile = createMinimalValidCase()
      const decisionNode = caseFile.nodes[0]!
      if (decisionNode.kind === 'decision') {
        decisionNode.choices.push({
          id: 'choice-1a', // duplicate
          label: 'Duplicata',
          effects: [],
          transition: { kind: 'direct', targetNodeId: 'node-2' },
        })
      }

      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'DUPLICATE_CHOICE_ID')).toBe(true)
    })

    it('detects duplicate state names', () => {
      const caseFile = createMinimalValidCase()
      caseFile.states.push({
        name: 'tempo_atrasado', // duplicate
        type: 'integer',
        initialValue: 0,
        minimum: 0,
        maximum: 5,
      })

      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'DUPLICATE_STATE_NAME')).toBe(true)
    })
  })

  describe('Criterion 2: Unreachable nodes', () => {
    it('detects nodes unreachable from startNodeId', () => {
      const caseFile = createMinimalValidCase()
      // Add an orphan node
      caseFile.nodes.push({
        kind: 'progression',
        id: 'orphan-node',
        prose: 'Orfão',
        presentationMetadata: {},
        continuationAction: { label: 'Continuar' },
        transition: { kind: 'direct', targetNodeId: 'node-2' },
      })

      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'UNREACHABLE_NODE' && e.location.includes('orphan-node'))).toBe(true)
    })
  })

  describe('Criterion 3: Dead-end nodes', () => {
    it('detects dead-end nodes that are not terminal', () => {
      const caseFile = createMinimalValidCase()
      // Replace progression node with one pointing to a dead-end
      caseFile.nodes.push({
        kind: 'progression',
        id: 'dead-end',
        prose: 'Dead end',
        presentationMetadata: {},
        continuationAction: { label: 'Continuar' },
        transition: { kind: 'direct', targetNodeId: 'nowhere' },
      })
      // Make it reachable
      const decisionNode = caseFile.nodes[0]!
      if (decisionNode.kind === 'decision') {
        decisionNode.choices[0]!.transition = { kind: 'direct', targetNodeId: 'dead-end' }
      }

      const result = validateStructure(caseFile)
      // Will also get INVALID_TRANSITION_TARGET for 'nowhere', and dead-end for the node
      expect(result.errors.some((e) => e.code === 'INVALID_TRANSITION_TARGET')).toBe(true)
    })
  })

  describe('Criterion 4: Choices without defined destination', () => {
    it('detects choices referencing nonexistent nodes', () => {
      const caseFile = createMinimalValidCase()
      const decisionNode = caseFile.nodes[0]!
      if (decisionNode.kind === 'decision') {
        decisionNode.choices[0]!.transition = { kind: 'direct', targetNodeId: 'nonexistent-node' }
      }

      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'INVALID_TRANSITION_TARGET')).toBe(true)
    })
  })

  describe('Criterion 5: Unauthorized cycles', () => {
    it('detects cycles in the graph', () => {
      const caseFile = createMinimalValidCase()
      // Create a cycle: node-2 → node-1 (node-2 is a progression that transitions back)
      const progressionNode = caseFile.nodes[1]!
      if (progressionNode.kind === 'progression') {
        progressionNode.transition = { kind: 'direct', targetNodeId: 'node-1' }
      }

      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'UNAUTHORIZED_CYCLE')).toBe(true)
    })
  })

  describe('Criterion 6: Undeclared state references', () => {
    it('detects effects referencing undeclared states', () => {
      const caseFile = createMinimalValidCase()
      const decisionNode = caseFile.nodes[0]!
      if (decisionNode.kind === 'decision') {
        decisionNode.choices[0]!.effects = [
          { target: 'nonexistent_state', operation: 'set', value: 1 },
        ]
      }

      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'UNDECLARED_STATE_IN_EFFECT')).toBe(true)
    })

    it('detects conditions referencing undeclared states in endings', () => {
      const caseFile = createMinimalValidCase()
      caseFile.endings[0]!.condition = { op: 'eq', state: 'ghost_state', value: true }

      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'UNDECLARED_STATE_IN_CONDITION')).toBe(true)
    })
  })

  describe('Criterion 7: Incompatible effects', () => {
    it('detects increment on boolean state', () => {
      const caseFile = createMinimalValidCase()
      caseFile.states.push({ name: 'flag', type: 'boolean', initialValue: false })
      const decisionNode = caseFile.nodes[0]!
      if (decisionNode.kind === 'decision') {
        decisionNode.choices[0]!.effects = [
          { target: 'flag', operation: 'increment', amount: 1 },
        ]
      }

      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'INCOMPATIBLE_EFFECT_TYPE')).toBe(true)
    })

    it('detects numeric set on boolean state', () => {
      const caseFile = createMinimalValidCase()
      caseFile.states.push({ name: 'flag', type: 'boolean', initialValue: false })
      const decisionNode = caseFile.nodes[0]!
      if (decisionNode.kind === 'decision') {
        decisionNode.choices[0]!.effects = [
          { target: 'flag', operation: 'set', value: 42 },
        ]
      }

      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'INCOMPATIBLE_EFFECT_TYPE')).toBe(true)
    })

    it('detects string set on integer state', () => {
      const caseFile = createMinimalValidCase()
      const decisionNode = caseFile.nodes[0]!
      if (decisionNode.kind === 'decision') {
        decisionNode.choices[0]!.effects = [
          { target: 'tempo_atrasado', operation: 'set', value: 'invalid' as unknown as number },
        ]
      }

      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'INCOMPATIBLE_EFFECT_TYPE')).toBe(true)
    })
  })

  describe('Criterion 14: Minimum choices', () => {
    it('detects decision nodes with fewer than 3 choices', () => {
      const caseFile = createMinimalValidCase()
      const decisionNode = caseFile.nodes[0]!
      if (decisionNode.kind === 'decision') {
        decisionNode.choices = decisionNode.choices.slice(0, 2) // only 2 choices
      }

      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'INSUFFICIENT_CHOICES')).toBe(true)
    })
  })

  describe('Criterion 15: Missing required metadata', () => {
    it('detects missing schemaVersion', () => {
      const caseFile = createMinimalValidCase({ schemaVersion: '' })
      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'MISSING_SCHEMA_VERSION')).toBe(true)
    })

    it('detects missing startNodeId', () => {
      const caseFile = createMinimalValidCase({ startNodeId: '' })
      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'MISSING_START_NODE_ID')).toBe(true)
    })

    it('detects missing endings', () => {
      const caseFile = createMinimalValidCase({ endings: [] })
      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'NO_ENDINGS_DEFINED')).toBe(true)
    })
  })

  describe('Criterion 16: Incompatible schema version', () => {
    it('detects incompatible schema version', () => {
      const caseFile = createMinimalValidCase({ schemaVersion: '2.0.0' })
      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'INCOMPATIBLE_SCHEMA_VERSION')).toBe(true)
    })

    it('accepts compatible schema version', () => {
      const caseFile = createMinimalValidCase({ schemaVersion: '1.0.0' })
      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'INCOMPATIBLE_SCHEMA_VERSION')).toBe(false)
    })
  })

  describe('Criterion 21: Missing interpersonal beats', () => {
    it('emits editorial warning in draft mode when beat is missing for a band', () => {
      const caseFile = createMinimalValidCase()
      // Remove the negative band beat
      caseFile.interpersonalBeats = caseFile.interpersonalBeats.filter(
        (b) => b.band !== 'negative',
      )

      const result = validateStructure(caseFile, 'draft')
      expect(result.warnings.some((w) => w.code === 'MISSING_BEAT_FOR_BAND' && w.message.includes('negative'))).toBe(true)
      // Should NOT be a blocking error in draft
      expect(result.errors.some((e) => e.code === 'MISSING_BEAT_FOR_BAND')).toBe(false)
    })

    it('emits blocking error in production mode when beat is missing for a band', () => {
      const caseFile = createMinimalValidCase()
      // Remove the positive band beat
      caseFile.interpersonalBeats = caseFile.interpersonalBeats.filter(
        (b) => b.band !== 'positive',
      )

      const result = validateStructure(caseFile, 'production')
      expect(result.errors.some((e) => e.code === 'MISSING_BEAT_FOR_BAND' && e.message.includes('positive'))).toBe(true)
    })
  })

  describe('Criterion 22: Provisional content', () => {
    it('emits editorial warning for provisional content', () => {
      const caseFile = createMinimalValidCase({
        provisionalContent: ['node-placeholder-1', 'fragment-draft-2'],
      })

      const result = validateStructure(caseFile)
      expect(result.warnings.filter((w) => w.code === 'PROVISIONAL_CONTENT')).toHaveLength(2)
    })

    it('no warning when provisionalContent is empty', () => {
      const caseFile = createMinimalValidCase({ provisionalContent: [] })
      const result = validateStructure(caseFile)
      expect(result.warnings.filter((w) => w.code === 'PROVISIONAL_CONTENT')).toHaveLength(0)
    })
  })

  describe('Criterion 23: Non-empty presentation title', () => {
    it('detects empty title on DecisionNode', () => {
      const caseFile = createMinimalValidCase()
      const decisionNode = caseFile.nodes[0]!
      if (decisionNode.kind === 'decision') {
        decisionNode.presentationMetadata = { title: '   ' }
      }

      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'EMPTY_PRESENTATION_TITLE')).toBe(true)
    })

    it('detects empty title on EndingNode', () => {
      const caseFile = createMinimalValidCase()
      const endingNode = caseFile.nodes.find((n) => n.kind === 'ending')!
      if (endingNode.kind === 'ending') {
        endingNode.presentationMetadata = { title: '' }
      }

      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'EMPTY_PRESENTATION_TITLE')).toBe(true)
    })
  })

  describe('Criterion 24: Beat sourceChoiceIds validity', () => {
    it('detects beat referencing nonexistent choice in source node', () => {
      const caseFile = createMinimalValidCase()
      caseFile.interpersonalBeats[0]!.sourceChoiceIds = ['nonexistent-choice']

      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'INVALID_BEAT_SOURCE_CHOICE')).toBe(true)
    })

    it('detects empty sourceChoiceIds array', () => {
      const caseFile = createMinimalValidCase()
      caseFile.interpersonalBeats[0]!.sourceChoiceIds = []

      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'EMPTY_BEAT_SOURCE_CHOICES')).toBe(true)
    })
  })

  describe('Criterion 25: Fragment sourceChoiceIds validity', () => {
    it('detects fragment referencing nonexistent choice', () => {
      const caseFile = createMinimalValidCase()
      caseFile.debriefingFragments[0]!.sourceChoiceIds = ['ghost-choice']

      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'INVALID_FRAGMENT_SOURCE_CHOICE')).toBe(true)
    })
  })

  describe('Criterion 26: Beat eligibleNodeId validity', () => {
    it('detects beat with invalid eligibleNodeId', () => {
      const caseFile = createMinimalValidCase()
      caseFile.interpersonalBeats[0]!.eligibleNodeId = 'nonexistent-node'

      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'INVALID_BEAT_ELIGIBLE_NODE')).toBe(true)
    })
  })

  describe('Criterion 27: EndingNode.nextNodeId references DebriefingNode', () => {
    it('detects EndingNode pointing to non-DebriefingNode', () => {
      const caseFile = createMinimalValidCase()
      const endingNode = caseFile.nodes.find((n) => n.kind === 'ending')!
      if (endingNode.kind === 'ending') {
        endingNode.nextNodeId = 'node-2' // points to a progression node
      }

      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'INVALID_ENDING_NEXT_NODE')).toBe(true)
    })
  })

  describe('Criterion 28: EndingNode.endingId references valid EndingDefinition', () => {
    it('detects EndingNode referencing nonexistent ending definition', () => {
      const caseFile = createMinimalValidCase()
      const endingNode = caseFile.nodes.find((n) => n.kind === 'ending')!
      if (endingNode.kind === 'ending') {
        endingNode.endingId = 'nonexistent-ending'
      }

      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'INVALID_ENDING_REFERENCE')).toBe(true)
    })
  })

  describe('OutcomeResolutionNode existence', () => {
    it('detects missing OutcomeResolutionNode', () => {
      const caseFile = createMinimalValidCase()
      caseFile.nodes = caseFile.nodes.filter((n) => n.kind !== 'outcome_resolution')
      // Also fix the transition to not point to the removed node
      const progressionNode = caseFile.nodes.find((n) => n.kind === 'progression')!
      if (progressionNode.kind === 'progression') {
        progressionNode.transition = { kind: 'direct', targetNodeId: 'ending-node-bom' }
      }

      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'MISSING_OUTCOME_RESOLUTION_NODE')).toBe(true)
    })
  })

  describe('DebriefingNode.debriefingId validity', () => {
    it('detects DebriefingNode referencing nonexistent debriefing definition', () => {
      const caseFile = createMinimalValidCase()
      const debriefingNode = caseFile.nodes.find((n) => n.kind === 'debriefing')!
      if (debriefingNode.kind === 'debriefing') {
        debriefingNode.debriefingId = 'nonexistent-debrief'
      }

      const result = validateStructure(caseFile)
      expect(result.errors.some((e) => e.code === 'INVALID_DEBRIEFING_REFERENCE')).toBe(true)
    })
  })
})
