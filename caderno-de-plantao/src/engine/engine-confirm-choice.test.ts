import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EngineCore } from './engine-core'
import type {
  CaseFile,
  SessionRepository,
  EngineEvent,
  NodePresentation,
  BeatPresentation,
} from '@domain/index'
import { InvalidCommandError, ContentRuntimeError } from '@domain/index'

// === Test Fixtures ===

function createMockRepository(overrides?: Partial<SessionRepository>): SessionRepository {
  return {
    saveActiveSession: vi.fn().mockResolvedValue(undefined),
    loadActiveSession: vi.fn().mockResolvedValue(null),
    deleteActiveSession: vi.fn().mockResolvedValue(undefined),
    saveLastCompletion: vi.fn().mockResolvedValue(undefined),
    loadLastCompletion: vi.fn().mockResolvedValue(null),
    deleteLastCompletion: vi.fn().mockResolvedValue(undefined),
    isAvailable: vi.fn().mockReturnValue(true),
    ...overrides,
  }
}

function createCaseFileWithDecision(overrides?: Partial<CaseFile>): CaseFile {
  return {
    schemaVersion: '1.0.0',
    caseId: 'caso-test',
    caseVersion: '1.0.0',
    metadata: {
      title: 'Test Case',
      playableCharacterId: 'test-char',
      locale: 'pt-BR',
    },
    startNodeId: 'node-decision',
    states: [
      { name: 'confianca_equipe', type: 'integer', initialValue: 0, minimum: -3, maximum: 3 },
      { name: 'flag', type: 'boolean', initialValue: false },
    ],
    nodes: [
      {
        kind: 'decision',
        id: 'node-decision',
        prose: 'O paciente apresenta sintomas.',
        presentationMetadata: { title: 'Decisão Inicial' },
        choices: [
          {
            id: 'choice-a',
            label: 'Avaliar sinais vitais',
            effects: [{ target: 'confianca_equipe', operation: 'increment', amount: 1 }],
            transition: { kind: 'direct', targetNodeId: 'node-next' },
          },
          {
            id: 'choice-b',
            label: 'Ignorar e seguir',
            effects: [{ target: 'flag', operation: 'set', value: true }],
            transition: { kind: 'direct', targetNodeId: 'node-next' },
          },
        ],
        interpersonalBeatIds: [],
      },
      {
        kind: 'progression',
        id: 'node-next',
        prose: 'Você avança no plantão.',
        presentationMetadata: { title: 'Progresso' },
        continuationAction: { label: 'Continuar' },
        transition: { kind: 'direct', targetNodeId: 'node-decision' },
      },
    ],
    endings: [],
    debriefings: [],
    debriefingFragments: [],
    interpersonalBeats: [],
    editorialReviewStatus: 'draft',
    clinicalReviewStatus: 'pending',
    ...overrides,
  }
}

describe('EngineCore.confirmChoice', () => {
  let repository: SessionRepository
  let engine: EngineCore
  let events: EngineEvent[]

  beforeEach(async () => {
    repository = createMockRepository()
    engine = new EngineCore(repository)
    events = []
    engine.subscribe((event) => events.push(event))

    // Start the case to initialize state
    const caseFile = createCaseFileWithDecision()
    await engine.startCase(caseFile)

    // Clear the events from startCase
    events = []
  })

  describe('successful confirmation flow', () => {
    it('emits CHOICE_CONFIRMATION_STARTED first, then CHOICE_CONFIRMED', async () => {
      await engine.confirmChoice('node-decision', 'choice-a')

      expect(events.length).toBeGreaterThanOrEqual(2)
      expect(events[0]).toEqual({
        type: 'CHOICE_CONFIRMATION_STARTED',
        nodeId: 'node-decision',
        choiceId: 'choice-a',
      })
      expect(events[1]!.type).toBe('CHOICE_CONFIRMED')
    })

    it('CHOICE_CONFIRMED contains NodePresentation of target node', async () => {
      await engine.confirmChoice('node-decision', 'choice-a')

      const confirmed = events.find((e) => e.type === 'CHOICE_CONFIRMED') as {
        type: 'CHOICE_CONFIRMED'
        presentation: NodePresentation
        beat?: BeatPresentation
      }
      expect(confirmed).toBeDefined()
      expect(confirmed.presentation.nodeId).toBe('node-next')
      expect(confirmed.presentation.prose).toBe('Você avança no plantão.')
      expect(confirmed.presentation.nodeKind).toBe('progression')
    })

    it('applies effects to state (increment confianca_equipe)', async () => {
      await engine.confirmChoice('node-decision', 'choice-a')

      // Verify by checking the snapshot that was persisted
      const saveCall = (repository.saveActiveSession as ReturnType<typeof vi.fn>).mock.calls
      // The second call is from confirmChoice (first is from startCase)
      const snapshot = saveCall[saveCall.length - 1]![0]
      expect(snapshot.states.confianca_equipe).toBe(1)
    })

    it('transitions to the target node', async () => {
      await engine.confirmChoice('node-decision', 'choice-a')

      const presentation = engine.getCurrentPresentation()
      expect(presentation.nodeId).toBe('node-next')
    })

    it('records the confirmed choice in the snapshot', async () => {
      await engine.confirmChoice('node-decision', 'choice-a')

      const saveCall = (repository.saveActiveSession as ReturnType<typeof vi.fn>).mock.calls
      const snapshot = saveCall[saveCall.length - 1]![0]
      expect(snapshot.confirmedChoices).toHaveLength(1)
      expect(snapshot.confirmedChoices[0].sequence).toBe(1)
      expect(snapshot.confirmedChoices[0].nodeId).toBe('node-decision')
      expect(snapshot.confirmedChoices[0].choiceId).toBe('choice-a')
      expect(snapshot.confirmedChoices[0].confirmedAt).toBeTruthy()
    })

    it('updates visitedNodes with target node', async () => {
      await engine.confirmChoice('node-decision', 'choice-a')

      const saveCall = (repository.saveActiveSession as ReturnType<typeof vi.fn>).mock.calls
      const snapshot = saveCall[saveCall.length - 1]![0]
      expect(snapshot.visitedNodes).toContain('node-next')
    })
  })

  describe('CHOICE_CONFIRMATION_STARTED is emitted before validation', () => {
    it('emits CHOICE_CONFIRMATION_STARTED even when nodeId is wrong', async () => {
      await expect(engine.confirmChoice('wrong-node', 'choice-a')).rejects.toThrow(
        InvalidCommandError,
      )

      expect(events[0]!).toEqual({
        type: 'CHOICE_CONFIRMATION_STARTED',
        nodeId: 'wrong-node',
        choiceId: 'choice-a',
      })
    })

    it('emits CHOICE_CONFIRMATION_STARTED even when session is not in_progress', async () => {
      // Force the session status to idle via internal access
      const core = engine as unknown as {
        sessionStatus: 'idle' | 'in_progress' | 'completed'
      }
      core.sessionStatus = 'idle'

      await expect(engine.confirmChoice('node-decision', 'choice-a')).rejects.toThrow(
        InvalidCommandError,
      )

      expect(events[0]).toEqual({
        type: 'CHOICE_CONFIRMATION_STARTED',
        nodeId: 'node-decision',
        choiceId: 'choice-a',
      })
    })
  })

  describe('idempotency', () => {
    it('same nodeId + same choiceId already confirmed → no-op (no events)', async () => {
      await engine.confirmChoice('node-decision', 'choice-a')
      events = []

      // Attempt to confirm the same choice again
      await engine.confirmChoice('node-decision', 'choice-a')

      // Only CHOICE_CONFIRMATION_STARTED emitted, then the idempotency no-op returns early
      expect(events).toHaveLength(1)
      expect(events[0]!.type).toBe('CHOICE_CONFIRMATION_STARTED')
    })

    it('same nodeId + different choiceId → InvalidCommandError', async () => {
      await engine.confirmChoice('node-decision', 'choice-a')
      events = []

      await expect(engine.confirmChoice('node-decision', 'choice-b')).rejects.toThrow(
        InvalidCommandError,
      )
    })
  })

  describe('InvalidCommandError cases', () => {
    it('throws when nodeId does not match currentNodeId (stale command)', async () => {
      await expect(engine.confirmChoice('different-node', 'choice-a')).rejects.toThrow(
        InvalidCommandError,
      )
    })

    it('throws when session is not in_progress', async () => {
      const core = engine as unknown as {
        sessionStatus: 'idle' | 'in_progress' | 'completed'
      }
      core.sessionStatus = 'completed'

      await expect(engine.confirmChoice('node-decision', 'choice-a')).rejects.toThrow(
        InvalidCommandError,
      )
    })

    it('throws when choiceId does not exist in the decision node', async () => {
      await expect(
        engine.confirmChoice('node-decision', 'nonexistent-choice'),
      ).rejects.toThrow(InvalidCommandError)
    })
  })

  describe('CONTENT_ERROR on domain violation', () => {
    it('emits CONTENT_ERROR and throws when effect causes domain violation', async () => {
      // Create a case file where the choice would violate domain bounds
      const caseFile = createCaseFileWithDecision({
        states: [
          {
            name: 'confianca_equipe',
            type: 'integer',
            initialValue: 3,
            minimum: -3,
            maximum: 3,
          },
          { name: 'flag', type: 'boolean', initialValue: false },
        ],
        nodes: [
          {
            kind: 'decision',
            id: 'node-decision',
            prose: 'Decisão.',
            presentationMetadata: { title: 'Decisão' },
            choices: [
              {
                id: 'choice-overflow',
                label: 'Overflows max',
                effects: [
                  { target: 'confianca_equipe', operation: 'increment', amount: 1 },
                ],
                transition: { kind: 'direct', targetNodeId: 'node-next' },
              },
            ],
            interpersonalBeatIds: [],
          },
          {
            kind: 'progression',
            id: 'node-next',
            prose: 'Next.',
            presentationMetadata: { title: 'Next' },
            continuationAction: { label: 'Continuar' },
            transition: { kind: 'direct', targetNodeId: 'node-decision' },
          },
        ],
      })

      // Restart with the new case file
      const repo2 = createMockRepository()
      const engine2 = new EngineCore(repo2)
      const events2: EngineEvent[] = []
      engine2.subscribe((e) => events2.push(e))

      await engine2.startCase(caseFile)
      events2.length = 0

      await expect(
        engine2.confirmChoice('node-decision', 'choice-overflow'),
      ).rejects.toThrow(ContentRuntimeError)

      const contentError = events2.find((e) => e.type === 'CONTENT_ERROR')
      expect(contentError).toBeDefined()
      expect((contentError as { type: 'CONTENT_ERROR'; error: { code: string } }).error.code).toBe(
        'DOMAIN_VIOLATION',
      )
    })
  })

  describe('PERSISTENCE_WARNING when save fails', () => {
    it('emits PERSISTENCE_WARNING but still commits in memory when save fails', async () => {
      const failingRepo = createMockRepository({
        saveActiveSession: vi
          .fn()
          .mockResolvedValueOnce(undefined) // First call (startCase) succeeds
          .mockRejectedValueOnce(new Error('Storage full')), // Second call (confirmChoice) fails
      })
      const engine2 = new EngineCore(failingRepo)
      const events2: EngineEvent[] = []
      engine2.subscribe((e) => events2.push(e))

      const caseFile = createCaseFileWithDecision()
      await engine2.startCase(caseFile)
      events2.length = 0

      await engine2.confirmChoice('node-decision', 'choice-a')

      // Should still transition in memory
      const presentation = engine2.getCurrentPresentation()
      expect(presentation.nodeId).toBe('node-next')

      // CHOICE_CONFIRMED should still be emitted
      const confirmed = events2.find((e) => e.type === 'CHOICE_CONFIRMED')
      expect(confirmed).toBeDefined()

      // PERSISTENCE_WARNING should be emitted after CHOICE_CONFIRMED
      const warning = events2.find((e) => e.type === 'PERSISTENCE_WARNING')
      expect(warning).toBeDefined()

      // Verify order: CHOICE_CONFIRMATION_STARTED → CHOICE_CONFIRMED → PERSISTENCE_WARNING
      const types = events2.map((e) => e.type)
      const startIdx = types.indexOf('CHOICE_CONFIRMATION_STARTED')
      const confirmIdx = types.indexOf('CHOICE_CONFIRMED')
      const warnIdx = types.indexOf('PERSISTENCE_WARNING')
      expect(startIdx).toBeLessThan(confirmIdx)
      expect(confirmIdx).toBeLessThan(warnIdx)
    })
  })

  describe('beat selection', () => {
    it('includes BeatPresentation when an immediate beat matches', async () => {
      const caseFile = createCaseFileWithDecision({
        interpersonalBeats: [
          {
            id: 'beat-1',
            sourceNodeId: 'node-decision',
            sourceChoiceIds: ['choice-a'],
            band: 'positive',
            bandCondition: { op: 'gte', state: 'confianca_equipe', value: 1 },
            timing: 'immediate',
            prose: 'A equipe sorri para você.',
          },
        ],
      })

      const repo2 = createMockRepository()
      const engine2 = new EngineCore(repo2)
      const events2: EngineEvent[] = []
      engine2.subscribe((e) => events2.push(e))

      await engine2.startCase(caseFile)
      events2.length = 0

      await engine2.confirmChoice('node-decision', 'choice-a')

      const confirmed = events2.find((e) => e.type === 'CHOICE_CONFIRMED') as {
        type: 'CHOICE_CONFIRMED'
        presentation: NodePresentation
        beat?: BeatPresentation
      }
      expect(confirmed.beat).toBeDefined()
      expect(confirmed.beat!.prose).toBe('A equipe sorri para você.')
    })

    it('does not include beat when no immediate beat matches', async () => {
      await engine.confirmChoice('node-decision', 'choice-a')

      const confirmed = events.find((e) => e.type === 'CHOICE_CONFIRMED') as {
        type: 'CHOICE_CONFIRMED'
        presentation: NodePresentation
        beat?: BeatPresentation
      }
      expect(confirmed.beat).toBeUndefined()
    })
  })
})
