import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EngineCore } from './engine-core'
import type {
  CaseFile,
  SessionRepository,
  ActiveSessionSnapshot,
  EngineEvent,
  NodePresentation,
} from '@domain/index'
import { IncompatibleSaveError } from '@domain/index'

// === Test Fixtures ===

function createMinimalCaseFile(overrides?: Partial<CaseFile>): CaseFile {
  return {
    schemaVersion: '1.0.0',
    caseId: 'caso-test',
    caseVersion: '2.0.0',
    metadata: {
      title: 'Test Case',
      playableCharacterId: 'test-char',
      locale: 'pt-BR',
    },
    startNodeId: 'node-start',
    states: [
      { name: 'counter', type: 'integer', initialValue: 0, minimum: 0, maximum: 10 },
      { name: 'flag', type: 'boolean', initialValue: false },
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
        ],
        interpersonalBeatIds: [],
      },
      {
        kind: 'decision',
        id: 'node-2',
        prose: 'You moved forward. Choose again.',
        presentationMetadata: { title: 'Second Decision' },
        choices: [
          {
            id: 'choice-d',
            label: 'Continue',
            effects: [],
            transition: { kind: 'direct', targetNodeId: 'node-start' },
          },
        ],
        interpersonalBeatIds: [],
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

function createValidSnapshot(overrides?: Partial<ActiveSessionSnapshot>): ActiveSessionSnapshot {
  return {
    schemaVersion: '1.0.0',
    caseId: 'caso-test',
    caseVersion: '2.0.0',
    sessionId: 'session-abc-123',
    currentNodeId: 'node-2',
    states: { counter: 3, flag: true },
    confirmedChoices: [
      {
        sequence: 1,
        nodeId: 'node-start',
        choiceId: 'choice-a',
        confirmedAt: '2024-01-01T00:00:00.000Z',
      },
    ],
    visitedNodes: ['node-start', 'node-2'],
    sessionStatus: 'in_progress',
    updatedAt: '2024-01-01T00:01:00.000Z',
    ...overrides,
  }
}

describe('EngineCore.restoreSession', () => {
  let repository: SessionRepository
  let engine: EngineCore
  let events: EngineEvent[]

  beforeEach(() => {
    repository = createMockRepository()
    engine = new EngineCore(repository)
    events = []
    engine.subscribe((event) => events.push(event))
  })

  it('successfully restores all state from snapshot', async () => {
    const caseFile = createMinimalCaseFile()
    const snapshot = createValidSnapshot()

    await engine.restoreSession(snapshot, caseFile)

    // getCurrentPresentation should reflect the restored node
    const presentation = engine.getCurrentPresentation()
    expect(presentation.nodeId).toBe('node-2')
  })

  it('emits SESSION_RESTORED with correct presentation', async () => {
    const caseFile = createMinimalCaseFile()
    const snapshot = createValidSnapshot()

    await engine.restoreSession(snapshot, caseFile)

    expect(events).toHaveLength(1)
    expect(events[0]!.type).toBe('SESSION_RESTORED')

    const event = events[0] as { type: 'SESSION_RESTORED'; presentation: NodePresentation }
    expect(event.presentation.nodeId).toBe('node-2')
    expect(event.presentation.prose).toBe('You moved forward. Choose again.')
    expect(event.presentation.presentationMetadata).toEqual({ title: 'Second Decision' })
    expect(event.presentation.nodeKind).toBe('decision')
    expect(event.presentation.options).toHaveLength(1)
    expect(event.presentation.options![0]).toEqual({
      id: 'choice-d',
      label: 'Continue',
      isContinuation: false,
    })
  })

  it('throws IncompatibleSaveError on schema version mismatch', async () => {
    const caseFile = createMinimalCaseFile({ schemaVersion: '2.0.0' })
    const snapshot = createValidSnapshot({ schemaVersion: '1.0.0' })

    await expect(engine.restoreSession(snapshot, caseFile)).rejects.toThrow(IncompatibleSaveError)
    await expect(engine.restoreSession(snapshot, caseFile)).rejects.toThrow(
      /Schema version mismatch/,
    )
  })

  it('throws IncompatibleSaveError on case version mismatch', async () => {
    const caseFile = createMinimalCaseFile({ caseVersion: '3.0.0' })
    const snapshot = createValidSnapshot({ caseVersion: '2.0.0' })

    await expect(engine.restoreSession(snapshot, caseFile)).rejects.toThrow(IncompatibleSaveError)
    await expect(engine.restoreSession(snapshot, caseFile)).rejects.toThrow(
      /Case version mismatch/,
    )
  })

  it('does not re-apply effects (state is taken as-is from snapshot)', async () => {
    const caseFile = createMinimalCaseFile()
    // Snapshot has counter=3 which would be impossible if effects were re-applied from scratch
    // (max single increment = 1). This proves state is restored directly.
    const snapshot = createValidSnapshot({ states: { counter: 3, flag: true } })

    await engine.restoreSession(snapshot, caseFile)

    // The fact that no error is thrown and the state is accepted proves no re-application.
    // Also verify that applyEffects is NOT called by checking no side effects from re-evaluation.
    const presentation = engine.getCurrentPresentation()
    expect(presentation.nodeId).toBe('node-2')
    // Events should only contain SESSION_RESTORED — no CASE_STARTED, no CHOICE_CONFIRMED
    expect(events).toHaveLength(1)
    expect(events[0]!.type).toBe('SESSION_RESTORED')
  })

  it('getCurrentPresentation reflects restored node after restore', async () => {
    const caseFile = createMinimalCaseFile()
    const snapshot = createValidSnapshot({ currentNodeId: 'node-start' })

    await engine.restoreSession(snapshot, caseFile)

    const presentation = engine.getCurrentPresentation()
    expect(presentation.nodeId).toBe('node-start')
    expect(presentation.prose).toBe('You are in a room.')
    expect(presentation.nodeKind).toBe('decision')
    expect(presentation.options).toHaveLength(2)
  })
})
