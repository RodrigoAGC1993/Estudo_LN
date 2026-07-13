/**
 * Application Bootstrap — Composition Root.
 *
 * This is the ONLY module that accesses SessionRepository directly.
 * It wires all dependencies: SessionRepository → Engine → UI store.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4
 * Design §16: Bootstrap sequence
 */

import { EngineCore } from '@engine'
import { LocalStorageSessionRepository } from '@persistence'
import { case01 } from '@content/index'
import { useGameStore } from '@ui/store'
import { setPlayingScreenEngine } from '@ui/screens/PlayingScreen'
import { navigateTo } from '@ui/hooks/use-hash-route'
import { initMultiTabDetection } from './multi-tab'

let engine: EngineCore | null = null

/**
 * Initialize the application composition root.
 * Creates all dependencies and wires subscriptions.
 * Called once from main.tsx before rendering.
 */
export function init(): void {
  const repository = new LocalStorageSessionRepository()
  engine = new EngineCore(repository)

  // Subscribe store to engine events + route navigation
  engine.subscribe((event) => {
    useGameStore.getState().handleEngineEvent(event)

    // Route navigation based on events
    if (
      event.type === 'CASE_STARTED' ||
      event.type === 'SESSION_RESTORED' ||
      event.type === 'CHOICE_CONFIRMED' ||
      event.type === 'CONTINUATION_COMPLETED'
    ) {
      navigateTo('playing')
    }
    if (event.type === 'ENDING_RESOLVED') {
      navigateTo('ending')
    }
    if (event.type === 'DEBRIEFING_PRESENTED') {
      navigateTo('debriefing')
    }
    if (event.type === 'CONTENT_ERROR' || event.type === 'SESSION_INVALIDATED') {
      navigateTo('error')
    }
  })

  // Wire engine accessor for PlayingScreen
  setPlayingScreenEngine(() => engine!)

  // Initialize multi-tab detection (ADR-15, Design §18.8)
  initMultiTabDetection(() => {
    useGameStore.getState().setMultiTabWarning(
      'O Caderno de Plantão pode estar aberto em outra aba. Alterações podem não ser sincronizadas.'
    )
  })
}

/**
 * Start a new case (Req 8.3: replaces saved session with new one).
 * Called from StartScreen "Iniciar" / "Nova partida" button.
 */
export async function handleStart(): Promise<void> {
  if (!engine) return
  await engine.startCase(case01)
}

/**
 * Resume an existing session from localStorage (Req 8.1, 8.2).
 * If the save is corrupted or incompatible, the engine will emit
 * SESSION_INVALIDATED and the UI navigates to error (Req 8.4).
 * Falls back to starting a new case if no save is found.
 */
export async function handleResume(): Promise<void> {
  if (!engine) return
  const repository = new LocalStorageSessionRepository()
  const snapshot = await repository.loadActiveSession(case01.caseId)
  if (snapshot) {
    try {
      await engine.restoreSession(snapshot, case01)
    } catch {
      // Incompatible or corrupted save — discard and inform user
      await repository.deleteActiveSession(case01.caseId)
      useGameStore.getState().handleEngineEvent({
        type: 'SESSION_INVALIDATED',
        reason:
          'A sessão salva é incompatível com a versão atual e foi descartada. Inicie uma nova partida.',
      })
      navigateTo('start')
    }
  } else {
    await engine.startCase(case01)
  }
}

/**
 * Restart the case from the beginning.
 * Called from DebriefingScreen "Iniciar nova partida" button.
 */
export async function handleRestart(): Promise<void> {
  if (!engine) return
  await engine.restartCase()
}

/**
 * Continue narrative from the current node.
 * Called from EndingScreen "Ver debriefing" button.
 */
export async function handleContinueNarrative(): Promise<void> {
  if (!engine) return
  const presentation = useGameStore.getState().currentPresentation
  if (presentation) {
    await engine.continueNarrative(presentation.nodeId)
  }
}

/** Save detection result for the StartScreen UI. */
export type SaveDetectionStatus =
  | { kind: 'loading' }
  | { kind: 'none' }
  | { kind: 'valid' }
  | { kind: 'incompatible'; message: string }
  | { kind: 'corrupted'; message: string }

/**
 * Check localStorage for an existing save and determine its status.
 * Encapsulates all SessionRepository access for the StartScreen.
 * (Req 8.1, 8.4)
 */
export async function checkSaveStatus(): Promise<SaveDetectionStatus> {
  const repository = new LocalStorageSessionRepository()
  const caseId = case01.caseId

  if (!repository.isAvailable()) {
    return { kind: 'none' }
  }

  const snapshot = await repository.loadActiveSession(caseId)

  if (snapshot === null) {
    return { kind: 'none' }
  }

  // Check schema version compatibility
  if (snapshot.schemaVersion !== case01.schemaVersion) {
    return {
      kind: 'incompatible',
      message: `A sessão salva foi criada com uma versão anterior do sistema (v${snapshot.schemaVersion}) e não é compatível com a versão atual (v${case01.schemaVersion}).`,
    }
  }

  // Check case version compatibility
  if (snapshot.caseVersion !== case01.caseVersion) {
    return {
      kind: 'incompatible',
      message: `A sessão salva foi criada com uma versão anterior do caso (v${snapshot.caseVersion}) e não é compatível com a versão atual (v${case01.caseVersion}).`,
    }
  }

  // Check session is in progress
  if (snapshot.sessionStatus !== 'in_progress') {
    return { kind: 'none' }
  }

  return { kind: 'valid' }
}
