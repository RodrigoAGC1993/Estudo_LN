import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './store'
import type { EngineEvent, NodePresentation } from '@domain/index'

function makePresentation(overrides?: Partial<NodePresentation>): NodePresentation {
  return {
    nodeId: 'node-1',
    prose: 'Test prose',
    presentationMetadata: { title: 'Test' },
    nodeKind: 'decision',
    ...overrides,
  }
}

describe('GameStore', () => {
  beforeEach(() => {
    // Reset store between tests
    useGameStore.setState({
      route: 'start',
      currentPresentation: null,
      debriefingPresentation: null,
      endingName: null,
      currentBeat: null,
      isProcessing: false,
      persistenceWarning: null,
      contentError: null,
      sessionInvalidated: null,
    })
  })

  describe('setRoute', () => {
    it('updates the route', () => {
      useGameStore.getState().setRoute('playing')
      expect(useGameStore.getState().route).toBe('playing')
    })
  })

  describe('handleEngineEvent', () => {
    it('handles CASE_STARTED — sets presentation, clears errors', () => {
      const presentation = makePresentation()
      const event: EngineEvent = { type: 'CASE_STARTED', presentation }

      useGameStore.getState().handleEngineEvent(event)

      const state = useGameStore.getState()
      expect(state.currentPresentation).toEqual(presentation)
      expect(state.currentBeat).toBeNull()
      expect(state.isProcessing).toBe(false)
      expect(state.endingName).toBeNull()
      expect(state.debriefingPresentation).toBeNull()
      expect(state.contentError).toBeNull()
      expect(state.sessionInvalidated).toBeNull()
    })

    it('handles NODE_PRESENTED — updates presentation', () => {
      const presentation = makePresentation({ nodeId: 'node-2' })
      const event: EngineEvent = { type: 'NODE_PRESENTED', presentation }

      useGameStore.getState().handleEngineEvent(event)

      expect(useGameStore.getState().currentPresentation).toEqual(presentation)
      expect(useGameStore.getState().currentBeat).toBeNull()
    })

    it('handles CHOICE_CONFIRMATION_STARTED — sets isProcessing', () => {
      const event: EngineEvent = {
        type: 'CHOICE_CONFIRMATION_STARTED',
        nodeId: 'node-1',
        choiceId: 'choice-1',
      }

      useGameStore.getState().handleEngineEvent(event)

      expect(useGameStore.getState().isProcessing).toBe(true)
    })

    it('handles CHOICE_CONFIRMED — updates presentation and beat, clears processing', () => {
      // First set isProcessing
      useGameStore.setState({ isProcessing: true })

      const presentation = makePresentation({ nodeId: 'node-3' })
      const beat = { prose: 'Beat text' }
      const event: EngineEvent = { type: 'CHOICE_CONFIRMED', presentation, beat }

      useGameStore.getState().handleEngineEvent(event)

      const state = useGameStore.getState()
      expect(state.currentPresentation).toEqual(presentation)
      expect(state.currentBeat).toEqual(beat)
      expect(state.isProcessing).toBe(false)
    })

    it('handles CHOICE_CONFIRMED without beat — sets beat to null', () => {
      const presentation = makePresentation()
      const event: EngineEvent = { type: 'CHOICE_CONFIRMED', presentation }

      useGameStore.getState().handleEngineEvent(event)

      expect(useGameStore.getState().currentBeat).toBeNull()
    })

    it('handles CONTINUATION_COMPLETED — updates presentation if provided', () => {
      const oldPresentation = makePresentation({ nodeId: 'old' })
      useGameStore.setState({ currentPresentation: oldPresentation })

      const newPresentation = makePresentation({ nodeId: 'new' })
      const event: EngineEvent = { type: 'CONTINUATION_COMPLETED', presentation: newPresentation }

      useGameStore.getState().handleEngineEvent(event)

      expect(useGameStore.getState().currentPresentation).toEqual(newPresentation)
    })

    it('handles CONTINUATION_COMPLETED — keeps old presentation when none provided', () => {
      const oldPresentation = makePresentation({ nodeId: 'old' })
      useGameStore.setState({ currentPresentation: oldPresentation })

      const event: EngineEvent = { type: 'CONTINUATION_COMPLETED' }

      useGameStore.getState().handleEngineEvent(event)

      expect(useGameStore.getState().currentPresentation).toEqual(oldPresentation)
    })

    it('handles SESSION_RESTORED — sets presentation, clears errors', () => {
      useGameStore.setState({ contentError: 'old error', endingName: 'tragico' })

      const presentation = makePresentation({ nodeId: 'restored' })
      const event: EngineEvent = { type: 'SESSION_RESTORED', presentation }

      useGameStore.getState().handleEngineEvent(event)

      const state = useGameStore.getState()
      expect(state.currentPresentation).toEqual(presentation)
      expect(state.endingName).toBeNull()
      expect(state.debriefingPresentation).toBeNull()
      expect(state.contentError).toBeNull()
      expect(state.sessionInvalidated).toBeNull()
    })

    it('handles ENDING_RESOLVED — sets endingName', () => {
      const event: EngineEvent = {
        type: 'ENDING_RESOLVED',
        ending: { endingName: 'excelente' },
      }

      useGameStore.getState().handleEngineEvent(event)

      expect(useGameStore.getState().endingName).toBe('excelente')
    })

    it('handles DEBRIEFING_PRESENTED — sets debriefingPresentation', () => {
      const debriefing = { sections: [{ title: 'Desfecho', entries: [] }] }
      const event: EngineEvent = { type: 'DEBRIEFING_PRESENTED', debriefing }

      useGameStore.getState().handleEngineEvent(event)

      expect(useGameStore.getState().debriefingPresentation).toEqual(debriefing)
    })

    it('handles PERSISTENCE_WARNING — sets persistenceWarning', () => {
      const event: EngineEvent = {
        type: 'PERSISTENCE_WARNING',
        message: 'Storage full',
      }

      useGameStore.getState().handleEngineEvent(event)

      expect(useGameStore.getState().persistenceWarning).toBe('Storage full')
    })

    it('handles CONTENT_ERROR — sets contentError', () => {
      const event: EngineEvent = {
        type: 'CONTENT_ERROR',
        error: { code: 'ERR_001', message: 'Invalid node' },
      }

      useGameStore.getState().handleEngineEvent(event)

      expect(useGameStore.getState().contentError).toBe('Invalid node')
    })

    it('handles SESSION_INVALIDATED — sets sessionInvalidated', () => {
      const event: EngineEvent = {
        type: 'SESSION_INVALIDATED',
        reason: 'Version mismatch',
      }

      useGameStore.getState().handleEngineEvent(event)

      expect(useGameStore.getState().sessionInvalidated).toBe('Version mismatch')
    })
  })
})
