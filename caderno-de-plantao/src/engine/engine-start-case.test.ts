import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EngineCore } from './engine-core'
import type {
  CaseFile,
  SessionRepository,
  EngineEvent,
  NodePresentation,
} from '@domain/index'

// === Test Fixtures ===

function createMinimalCaseFile(overrides?: Partial<CaseFile>): CaseFile {
  return {
    schemaVersion: '1.0.0',
    caseId: 'caso-test',
    caseVersion: '1.0.0',
    metadata: {
      title: 'Test Case',
      playableCharacterId: 'test-char',
      locale: 'pt-BR',
    },
    startNodeId: 'node-start',
    states: [
      { name: 'counter', type: 'integer', initialValue: 0, minimum: 0, maximum: 10 },
      { name: 'flag', type: 'boolean', initialValue: false },
      { name: 'status', type: 'nullable_boolean', initialValue: null },
    ],
    nodes: [
      {
        kind: 'decision',
        id: 'node-start',
        prose: 'You are in a room.',
        presentationMetadata: { title: 'Start', narrativeTime: '08h00' },
        choices: [
          {
            id: 'choice-a',
            label: 'Go left',
            effects: [{ target: 'counter', operation: 'increment', amount: 1 }],
            transition: { kind: 'direct', targetNodeId: 'node-2' },
          },
          {
            id: 'choice-b',
            label: 'Go right',
            effects: [{ target: 'flag', operation: 'set', value: true }],
            transition: { kind: 'direct', targetNodeId: 'node-2' },
          },
          {
            id: 'choice-c',
            label: 'Stay',
            effects: [],
            transition: { kind: 'direct', targetNodeId: 'node-2' },
          },
        ],
        interpersonalBeatIds: [],
      },
      {
        kind: 'progression',
        id: 'node-2',
        prose: 'You move forward.',
        presentationMetadata: { title: 'Progression' },
        continuationAction: { label: 'Continuar' },
        transition: { kind: 'direct', targetNodeId: 'node-end' },
      },
    ],
    endings: [
      {
        id: 'ending-good',
        name: 'bom',
        evaluationOrder: 4,
        condition: { op: 'eq', state: 'flag', value: true },
        prose: 'Good ending prose.',
      },
    ],
    debriefings: [],
    debriefingFragments: [],
    interpersonalBeats: [],
    editorialReviewStatus: 'draft',
    clinicalReviewStatus: 'pending',
    ...overrides,
  }
}

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

describe('EngineCore.startCase', () => {
  let repository: SessionRepository
  let engine: EngineCore
  let events: EngineEvent[]

  beforeEach(() => {
    repository = createMockRepository()
    engine = new EngineCore(repository)
    events = []
    engine.subscribe((event) => events.push(event))
  })

  it('initializes states from caseFile.states[].initialValue', async () => {
    const caseFile = createMinimalCaseFile()

    await engine.startCase(caseFile)

    // After startCase, getCurrentPresentation should reflect the start node
    const presentation = engine.getCurrentPresentation()
    expect(presentation.nodeId).toBe('node-start')

    // Verify the snapshot saved contains the initial states
    const saveCall = (repository.saveActiveSession as ReturnType<typeof vi.fn>).mock.calls[0]
    const snapshot = saveCall![0]
    expect(snapshot.states).toEqual({
      counter: 0,
      flag: false,
      status: null,
    })
  })

  it('emits CASE_STARTED event with correct NodePresentation for DecisionNode', async () => {
    const caseFile = createMinimalCaseFile()

    await engine.startCase(caseFile)

    expect(events).toHaveLength(1)
    expect(events[0]!.type).toBe('CASE_STARTED')

    const event = events[0] as { type: 'CASE_STARTED'; presentation: NodePresentation }
    expect(event.presentation.nodeId).toBe('node-start')
    expect(event.presentation.prose).toBe('You are in a room.')
    expect(event.presentation.presentationMetadata).toEqual({
      title: 'Start',
      narrativeTime: '08h00',
    })
    expect(event.presentation.nodeKind).toBe('decision')
    expect(event.presentation.options).toHaveLength(3)
    expect(event.presentation.options![0]).toEqual({
      id: 'choice-a',
      label: 'Go left',
      isContinuation: false,
    })
    expect(event.presentation.options![1]).toEqual({
      id: 'choice-b',
      label: 'Go right',
      isContinuation: false,
    })
    expect(event.presentation.options![2]).toEqual({
      id: 'choice-c',
      label: 'Stay',
      isContinuation: false,
    })
  })

  it('emits CASE_STARTED with ProgressionNode presentation when start is a progression node', async () => {
    const caseFile = createMinimalCaseFile({
      startNodeId: 'node-2',
    })

    await engine.startCase(caseFile)

    const event = events[0] as { type: 'CASE_STARTED'; presentation: NodePresentation }
    expect(event.presentation.nodeId).toBe('node-2')
    expect(event.presentation.prose).toBe('You move forward.')
    expect(event.presentation.nodeKind).toBe('progression')
    expect(event.presentation.options).toHaveLength(1)
    expect(event.presentation.options![0]!.isContinuation).toBe(true)
    expect(event.presentation.options![0]!.label).toBe('Continuar')
  })

  it('persists session snapshot via repository.saveActiveSession', async () => {
    const caseFile = createMinimalCaseFile()

    await engine.startCase(caseFile)

    expect(repository.saveActiveSession).toHaveBeenCalledTimes(1)
    const snapshot = (repository.saveActiveSession as ReturnType<typeof vi.fn>).mock.calls[0]![0]
    expect(snapshot.schemaVersion).toBe('1.0.0')
    expect(snapshot.caseId).toBe('caso-test')
    expect(snapshot.caseVersion).toBe('1.0.0')
    expect(snapshot.currentNodeId).toBe('node-start')
    expect(snapshot.sessionStatus).toBe('in_progress')
    expect(snapshot.confirmedChoices).toEqual([])
    expect(snapshot.visitedNodes).toEqual(['node-start'])
    expect(snapshot.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
    expect(snapshot.updatedAt).toBeTruthy()
  })

  it('marks persistence as degraded when saveActiveSession fails, but does not block', async () => {
    const failingRepo = createMockRepository({
      saveActiveSession: vi.fn().mockRejectedValue(new Error('Storage full')),
    })
    engine = new EngineCore(failingRepo)
    events = []
    engine.subscribe((event) => events.push(event))

    const caseFile = createMinimalCaseFile()

    // startCase should not throw
    await engine.startCase(caseFile)

    // CASE_STARTED should still be emitted
    const caseStarted = events.find((e) => e.type === 'CASE_STARTED')
    expect(caseStarted).toBeDefined()

    // PERSISTENCE_WARNING should be emitted
    const warning = events.find((e) => e.type === 'PERSISTENCE_WARNING')
    expect(warning).toBeDefined()
    expect((warning as { type: 'PERSISTENCE_WARNING'; message: string }).message).toContain(
      'não pôde ser salva',
    )
  })

  it('resets session state when calling startCase a second time', async () => {
    const caseFile = createMinimalCaseFile()

    // Start the case once
    await engine.startCase(caseFile)

    // Start again — should reset everything
    events = []
    await engine.startCase(caseFile)

    // Should have a new CASE_STARTED event
    expect(events).toHaveLength(1)
    expect(events[0]!.type).toBe('CASE_STARTED')

    // Verify the snapshot has fresh states
    const saveCall = (repository.saveActiveSession as ReturnType<typeof vi.fn>).mock.calls[1]
    const snapshot = saveCall![0]
    expect(snapshot.confirmedChoices).toEqual([])
    expect(snapshot.visitedNodes).toEqual(['node-start'])
    expect(snapshot.states).toEqual({
      counter: 0,
      flag: false,
      status: null,
    })
  })

  it('generates a different sessionId on each startCase call', async () => {
    const caseFile = createMinimalCaseFile()

    await engine.startCase(caseFile)
    await engine.startCase(caseFile)

    const call1 = (repository.saveActiveSession as ReturnType<typeof vi.fn>).mock.calls[0]![0]
    const call2 = (repository.saveActiveSession as ReturnType<typeof vi.fn>).mock.calls[1]![0]
    expect(call1.sessionId).not.toBe(call2.sessionId)
  })

  it('throws when start node is not found in caseFile.nodes', async () => {
    const caseFile = createMinimalCaseFile({
      startNodeId: 'nonexistent-node',
    })

    await expect(engine.startCase(caseFile)).rejects.toThrow('not found in case file nodes')
  })
})
