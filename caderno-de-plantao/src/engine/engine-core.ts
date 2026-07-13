/**
 * Engine Core — Command queue, event system, and internal state management.
 * Design §7, §4.9, §4.11
 *
 * Implements the NarrativeEngine interface with:
 * - Sequential command queue (one mutating command at a time)
 * - Subscribe/unsubscribe event pattern
 * - Internal mutable state tracking
 * - Persistence status monitoring
 * - Graceful disposal
 */

import type {
  NarrativeEngine,
  EngineEventListener,
  Unsubscribe,
  CaseFile,
  ActiveSessionSnapshot,
  ConfirmedChoice,
  StateMap,
  SessionRepository,
  EngineEvent,
  NodePresentation,
  BeatPresentation,
  HistoryPresentation,
  HistoryEntry,
  CurrentHistoryPosition,
  LastCompletionRecord,
} from '@domain/index'
import { buildNodePresentation } from './presentation-builder'

import { InvalidCommandError, ContentRuntimeError, IncompatibleSaveError } from '@domain/index'
import { applyEffects } from './effect-applicator'
import { resolveTransition } from './transition-resolver'
import { selectImmediateBeat, selectDeferredBeat } from './beat-selector'
import { resolveOutcome } from './outcome-resolver'
import { composeDebriefing } from './debriefing-composer'

type CommandThunk = () => Promise<void>

export class EngineCore implements NarrativeEngine {
  // === Internal state ===
  private currentNodeId: string | null = null
  private states: StateMap = {}
  private confirmedChoices: ConfirmedChoice[] = []
  private visitedNodes: string[] = []
  private sessionStatus: 'in_progress' | 'completed' | 'idle' = 'idle'
  private persistenceStatus: 'available' | 'degraded' = 'available'

  // === Case reference ===
  private caseFile: CaseFile | null = null

  // === Command queue ===
  private commandQueue: CommandThunk[] = []
  private isProcessing = false

  // === Event system ===
  private listeners: Set<EngineEventListener> = new Set()
  private disposed = false

  constructor(private readonly repository: SessionRepository) {
    this.persistenceStatus = repository.isAvailable() ? 'available' : 'degraded'
  }

  // === Public API — Mutating commands (enqueued) ===

  startCase(caseFile: CaseFile): Promise<void> {
    return this.enqueue(async () => {
      // 1. Store the caseFile reference
      this.caseFile = caseFile

      // 2. Initialize states from stateDefinitions
      const initialStates: StateMap = {}
      for (const stateDef of caseFile.states) {
        initialStates[stateDef.name] = stateDef.initialValue
      }
      this.states = initialStates

      // 3. Generate unique session ID
      const sessionId = crypto.randomUUID()

      // 4. Set currentNodeId to startNodeId
      this.currentNodeId = caseFile.startNodeId

      // 5. Set session status
      this.sessionStatus = 'in_progress'

      // 6. Clear confirmedChoices and visitedNodes, add startNodeId
      this.confirmedChoices = []
      this.visitedNodes = [caseFile.startNodeId]

      // 7. Build ActiveSessionSnapshot
      const snapshot: ActiveSessionSnapshot = {
        schemaVersion: caseFile.schemaVersion,
        caseId: caseFile.caseId,
        caseVersion: caseFile.caseVersion,
        sessionId,
        currentNodeId: caseFile.startNodeId,
        states: { ...this.states },
        confirmedChoices: [],
        visitedNodes: [caseFile.startNodeId],
        sessionStatus: 'in_progress',
        updatedAt: new Date().toISOString(),
      }

      // 8. Attempt persistence
      try {
        await this.repository.saveActiveSession(snapshot)
      } catch {
        // 9. If persistence fails, mark as degraded
        this.persistenceStatus = 'degraded'
      }

      // 10. Build NodePresentation from the start node
      const startNode = caseFile.nodes.find((n) => n.id === caseFile.startNodeId)
      if (!startNode) {
        throw new Error(`Start node "${caseFile.startNodeId}" not found in case file nodes`)
      }
      const presentation = buildNodePresentation(startNode, caseFile)

      // 11. Emit CASE_STARTED event
      this.emit({ type: 'CASE_STARTED', presentation })

      // Emit persistence warning if degraded
      if (this.persistenceStatus === 'degraded') {
        this.emit({
          type: 'PERSISTENCE_WARNING',
          message: 'Sessão não pôde ser salva. O progresso pode ser perdido.',
        })
      }
    })
  }

  restoreSession(snapshot: ActiveSessionSnapshot, caseFile: CaseFile): Promise<void> {
    return this.enqueue(async () => {
      // 1. Validate version compatibility
      if (snapshot.schemaVersion !== caseFile.schemaVersion) {
        throw new IncompatibleSaveError(
          `Schema version mismatch: save has "${snapshot.schemaVersion}", case requires "${caseFile.schemaVersion}"`,
          snapshot.schemaVersion,
          caseFile.schemaVersion,
        )
      }
      if (snapshot.caseVersion !== caseFile.caseVersion) {
        throw new IncompatibleSaveError(
          `Case version mismatch: save has "${snapshot.caseVersion}", case requires "${caseFile.caseVersion}"`,
          snapshot.caseVersion,
          caseFile.caseVersion,
        )
      }

      // 2. Store caseFile reference
      this.caseFile = caseFile

      // 3. Restore all internal state from snapshot (NO re-application of effects)
      this.states = snapshot.states
      this.confirmedChoices = snapshot.confirmedChoices
      this.visitedNodes = snapshot.visitedNodes
      this.currentNodeId = snapshot.currentNodeId
      this.sessionStatus = 'in_progress'

      // 4. Build NodePresentation for the current node
      const currentNode = caseFile.nodes.find((n) => n.id === snapshot.currentNodeId)
      if (!currentNode) {
        throw new Error(`Node "${snapshot.currentNodeId}" not found in case file`)
      }
      const presentation = buildNodePresentation(currentNode, caseFile)

      // 5. Emit SESSION_RESTORED event
      this.emit({ type: 'SESSION_RESTORED', presentation })
    })
  }

  confirmChoice(nodeId: string, choiceId: string): Promise<void> {
    return this.enqueue(async () => {
      // Step 0: Emit lock — BEFORE any validation
      this.emit({ type: 'CHOICE_CONFIRMATION_STARTED', nodeId, choiceId })

      // Step 1: Validate session active, nodeId, choice valid, idempotency
      if (this.sessionStatus !== 'in_progress') {
        throw new InvalidCommandError(
          'Sessão não está em progresso',
          'confirmChoice',
        )
      }

      // Idempotency check (before nodeId validation per §9.6)
      const existingConfirmation = this.confirmedChoices.find(
        (c) => c.nodeId === nodeId,
      )
      if (existingConfirmation) {
        if (existingConfirmation.choiceId === choiceId) {
          // Same nodeId + same choiceId already confirmed → idempotent no-op
          return
        }
        // Same nodeId + different choiceId → InvalidCommandError
        throw new InvalidCommandError(
          `Nó "${nodeId}" já confirmou escolha "${existingConfirmation.choiceId}", não pode confirmar "${choiceId}"`,
          'confirmChoice',
        )
      }

      if (nodeId !== this.currentNodeId) {
        throw new InvalidCommandError(
          `nodeId "${nodeId}" não corresponde ao nó atual "${this.currentNodeId}"`,
          'confirmChoice',
        )
      }

      const caseFile = this.caseFile!
      const currentNode = caseFile.nodes.find((n) => n.id === nodeId)
      if (!currentNode || currentNode.kind !== 'decision') {
        throw new InvalidCommandError(
          `Nó "${nodeId}" não é um nó de decisão válido`,
          'confirmChoice',
        )
      }

      const choice = currentNode.choices.find((c) => c.id === choiceId)
      if (!choice) {
        throw new InvalidCommandError(
          `Escolha "${choiceId}" não existe no nó "${nodeId}"`,
          'confirmChoice',
        )
      }

      // Step 2: Compute candidate state (immutable copy + apply effects)
      let candidateStates: StateMap
      try {
        candidateStates = applyEffects(this.states, choice.effects, caseFile.states)
      } catch (err) {
        // Step 3: Validate candidate — abort on violation
        if (err instanceof ContentRuntimeError) {
          this.emit({
            type: 'CONTENT_ERROR',
            error: {
              code: err.code,
              message: err.message,
              ...(err.location !== undefined ? { location: err.location } : {}),
            },
          })
          throw err
        }
        throw err
      }

      // Step 4: Resolve transition from choice
      const targetNodeId = resolveTransition(choice.transition, candidateStates)

      // Step 5: Select immediate beat (evaluate confianca_equipe band)
      const beat = selectImmediateBeat(
        caseFile.interpersonalBeats,
        nodeId,
        choiceId,
        candidateStates,
      )

      // Step 6: Build snapshot
      const newConfirmedChoice: ConfirmedChoice = {
        sequence: this.confirmedChoices.length + 1,
        nodeId,
        choiceId,
        confirmedAt: new Date().toISOString(),
      }

      const newVisitedNodes = [...this.visitedNodes, targetNodeId]

      const snapshot: ActiveSessionSnapshot = {
        schemaVersion: caseFile.schemaVersion,
        caseId: caseFile.caseId,
        caseVersion: caseFile.caseVersion,
        sessionId: `${caseFile.caseId}-session`,
        currentNodeId: targetNodeId,
        states: candidateStates,
        confirmedChoices: [...this.confirmedChoices, newConfirmedChoice],
        visitedNodes: newVisitedNodes,
        sessionStatus: 'in_progress',
        updatedAt: new Date().toISOString(),
      }

      // Step 7: Attempt persist
      let degraded = false
      try {
        await this.repository.saveActiveSession(snapshot)
      } catch {
        // Step 8: Mark degraded if persistence failed
        degraded = true
        this.persistenceStatus = 'degraded'
      }

      // Step 9: Commit in memory
      this.states = candidateStates
      this.currentNodeId = targetNodeId
      this.confirmedChoices = [...this.confirmedChoices, newConfirmedChoice]
      this.visitedNodes = newVisitedNodes

      // Step 10: Emit CHOICE_CONFIRMED with NodePresentation of target node + BeatPresentation if beat found
      const targetNode = caseFile.nodes.find((n) => n.id === targetNodeId)
      const presentation: NodePresentation = buildNodePresentation(targetNode!, caseFile)

      const beatPresentation: BeatPresentation | undefined = beat
        ? { prose: beat.prose }
        : undefined

      this.emit({
        type: 'CHOICE_CONFIRMED',
        presentation,
        ...(beatPresentation ? { beat: beatPresentation } : {}),
      })

      // Step 11: Emit PERSISTENCE_WARNING if degraded
      if (degraded) {
        this.emit({
          type: 'PERSISTENCE_WARNING',
          message: 'Não foi possível salvar sessão. Progresso pode ser perdido.',
        })
      }
    })
  }

  continueNarrative(nodeId: string): Promise<void> {
    return this.enqueue(async () => {
      // 1. VALIDATE_SESSION — session must be in_progress
      if (this.sessionStatus !== 'in_progress') {
        throw new InvalidCommandError(
          'Sessão não está em progresso',
          'continueNarrative',
        )
      }

      // 2. VALIDATE_NODE — nodeId must match currentNodeId
      if (nodeId !== this.currentNodeId) {
        throw new InvalidCommandError(
          `nodeId "${nodeId}" não corresponde ao nó atual "${this.currentNodeId}"`,
          'continueNarrative',
        )
      }

      const caseFile = this.caseFile!
      const currentNode = caseFile.nodes.find((n) => n.id === nodeId)
      if (!currentNode) {
        throw new InvalidCommandError(
          `Nó "${nodeId}" não encontrado no caso`,
          'continueNarrative',
        )
      }

      // 3. VALIDATE_KIND — must be ProgressionNode or EndingNode
      if (currentNode.kind !== 'progression' && currentNode.kind !== 'ending') {
        throw new InvalidCommandError(
          `Nó "${nodeId}" (kind="${currentNode.kind}") não suporta continuação. Apenas ProgressionNode ou EndingNode.`,
          'continueNarrative',
        )
      }

      // 4. PRESERVE_STATES — no effects applied (states remain unchanged)
      const currentStates = { ...this.states }

      // 5. RESOLVE_DEST — determine destination based on node type
      let destinationNodeId: string
      let endingResolved = false
      let debriefingPresented = false
      let resolvedEndingName: string | undefined
      let debriefingPresentation: { sections: { title: string; entries: { content: string; analysisCategory?: string }[] }[]; warnings: string[] } | undefined

      if (currentNode.kind === 'progression') {
        // Resolve transition from ProgressionNode
        const targetNodeId = resolveTransition(currentNode.transition, currentStates)
        const targetNode = caseFile.nodes.find((n) => n.id === targetNodeId)

        if (!targetNode) {
          throw new ContentRuntimeError(
            `Nó destino "${targetNodeId}" não encontrado`,
            'NODE_NOT_FOUND',
            'continueNarrative',
          )
        }

        if (targetNode.kind === 'outcome_resolution') {
          // Case B: ProgressionNode → OutcomeResolutionNode → EndingNode
          const resolvedEnding = resolveOutcome(currentStates, caseFile.endings)
          const endingNode = caseFile.nodes.find(
            (n) => n.kind === 'ending' && n.endingId === resolvedEnding.id,
          )

          if (!endingNode) {
            throw new ContentRuntimeError(
              `EndingNode para endingId "${resolvedEnding.id}" não encontrado`,
              'ENDING_NODE_NOT_FOUND',
              'continueNarrative',
            )
          }

          destinationNodeId = endingNode.id
          endingResolved = true
          resolvedEndingName = resolvedEnding.name
        } else {
          // Case A/D: ProgressionNode → presentable destination
          destinationNodeId = targetNodeId
        }
      } else {
        // Case C: EndingNode → DebriefingNode
        const endingNode = currentNode as { kind: 'ending'; id: string; endingId: string; nextNodeId: string; presentationMetadata: { title: string }; continuationAction: { label: string } }
        const debriefingNodeId = endingNode.nextNodeId
        const debriefingNode = caseFile.nodes.find((n) => n.id === debriefingNodeId)

        if (!debriefingNode || debriefingNode.kind !== 'debriefing') {
          throw new ContentRuntimeError(
            `DebriefingNode "${debriefingNodeId}" não encontrado ou tipo inválido`,
            'DEBRIEFING_NOT_FOUND',
            'continueNarrative',
          )
        }

        destinationNodeId = debriefingNodeId

        // Compose debriefing
        const debriefingDef = caseFile.debriefings.find(
          (d) => d.id === debriefingNode.debriefingId,
        )

        if (!debriefingDef) {
          throw new ContentRuntimeError(
            `DebriefingDefinition "${debriefingNode.debriefingId}" não encontrada`,
            'DEBRIEFING_DEF_NOT_FOUND',
            'continueNarrative',
          )
        }

        debriefingPresentation = composeDebriefing(
          debriefingDef,
          caseFile.debriefingFragments,
          this.confirmedChoices,
          currentStates,
        )

        debriefingPresented = true

        // Mark session completed
        this.sessionStatus = 'completed'
      }

      // Check for deferred beats at destination (before adding to visitedNodes)
      const deferredBeat = selectDeferredBeat(
        caseFile.interpersonalBeats,
        destinationNodeId,
        this.confirmedChoices,
        this.visitedNodes,
        currentStates,
      )

      // 6. UPDATE_NODE — set currentNodeId to destination
      this.currentNodeId = destinationNodeId

      // 7. UPDATE_VISITED — push destination to visitedNodes (only presentable nodes)
      // OutcomeResolutionNode is never added
      const destNode = caseFile.nodes.find((n) => n.id === destinationNodeId)
      if (destNode && destNode.kind !== 'outcome_resolution') {
        this.visitedNodes = [...this.visitedNodes, destinationNodeId]
      }

      // 8. BUILD_SNAPSHOT
      const snapshot: ActiveSessionSnapshot = {
        schemaVersion: caseFile.schemaVersion,
        caseId: caseFile.caseId,
        caseVersion: caseFile.caseVersion,
        sessionId: `${caseFile.caseId}-session`,
        currentNodeId: destinationNodeId,
        states: currentStates,
        confirmedChoices: [...this.confirmedChoices],
        visitedNodes: [...this.visitedNodes],
        sessionStatus: this.sessionStatus === 'completed' ? 'completed' : 'in_progress',
        updatedAt: new Date().toISOString(),
      }

      // 9. ATTEMPT_PERSIST
      let degraded = false
      if (debriefingPresented) {
        // Case C: save completion record, then delete active session
        const endingNode = currentNode as { kind: 'ending'; endingId: string }
        const completionRecord: LastCompletionRecord = {
          schemaVersion: caseFile.schemaVersion,
          caseId: caseFile.caseId,
          caseVersion: caseFile.caseVersion,
          endingId: endingNode.endingId,
          completedAt: new Date().toISOString(),
        }

        try {
          await this.repository.saveLastCompletion(completionRecord)
        } catch {
          degraded = true
        }

        try {
          await this.repository.deleteActiveSession(caseFile.caseId)
        } catch {
          degraded = true
        }
      } else {
        try {
          await this.repository.saveActiveSession(snapshot)
        } catch {
          degraded = true
        }
      }

      // 10. MARK_DEGRADED if persistence failed
      if (degraded) {
        this.persistenceStatus = 'degraded'
      }

      // 11. COMMIT_IN_MEMORY — already done via direct state mutations above

      // 12. EMIT events
      if (debriefingPresented) {
        // Case C: CONTINUATION_COMPLETED (no presentation) + DEBRIEFING_PRESENTED
        this.emit({
          type: 'CONTINUATION_COMPLETED',
        })
        this.emit({
          type: 'DEBRIEFING_PRESENTED',
          debriefing: {
            sections: debriefingPresentation!.sections.map((s) => ({
              title: s.title,
              entries: s.entries.map((e) => ({
                content: e.content,
                ...(e.analysisCategory ? { analysisCategory: e.analysisCategory } : {}),
              })),
            })),
          },
        })
      } else {
        // Case A/D or B: CONTINUATION_COMPLETED with NodePresentation
        const destNodeForPresentation = caseFile.nodes.find((n) => n.id === destinationNodeId)!
        const presentation = buildNodePresentation(destNodeForPresentation, caseFile)

        const beatPresentation: BeatPresentation | undefined = deferredBeat
          ? { prose: deferredBeat.prose }
          : undefined

        this.emit({
          type: 'CONTINUATION_COMPLETED',
          presentation,
          ...(beatPresentation ? { beat: beatPresentation } : {}),
        })

        if (endingResolved) {
          // Case B: also emit ENDING_RESOLVED
          this.emit({
            type: 'ENDING_RESOLVED',
            ending: { endingName: resolvedEndingName! as 'tragico' | 'grave' | 'excelente' | 'bom' },
          })
        }
      }

      // 13. EMIT PERSISTENCE_WARNING if degraded
      if (degraded) {
        this.emit({
          type: 'PERSISTENCE_WARNING',
          message: 'Não foi possível salvar sessão. Progresso pode ser perdido.',
        })
      }
    })
  }

  restartCase(): Promise<void> {
    return this.enqueue(async () => {
      // 1. Verify a caseFile is loaded
      if (!this.caseFile) {
        throw new InvalidCommandError(
          'Nenhum caso carregado para reiniciar',
          'restartCase',
        )
      }

      const caseFile = this.caseFile

      // 2. Delete active session from repository
      try {
        await this.repository.deleteActiveSession(caseFile.caseId)
      } catch {
        // If deletion fails, we still proceed with restart
        this.persistenceStatus = 'degraded'
      }

      // 3. Reset internal state and start fresh (inline startCase logic)
      const initialStates: StateMap = {}
      for (const stateDef of caseFile.states) {
        initialStates[stateDef.name] = stateDef.initialValue
      }
      this.states = initialStates

      this.currentNodeId = caseFile.startNodeId
      this.sessionStatus = 'in_progress'
      this.confirmedChoices = []
      this.visitedNodes = [caseFile.startNodeId]

      // Build and persist new session snapshot
      const snapshot: ActiveSessionSnapshot = {
        schemaVersion: caseFile.schemaVersion,
        caseId: caseFile.caseId,
        caseVersion: caseFile.caseVersion,
        sessionId: crypto.randomUUID(),
        currentNodeId: caseFile.startNodeId,
        states: { ...this.states },
        confirmedChoices: [],
        visitedNodes: [caseFile.startNodeId],
        sessionStatus: 'in_progress',
        updatedAt: new Date().toISOString(),
      }

      try {
        await this.repository.saveActiveSession(snapshot)
      } catch {
        this.persistenceStatus = 'degraded'
      }

      // Build presentation for start node
      const startNode = caseFile.nodes.find((n) => n.id === caseFile.startNodeId)
      if (!startNode) {
        throw new Error(`Start node "${caseFile.startNodeId}" not found in case file nodes`)
      }
      const presentation = buildNodePresentation(startNode, caseFile)

      // Emit CASE_STARTED event
      this.emit({ type: 'CASE_STARTED', presentation })

      if (this.persistenceStatus === 'degraded') {
        this.emit({
          type: 'PERSISTENCE_WARNING',
          message: 'Sessão não pôde ser salva. O progresso pode ser perdido.',
        })
      }
    })
  }

  // === Public API — Synchronous reads (do not enter the queue) ===

  getHistoryPresentation(): HistoryPresentation {
    if (!this.caseFile || !this.currentNodeId) {
      return {
        entries: [],
        currentPosition: {
          nodeId: '',
          status: 'in_progress',
        },
      }
    }

    const caseFile = this.caseFile

    // Build entries from visited nodes, excluding OutcomeResolutionNode and the current node
    const entries = this.visitedNodes
      .filter((nodeId) => {
        const node = caseFile.nodes.find((n) => n.id === nodeId)
        return node && node.kind !== 'outcome_resolution'
      })
      .filter((nodeId) => nodeId !== this.currentNodeId)
      .map((nodeId) => {
        const node = caseFile.nodes.find((n) => n.id === nodeId)!
        const entry: HistoryEntry = {
          nodeId,
        }

        // Use presentationMetadata.title if available
        if ('presentationMetadata' in node && node.presentationMetadata) {
          const meta = node.presentationMetadata as { title?: string; narrativeTime?: string }
          if (meta.title) {
            entry.title = meta.title
          }
          if (meta.narrativeTime) {
            entry.narrativeTime = meta.narrativeTime
          }
        }

        // If this was a decision node and a choice was confirmed there, include the choice label
        if (node.kind === 'decision') {
          const confirmedChoice = this.confirmedChoices.find((c) => c.nodeId === nodeId)
          if (confirmedChoice) {
            const choiceDef = node.choices.find((ch) => ch.id === confirmedChoice.choiceId)
            if (choiceDef) {
              entry.choiceLabel = choiceDef.label
            }
            entry.sequence = confirmedChoice.sequence
          }
        }

        return entry
      })

    // Build currentPosition from the current node
    const currentNode = caseFile.nodes.find((n) => n.id === this.currentNodeId)
    const currentPosition: CurrentHistoryPosition = {
      nodeId: this.currentNodeId,
      status: this.sessionStatus === 'completed' ? 'completed' : 'in_progress',
    }

    if (currentNode && 'presentationMetadata' in currentNode && currentNode.presentationMetadata) {
      const meta = currentNode.presentationMetadata as { title?: string; narrativeTime?: string }
      if (meta.title) {
        currentPosition.title = meta.title
      }
      if (meta.narrativeTime) {
        currentPosition.narrativeTime = meta.narrativeTime
      }
    }

    return { entries, currentPosition }
  }

  getCurrentPresentation(): NodePresentation {
    if (!this.caseFile || !this.currentNodeId) {
      return {
        nodeId: this.currentNodeId ?? '',
        prose: '',
        presentationMetadata: { title: '' },
        nodeKind: 'progression',
      }
    }
    const currentNode = this.caseFile.nodes.find((n) => n.id === this.currentNodeId)
    if (!currentNode) {
      return {
        nodeId: this.currentNodeId,
        prose: '',
        presentationMetadata: { title: '' },
        nodeKind: 'progression',
      }
    }
    return buildNodePresentation(currentNode, this.caseFile)
  }

  // === Public API — Event system ===

  subscribe(listener: EngineEventListener): Unsubscribe {
    if (this.disposed) {
      return () => {}
    }
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  // === Public API — Lifecycle ===

  dispose(): void {
    this.disposed = true
    this.listeners.clear()
    this.commandQueue = []
    this.isProcessing = false
  }

  // === Internal — Command queue mechanism ===

  private enqueue(thunk: CommandThunk): Promise<void> {
    if (this.disposed) {
      return Promise.resolve()
    }

    return new Promise<void>((resolve, reject) => {
      const wrappedThunk: CommandThunk = async () => {
        try {
          await thunk()
          resolve()
        } catch (err) {
          reject(err)
        }
      }
      this.commandQueue.push(wrappedThunk)
      void this.processQueue()
    })
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return
    }
    this.isProcessing = true

    while (this.commandQueue.length > 0) {
      const next = this.commandQueue.shift()!
      try {
        await next()
      } catch {
        // Errors are propagated via the wrappedThunk's reject.
        // Queue processing continues for remaining commands.
      }
    }

    this.isProcessing = false
  }

  // === Internal — Event emission ===

  protected emit(event: EngineEvent): void {
    if (this.disposed) {
      return
    }
    for (const listener of this.listeners) {
      listener(event)
    }
  }

  // === Internal — State accessors (for subclass/future tasks) ===

  protected getStates(): StateMap {
    return this.states
  }

  protected setStates(states: StateMap): void {
    this.states = states
  }

  protected getCurrentNodeId(): string | null {
    return this.currentNodeId
  }

  protected setCurrentNodeId(nodeId: string): void {
    this.currentNodeId = nodeId
  }

  protected getConfirmedChoices(): ConfirmedChoice[] {
    return this.confirmedChoices
  }

  protected setConfirmedChoices(choices: ConfirmedChoice[]): void {
    this.confirmedChoices = choices
  }

  protected getVisitedNodes(): string[] {
    return this.visitedNodes
  }

  protected setVisitedNodes(nodes: string[]): void {
    this.visitedNodes = nodes
  }

  protected getSessionStatus(): 'in_progress' | 'completed' | 'idle' {
    return this.sessionStatus
  }

  protected setSessionStatus(status: 'in_progress' | 'completed' | 'idle'): void {
    this.sessionStatus = status
  }

  protected getPersistenceStatus(): 'available' | 'degraded' {
    return this.persistenceStatus
  }

  protected setPersistenceStatus(status: 'available' | 'degraded'): void {
    this.persistenceStatus = status
  }

  protected getCaseFile(): CaseFile | null {
    return this.caseFile
  }

  protected setCaseFile(caseFile: CaseFile): void {
    this.caseFile = caseFile
  }

  protected getRepository(): SessionRepository {
    return this.repository
  }

  protected isDisposed(): boolean {
    return this.disposed
  }
}
