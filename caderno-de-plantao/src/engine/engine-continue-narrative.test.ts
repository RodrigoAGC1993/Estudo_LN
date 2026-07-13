import { describe, it, expect, vi } from 'vitest'
import { EngineCore } from './engine-core'
import type {
  SessionRepository,
  CaseFile,
  EngineEvent,
  NarrativeNode,
  StateDefinition,
  EndingDefinition,
  DebriefingDefinition,
  DebriefingFragment,
  InterpersonalBeat,
} from '@domain/index'
import { InvalidCommandError } from '@domain/index'

// === Helpers ===

function createMockRepository(available = true): SessionRepository {
  return {
    saveActiveSession: vi.fn().mockResolvedValue(undefined),
    loadActiveSession: vi.fn().mockResolvedValue(null),
    deleteActiveSession: vi.fn().mockResolvedValue(undefined),
    saveLastCompletion: vi.fn().mockResolvedValue(undefined),
    loadLastCompletion: vi.fn().mockResolvedValue(null),
    deleteLastCompletion: vi.fn().mockResolvedValue(undefined),
    isAvailable: () => available,
  }
}

function collectEvents(engine: EngineCore): EngineEvent[] {
  const events: EngineEvent[] = []
  engine.subscribe((e) => events.push(e))
  return events
}

/**
 * Creates a minimal CaseFile with common progression flow:
 * startNode (decision) → progressionNode → nextDecisionNode
 */
function createBasicCaseFile(): CaseFile {
  const states: StateDefinition[] = [
    { name: 'confianca_equipe', type: 'integer', initialValue: 0, minimum: -3, maximum: 3 },
    { name: 'acao_critica_a_tempo', type: 'nullable_boolean', initialValue: null },
  ]

  const nodes: NarrativeNode[] = [
    {
      kind: 'decision',
      id: 'decision-1',
      prose: 'Uma decisão difícil.',
      presentationMetadata: { title: 'Cena 1' },
      choices: [
        {
          id: 'choice-1a',
          label: 'Opção A',
          effects: [],
          transition: { kind: 'direct', targetNodeId: 'progression-1' },
        },
      ],
      interpersonalBeatIds: [],
    },
    {
      kind: 'progression',
      id: 'progression-1',
      prose: 'Você avança no corredor.',
      presentationMetadata: { title: 'Corredor' },
      continuationAction: { label: 'Continuar' },
      transition: { kind: 'direct', targetNodeId: 'decision-2' },
    },
    {
      kind: 'decision',
      id: 'decision-2',
      prose: 'Outra decisão.',
      presentationMetadata: { title: 'Cena 2' },
      choices: [],
      interpersonalBeatIds: [],
    },
  ]

  const endings: EndingDefinition[] = []
  const debriefings: DebriefingDefinition[] = []
  const debriefingFragments: DebriefingFragment[] = []
  const interpersonalBeats: InterpersonalBeat[] = []

  return {
    schemaVersion: '1.0.0',
    caseId: 'caso-01',
    caseVersion: '1.0.0',
    metadata: {
      title: 'Caso Teste',
      playableCharacterId: 'jessica',
      locale: 'pt-BR',
    },
    startNodeId: 'decision-1',
    states,
    nodes,
    endings,
    debriefings,
    debriefingFragments,
    interpersonalBeats,
    editorialReviewStatus: 'draft',
    clinicalReviewStatus: 'pending',
  }
}

/**
 * Creates a CaseFile with the full ending flow:
 * decision → consequence progression → OutcomeResolutionNode → EndingNode → DebriefingNode
 */
function createEndingFlowCaseFile(): CaseFile {
  const states: StateDefinition[] = [
    { name: 'confianca_equipe', type: 'integer', initialValue: 0, minimum: -3, maximum: 3 },
    { name: 'acao_critica_a_tempo', type: 'nullable_boolean', initialValue: true },
  ]

  const endings: EndingDefinition[] = [
    {
      id: 'ending-excelente',
      name: 'excelente',
      evaluationOrder: 3,
      condition: { op: 'eq', state: 'acao_critica_a_tempo', value: true },
      prose: 'Você salvou o paciente com excelência.',
    },
    {
      id: 'ending-grave',
      name: 'grave',
      evaluationOrder: 2,
      condition: { op: 'eq', state: 'acao_critica_a_tempo', value: false },
      prose: 'O paciente sofreu consequências graves.',
    },
  ]

  const debriefingFragments: DebriefingFragment[] = [
    {
      id: 'frag-outcome-excelente',
      section: 'desfecho',
      priority: 1,
      content: 'Desfecho excelente alcançado.',
    },
    {
      id: 'frag-closing',
      section: 'aprendizado',
      priority: 1,
      content: 'Leve isso para o próximo plantão.',
    },
  ]

  const debriefings: DebriefingDefinition[] = [
    {
      id: 'debriefing-excelente',
      endingId: 'ending-excelente',
      outcomeFragmentId: 'frag-outcome-excelente',
      fragmentIds: [],
      closingFragmentId: 'frag-closing',
    },
  ]

  const nodes: NarrativeNode[] = [
    {
      kind: 'decision',
      id: 'decision-4',
      prose: 'Cena final.',
      presentationMetadata: { title: 'Cena 4' },
      choices: [
        {
          id: 'choice-4a',
          label: 'Agir a tempo',
          effects: [{ target: 'acao_critica_a_tempo', operation: 'set', value: true }],
          transition: { kind: 'direct', targetNodeId: 'consequence-progression' },
        },
      ],
      interpersonalBeatIds: [],
    },
    {
      kind: 'progression',
      id: 'consequence-progression',
      prose: 'O resultado se revela...',
      presentationMetadata: { title: 'Consequência' },
      continuationAction: { label: 'Continuar' },
      transition: { kind: 'direct', targetNodeId: 'outcome-resolution-node' },
    },
    {
      kind: 'outcome_resolution',
      id: 'outcome-resolution-node',
    },
    {
      kind: 'ending',
      id: 'ending-node-excelente',
      endingId: 'ending-excelente',
      presentationMetadata: { title: 'Desfecho' },
      continuationAction: { label: 'Ver debriefing' },
      nextNodeId: 'debriefing-node',
    },
    {
      kind: 'ending',
      id: 'ending-node-grave',
      endingId: 'ending-grave',
      presentationMetadata: { title: 'Desfecho Grave' },
      continuationAction: { label: 'Ver debriefing' },
      nextNodeId: 'debriefing-node',
    },
    {
      kind: 'debriefing',
      id: 'debriefing-node',
      debriefingId: 'debriefing-excelente',
      presentationMetadata: { title: 'Debriefing' },
    },
  ]

  return {
    schemaVersion: '1.0.0',
    caseId: 'caso-01',
    caseVersion: '1.0.0',
    metadata: {
      title: 'Caso Desfecho',
      playableCharacterId: 'jessica',
      locale: 'pt-BR',
    },
    startNodeId: 'decision-4',
    states,
    nodes,
    endings,
    debriefings,
    debriefingFragments,
    interpersonalBeats: [],
    editorialReviewStatus: 'draft',
    clinicalReviewStatus: 'pending',
  }
}

/**
 * Helper to start a case and advance engine to a specific progression node.
 */
async function startAndAdvanceTo(
  engine: EngineCore,
  caseFile: CaseFile,
  targetNodeId: string,
): Promise<void> {
  await engine.startCase(caseFile)

  // If start node is the target, we're done
  if (caseFile.startNodeId === targetNodeId) return

  // Find a decision node that leads to the target via a choice
  const startNode = caseFile.nodes.find((n) => n.id === caseFile.startNodeId)
  if (startNode && startNode.kind === 'decision' && startNode.choices.length > 0) {
    const choice = startNode.choices[0]!
    await engine.confirmChoice(startNode.id, choice.id)
  }
}

// === Tests ===

describe('continueNarrative', () => {
  describe('ProgressionNode → next presentable node (Case A/D)', () => {
    it('transitions from ProgressionNode to next presentable node', async () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)
      const caseFile = createBasicCaseFile()

      // Start case and advance to the progression node via choice confirmation
      await startAndAdvanceTo(engine, caseFile, 'progression-1')

      const events = collectEvents(engine)
      await engine.continueNarrative('progression-1')

      const continuationEvent = events.find((e) => e.type === 'CONTINUATION_COMPLETED')
      expect(continuationEvent).toBeDefined()
      expect(continuationEvent!.type).toBe('CONTINUATION_COMPLETED')

      if (continuationEvent!.type === 'CONTINUATION_COMPLETED') {
        expect(continuationEvent!.presentation).toBeDefined()
        expect(continuationEvent!.presentation!.nodeId).toBe('decision-2')
        expect(continuationEvent!.presentation!.nodeKind).toBe('decision')
      }
    })

    it('persists the session after continuation', async () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)
      const caseFile = createBasicCaseFile()

      await startAndAdvanceTo(engine, caseFile, 'progression-1')
      await engine.continueNarrative('progression-1')

      // saveActiveSession called: once for startCase, once for confirmChoice, once for continue
      expect(repo.saveActiveSession).toHaveBeenCalledTimes(3)
      const lastCall = (repo.saveActiveSession as ReturnType<typeof vi.fn>).mock.calls[2]![0]
      expect(lastCall.currentNodeId).toBe('decision-2')
    })
  })

  describe('ProgressionNode → OutcomeResolutionNode → EndingNode (Case B)', () => {
    it('resolves outcome and presents EndingNode', async () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)
      const caseFile = createEndingFlowCaseFile()

      // Start → confirm choice at decision-4 (sets acao_critica_a_tempo=true) → arrives at consequence-progression
      await engine.startCase(caseFile)
      await engine.confirmChoice('decision-4', 'choice-4a')

      const events = collectEvents(engine)
      await engine.continueNarrative('consequence-progression')

      // Should emit CONTINUATION_COMPLETED with EndingNode presentation
      const continuationEvent = events.find((e) => e.type === 'CONTINUATION_COMPLETED')
      expect(continuationEvent).toBeDefined()
      if (continuationEvent!.type === 'CONTINUATION_COMPLETED') {
        expect(continuationEvent!.presentation).toBeDefined()
        expect(continuationEvent!.presentation!.nodeId).toBe('ending-node-excelente')
        expect(continuationEvent!.presentation!.nodeKind).toBe('ending')
      }

      // Should also emit ENDING_RESOLVED
      const endingEvent = events.find((e) => e.type === 'ENDING_RESOLVED')
      expect(endingEvent).toBeDefined()
      if (endingEvent!.type === 'ENDING_RESOLVED') {
        expect(endingEvent!.ending.endingName).toBe('excelente')
      }
    })

    it('does NOT add OutcomeResolutionNode to visitedNodes', async () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)
      const caseFile = createEndingFlowCaseFile()

      await engine.startCase(caseFile)
      await engine.confirmChoice('decision-4', 'choice-4a')
      await engine.continueNarrative('consequence-progression')

      // Check that outcome-resolution-node is NOT in the saved snapshot's visitedNodes
      const lastCall = (repo.saveActiveSession as ReturnType<typeof vi.fn>).mock.calls[2]![0]
      expect(lastCall.visitedNodes).not.toContain('outcome-resolution-node')
      expect(lastCall.visitedNodes).toContain('ending-node-excelente')
    })
  })

  describe('EndingNode → DebriefingNode (Case C — session completed)', () => {
    it('marks session as completed and emits DEBRIEFING_PRESENTED', async () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)
      const caseFile = createEndingFlowCaseFile()

      await engine.startCase(caseFile)
      await engine.confirmChoice('decision-4', 'choice-4a')
      await engine.continueNarrative('consequence-progression')

      const events = collectEvents(engine)
      await engine.continueNarrative('ending-node-excelente')

      // CONTINUATION_COMPLETED without presentation
      const continuationEvent = events.find((e) => e.type === 'CONTINUATION_COMPLETED')
      expect(continuationEvent).toBeDefined()
      if (continuationEvent!.type === 'CONTINUATION_COMPLETED') {
        expect(continuationEvent!.presentation).toBeUndefined()
      }

      // DEBRIEFING_PRESENTED with sections
      const debriefingEvent = events.find((e) => e.type === 'DEBRIEFING_PRESENTED')
      expect(debriefingEvent).toBeDefined()
      if (debriefingEvent!.type === 'DEBRIEFING_PRESENTED') {
        expect(debriefingEvent!.debriefing.sections.length).toBeGreaterThan(0)
      }
    })

    it('saves LastCompletionRecord and deletes active session', async () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)
      const caseFile = createEndingFlowCaseFile()

      await engine.startCase(caseFile)
      await engine.confirmChoice('decision-4', 'choice-4a')
      await engine.continueNarrative('consequence-progression')
      await engine.continueNarrative('ending-node-excelente')

      expect(repo.saveLastCompletion).toHaveBeenCalledOnce()
      const record = (repo.saveLastCompletion as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(record.caseId).toBe('caso-01')
      expect(record.endingId).toBe('ending-excelente')
      expect(record.schemaVersion).toBe('1.0.0')
      expect(record.completedAt).toBeDefined()

      expect(repo.deleteActiveSession).toHaveBeenCalledWith('caso-01')
    })

    it('session is completed after EndingNode continuation', async () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)
      const caseFile = createEndingFlowCaseFile()

      await engine.startCase(caseFile)
      await engine.confirmChoice('decision-4', 'choice-4a')
      await engine.continueNarrative('consequence-progression')
      await engine.continueNarrative('ending-node-excelente')

      // Attempting another command should fail — session is completed
      await expect(
        engine.continueNarrative('debriefing-node'),
      ).rejects.toThrow('Sessão não está em progresso')
    })
  })

  describe('InvalidCommandError for wrong nodeId or wrong node kind', () => {
    it('throws when nodeId does not match currentNodeId', async () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)
      const caseFile = createBasicCaseFile()

      await startAndAdvanceTo(engine, caseFile, 'progression-1')

      await expect(
        engine.continueNarrative('wrong-node-id'),
      ).rejects.toThrow(InvalidCommandError)
    })

    it('throws when current node is a DecisionNode', async () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)
      const caseFile = createBasicCaseFile()

      await engine.startCase(caseFile)

      // decision-1 is the current node (start node)
      await expect(
        engine.continueNarrative('decision-1'),
      ).rejects.toThrow(InvalidCommandError)
    })

    it('throws when session is not in progress', async () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)

      await expect(
        engine.continueNarrative('any-node'),
      ).rejects.toThrow('Sessão não está em progresso')
    })
  })

  describe('States not modified during continuation', () => {
    it('preserves states unchanged after continuation', async () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)
      const caseFile = createBasicCaseFile()

      await startAndAdvanceTo(engine, caseFile, 'progression-1')

      // Get states before continuation via snapshot
      const snapshotBefore = (repo.saveActiveSession as ReturnType<typeof vi.fn>).mock.calls[1]![0]
      const statesBefore = { ...snapshotBefore.states }

      await engine.continueNarrative('progression-1')

      const snapshotAfter = (repo.saveActiveSession as ReturnType<typeof vi.fn>).mock.calls[2]![0]
      expect(snapshotAfter.states).toEqual(statesBefore)
    })
  })

  describe('Deferred beat included when eligible', () => {
    it('includes deferred beat in CONTINUATION_COMPLETED when eligible', async () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)

      const caseFile = createBasicCaseFile()

      // Add a deferred beat that triggers when arriving at decision-2
      const deferredBeat: InterpersonalBeat = {
        id: 'beat-deferred-1',
        sourceNodeId: 'decision-1',
        sourceChoiceIds: ['choice-1a'],
        band: 'neutral',
        bandCondition: { op: 'eq', state: 'confianca_equipe', value: 0 },
        timing: 'deferred',
        prose: 'A enfermeira nota sua decisão anterior.',
        deferredActivationCondition: { op: 'eq', state: 'confianca_equipe', value: 0 },
        eligibleNodeId: 'decision-2',
      }
      caseFile.interpersonalBeats = [deferredBeat]

      await startAndAdvanceTo(engine, caseFile, 'progression-1')

      const events = collectEvents(engine)
      await engine.continueNarrative('progression-1')

      const continuationEvent = events.find((e) => e.type === 'CONTINUATION_COMPLETED')
      expect(continuationEvent).toBeDefined()
      if (continuationEvent!.type === 'CONTINUATION_COMPLETED') {
        expect(continuationEvent!.beat).toBeDefined()
        expect(continuationEvent!.beat!.prose).toBe('A enfermeira nota sua decisão anterior.')
      }
    })
  })
})
