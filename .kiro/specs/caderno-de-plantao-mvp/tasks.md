# Implementation Plan: Caderno de Plantão MVP

## Overview

This plan implements the narrative engine MVP for "Caderno de Plantão" — Case 01 "As Balas" with Jéssica as playable character. The architecture follows 7 layers with unidirectional dependencies: Domain/Contracts → Content → Narrative Engine → Interface → Persistence → Validation → Application Composition. The stack is TypeScript + Preact + Vite + Zustand (ADR-16) + Vitest + fast-check, deployed as a static SPA on GitHub Pages with offline capability via Service Worker.

## Tasks

- [x] 1. Project setup and Domain/Contracts layer
  - [x] 1.1 Initialize project with Vite, TypeScript, Preact, and configure tooling
    - Initialize Vite project with Preact template
    - Configure TypeScript strict mode, path aliases for layers (`@domain`, `@engine`, `@ui`, `@persistence`, `@validation`, `@content`, `@composition`)
    - Install dependencies: preact, zustand (ADR-16), vite-plugin-pwa, vitest, fast-check, @testing-library/preact, axe-core
    - Configure Vitest with fast-check support
    - Set up directory structure per 7-layer architecture: `src/domain/`, `src/content/`, `src/engine/`, `src/ui/`, `src/persistence/`, `src/validation/`, `src/composition/`
    - Configure ESLint and Prettier
    - _Requirements: RNF-4.1, RNF-4.2_

  - [x] 1.2 Define all Domain types and interfaces
    - Implement `CaseFile`, `CaseMetadata`, `StateDefinition`, `StateType` interfaces
    - Implement discriminated union `NarrativeNode` with all 5 kinds: `DecisionNode`, `ProgressionNode`, `OutcomeResolutionNode`, `EndingNode`, `DebriefingNode`
    - Implement `ChoiceDefinition`, `ContinuationAction`, `TransitionDefinition`, `ConditionalBranch`
    - Implement `StateEffect`, `EffectOperation`, `ConditionExpression` (recursive discriminated union)
    - Implement `EndingDefinition`, `EndingName`, `DebriefingDefinition`, `DebriefingFragment`, `AnalysisCategory`
    - Implement `InterpersonalBeat` with timing, band, conditions
    - Implement `ActiveSessionSnapshot`, `ConfirmedChoice`, `LastCompletionRecord`
    - Implement `SessionRepository` interface (abstract contract)
    - Implement `NarrativeEngine` interface (public API)
    - Implement all `EngineEvent` types, `NodePresentation`, `OptionPresentation`, `BeatPresentation`, `EndingPresentation`, `DebriefingPresentation`
    - Implement `HistoryPresentation`, `HistoryEntry`, `CurrentHistoryPosition`
    - Implement `ContentValidationResult`, `ContentValidationError`, `ContentValidationWarning`
    - Implement `UserPreferences`, `ThemePreference`
    - Implement error types: `ContentRuntimeError`, `PersistenceError`, `IncompatibleSaveError`, `InvalidCommandError`, `UnexpectedEngineError`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

  - [ ]* 1.3 Write property tests for Domain types
    - **Property 9: Serialização round-trip de sessão**
    - **Validates: Requirements 7.1, 7.2, 7.5**

- [x] 2. Narrative Engine — Condition Evaluator and Effect Applicator
  - [x] 2.1 Implement the Condition Evaluator
    - Implement `evaluate(condition, states)` as a pure function
    - Support all 11 operators: eq, neq, gt, gte, lt, lte, isNull, isNotNull, and, or, not
    - Handle recursive condition composition (nested and/or/not)
    - No eval(), no Function(), no template literals — pure data interpretation
    - Return boolean deterministically
    - _Requirements: 4.1, 5.6, 3.4_

  - [ ]* 2.2 Write property test for Condition Evaluator
    - **Property 8: Avaliação de condições como função pura**
    - **Validates: Requirements 4.1, 5.6**

  - [x] 2.3 Implement the Effect Applicator
    - Implement `applyEffects(states, effects, stateDefinitions)` with copy-on-write
    - Support operations: set (all types), increment (integer only), decrement (integer only)
    - Validate domain bounds [minimum, maximum] for integers — NO clamping
    - Validate type compatibility (no increment on boolean, no numeric set on enum)
    - Validate amount > 0 for increment/decrement
    - Return new state map or throw domain violation error
    - _Requirements: 2.1, 3.2, 3.3, 3.7, 3.8_

  - [ ]* 2.4 Write property test for Effect Applicator — domain preservation
    - **Property 3: Preservação de domínio dos estados**
    - **Validates: Requirements 3.2, 3.6, 3.8**

- [x] 3. Narrative Engine — Outcome Resolver and Transition Resolver
  - [x] 3.1 Implement the Outcome Resolver
    - Implement `resolveOutcome(states, endings)` per §11.1 algorithm
    - Pre-check: if `acao_critica_a_tempo === null` → ContentRuntimeError
    - Sort endings by `evaluationOrder` (ascending: 1=Trágico, 2=Grave, 3=Excelente, 4=Bom)
    - Evaluate conditions in order, return first match
    - If no match → ContentRuntimeError ("Nenhuma regra de desfecho satisfeita")
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 12.4_

  - [ ]* 3.2 Write property tests for Outcome Resolver
    - **Property 4: Cobertura total de desfechos**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
    - **Property 10: Ordem de precedência dos desfechos**
    - **Validates: Requirements 5.1, 5.2, 12.4**

  - [x] 3.3 Implement the Transition Resolver
    - Implement `resolveTransition(transition, states)` supporting direct and conditional kinds
    - For conditional: evaluate branches in priority order (ascending), return first match target
    - Fallback to `fallbackNodeId` if no branch matches
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 3.4 Write unit tests for Transition Resolver
    - Test direct transitions
    - Test conditional transitions with multiple branches by priority
    - Test fallback when no branch is satisfied
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 4. Narrative Engine — Beat Selector and Debriefing Composer
  - [x] 4.1 Implement the Beat Selector
    - Implement immediate beat selection: evaluate `bandCondition` against post-effect states
    - Determine band from `confianca_equipe`: <= -1 negative, = 0 neutral, >= 1 positive
    - Filter beats by `sourceNodeId` and optional `sourceChoiceIds`
    - Implement deferred beat tracking: derive pending/consumed status from `confirmedChoices`, `visitedNodes`, and states
    - Evaluate `deferredActivationCondition` when reaching `eligibleNodeId`
    - Ensure no beat is presented twice (consumption tracking)
    - _Requirements: 1.9, 12.8_

  - [ ]* 4.2 Write unit tests for Beat Selector
    - Test selection by band (negative, neutral, positive)
    - Test immediate beat presentation with transition
    - Test deferred beat activation at eligible node
    - Test beat consumption prevents re-presentation
    - Test deferred beat derivation after session restore
    - _Requirements: 1.9, 12.8_

  - [x] 4.3 Implement the Debriefing Composer
    - Implement `composeDebriefing(debriefingDef, fragments, confirmedChoices, states)` per §13.3 algorithm
    - Include `outcomeFragmentId` in section `desfecho`
    - Evaluate each fragment's `condition` against final states
    - Check `sourceChoiceIds` against `confirmedChoices`
    - Order by `priority` within each section (ascending)
    - Apply limit: max 3 fragments per section
    - Deduplicate by `id`
    - Include `closingFragmentId` in section `aprendizado`
    - Include clinical review fragment when present, with mandatory disclaimer (aviso obrigatório de validação profissional)
    - Detect empty section after evaluation → emit editorial warning (non-blocking in draft, blocking in production)
    - Return `DebriefingPresentation` with sections and entries
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 4.4 Write property test for Debriefing Composer
    - **Property 11: Composição determinística do debriefing**
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [x] 5. Checkpoint — Ensure all engine core tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Narrative Engine — Core Engine with Command Queue
  - [x] 6.1 Implement Engine Core with command queue and event system
    - Implement command queue: enqueue mutating commands, process one at a time
    - Implement `subscribe(listener)` / `Unsubscribe` pattern
    - Implement internal state management: currentNodeId, states, confirmedChoices, visitedNodes, sessionStatus
    - Implement `dispose()` for cleanup
    - Implement `persistenceStatus` tracking (available/degraded)
    - _Requirements: 2.7, 2.8_

  - [ ]* 6.2 Write property test for command sequentiality
    - **Property 14: Sequencialidade de comandos**
    - **Validates: Requirements 2.7, 2.8**

  - [x] 6.3 Implement `startCase(caseFile)`
    - Validate case file schema (basic)
    - Initialize all states from `stateDefinitions[].initialValue`
    - Generate `sessionId` (UUID)
    - Set `currentNodeId` to `caseFile.startNodeId`
    - Build initial `ActiveSessionSnapshot`
    - Attempt persistence via `SessionRepository`
    - Emit `CASE_STARTED` with initial `NodePresentation`
    - _Requirements: 2.4, 2.5, 12.1_

  - [x] 6.4 Implement `confirmChoice(nodeId, choiceId)` — 11-step atomic confirmation
    - Step 0 (emit lock): Emit `CHOICE_CONFIRMATION_STARTED` with nodeId and choiceId — this precedes ALL validation and signals UI lock
    - Step 1: Validate session active, nodeId === currentNodeId, choice valid, not duplicate
    - Step 2: Compute candidate state (immutable copy + apply effects)
    - Step 3: Validate candidate (types, nullability, domains) — abort on violation
    - Step 4: Resolve transition from choice
    - Step 5: Select immediate beat (evaluate confianca_equipe band)
    - Step 6: Build snapshot
    - Step 7: Attempt persist
    - Step 8: Mark degraded if persistence failed
    - Step 9: Commit in memory
    - Step 10: Emit `CHOICE_CONFIRMED` with presentation + beat
    - Step 11: Emit `PERSISTENCE_WARNING` if degraded
    - Implement idempotency: same nodeId+choiceId already confirmed → no-op; different choiceId → InvalidCommandError
    - _Requirements: 1.8, 2.1, 2.7, 3.2, 3.7, 3.8_

  - [ ]* 6.5 Write property test for atomic confirmation
    - **Property 2: Atomicidade da confirmação de escolha**
    - **Validates: Requirements 1.8, 2.1, 2.7**

  - [x] 6.6 Implement `continueNarrative(nodeId)` — continuation algorithm
    - Validate session, nodeId, node kind (ProgressionNode or EndingNode only)
    - Preserve states (no effects)
    - Resolve destination per node type:
      - Common ProgressionNode → resolve transition → presentable destination
      - Consequence ProgressionNode → resolve transition → OutcomeResolutionNode → run OutcomeResolver → EndingNode
      - EndingNode → nextNodeId → DebriefingNode (compose debriefing, mark completed, save LastCompletionRecord, delete active session)
    - Handle deferred beats at destination
    - Persist, commit in memory, emit events per §9.7/§9.8
    - _Requirements: 2.3, 5.1, 6.1, 6.5_

  - [ ]* 6.7 Write property test for continuation immutability
    - **Property 7: Imutabilidade da Ação de Continuidade**
    - **Validates: Requirements 2.3, 1.2**

  - [x] 6.8 Implement `restoreSession(snapshot, caseFile)`
    - Validate schemaVersion and caseVersion compatibility
    - Restore states, confirmedChoices, visitedNodes, currentNodeId from snapshot
    - Re-derive deferred beat status from snapshot data
    - Position at currentNodeId
    - Emit `SESSION_RESTORED` with NodePresentation
    - NO re-application of effects
    - _Requirements: 7.5, 8.2_

  - [ ]* 6.9 Write property test for session restoration idempotency
    - **Property 5: Idempotência da restauração de sessão**
    - **Validates: Requirements 7.5, 8.2**

  - [x] 6.10 Implement `restartCase()` and `getHistoryPresentation()` / `getCurrentPresentation()`
    - `restartCase()`: reset session, delete active session from repo, start fresh
    - `getHistoryPresentation()`: synchronous, returns only visited nodes and confirmed choices with safe labels
    - `getCurrentPresentation()`: synchronous, returns current node presentation
    - Filter OutcomeResolutionNode from history
    - Use fallback label logic for unrevealed titles
    - _Requirements: 8.3, 9.6_

  - [ ]* 6.11 Write property tests for history non-prediction and state opacity
    - **Property 12: Não predição do histórico**
    - **Validates: Requirements 9.6**
    - **Property 6: Opacidade de estados para a UI**
    - **Validates: Requirements 3.1, 12.8**
    - **Property 15: Opacidade narrativa** (consolidada com Property 6 — ambas verificam ausência de estados brutos em eventos; P15 estende a verificação para incluir contextos de debriefing conforme Req 6.2)
    - **Validates: Requirements 3.1, 6.2**

- [x] 7. Checkpoint — Ensure all engine tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Persistence layer
  - [x] 8.1 Implement localStorage SessionRepository
    - Implement `SessionRepository` interface with localStorage adapter
    - Keys: `cdp_session_{caseId}` for active session, `cdp_completion_{caseId}` for last completion
    - Serialize/deserialize with JSON.stringify/JSON.parse
    - Validate snapshot fields on read (detect corruption)
    - Handle QuotaExceededError gracefully
    - Implement `isAvailable()` check
    - Implement version compatibility check (schemaVersion, caseVersion)
    - Handle corruption: discard + inform
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.4, RNF-3.1_

  - [ ]* 8.2 Write unit tests for SessionRepository
    - Test save and load round-trip
    - Test corruption detection and discard
    - Test version incompatibility handling
    - Test storage unavailable scenario
    - Test quota exceeded handling
    - _Requirements: 7.1, 7.2, 7.3, 7.6_

- [x] 9. Content layer — Case 01 JSON file
  - [x] 9.1 Create the Case 01 JSON data file (`case-01.json`)
    - Define all 6 states with domains per §5.2
    - Define all decision nodes for 4 scenes with minimum 3 choices each
    - Define progression nodes with continuation actions and transitions
    - Define OutcomeResolutionNode
    - Define 4 EndingNodes referencing EndingDefinitions
    - Define 4 DebriefingNodes referencing DebriefingDefinitions
    - Define all endings with conditions per §5.6 and §11.2
    - Define interpersonal beats for each decision node × 3 bands
    - Define debriefing fragments (placeholder content acceptable per lacunas B.*)
    - Define metadata, editorialReferences, provisional markers
    - Ensure graph structure: Cena 4 ALWAYS executed in all routes
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 1.1–1.9_

- [x] 10. Validation layer
  - [x] 10.1 Implement structural validator — 22+ criteria
    - Implement criterion 1: duplicate IDs (nodes, choices, states)
    - Implement criterion 2: unreachable nodes from startNodeId
    - Implement criterion 3: dead-end nodes that aren't endings
    - Implement criterion 4: choices without defined destination
    - Implement criterion 5: unauthorized cycles
    - Implement criterion 6: references to undeclared states
    - Implement criterion 7: effects incompatible with state type
    - Implement criterion 14: decision nodes with < 3 choices
    - Implement criterion 15: missing required metadata
    - Implement criterion 16: incompatible schema version
    - Implement criterion 21: beat interpessoal ausente em nó de decisão para alguma banda → editorial warning (draft) / blocking error (produção)
    - Implement criterion 22: conteúdo marcado como provisório presente em build de produção → editorial warning
    - Implement criteria 23-28: design-specific structural validations
    - Return `ContentValidationResult` with errors and warnings
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.14, 11.15, 11.16, 11.21, 11.22_

  - [x] 10.2 Implement domain and coverage validator
    - Implement criterion 8: effects sequence producing out-of-domain values
    - Implement criterion 9: contradictory conditions in ending rules
    - Implement criterion 10: unreachable endings
    - Implement criterion 11: paths without ending
    - Implement criterion 12: overlapping rules without priority resolution
    - Implement criterion 13: critical null state on path to outcome
    - Implement criterion 17: all valid sequences reach exactly one ending
    - Implement criterion 18: all 4 endings reachable by at least one sequence
    - Implement criterion 19: prioritized rule not made useless by lower priority
    - Implement criterion 20: ending condition depends on out-of-domain state
    - Implement route enumeration per §15.3 algorithm
    - _Requirements: 11.8, 11.9, 11.10, 11.11, 11.12, 11.13, 11.17, 11.18, 11.19, 11.20_

  - [ ]* 10.3 Write unit tests for validators
    - Test each criterion with valid and invalid case files
    - Test route enumeration produces correct count (~108 routes for Case 01)
    - Test all 4 endings are reachable
    - Test domain violations are caught
    - _Requirements: 11.1–11.22_

- [x] 11. Checkpoint — Validate Case 01 file passes all 22+ criteria
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. UI layer — Narrative Reader and core screens
  - [x] 12.1 Implement App shell, hash routing, and Zustand store (ADR-16)
    - Set up hash-based routing: `#/start`, `#/playing`, `#/history`, `#/ending`, `#/debriefing`, `#/error`
    - Implement Zustand store (ADR-16) bridging Engine events to UI state
    - Subscribe to Engine events and update store reactively
    - Implement theme system: CSS Custom Properties with `data-theme` attribute
    - Load preferences from `cdp_preferences` localStorage key
    - Implement `matchMedia` listener for system theme
    - _Requirements: RNF-2.1, RC-3.1, RC-3.2, RC-3.3, RC-3.4, RC-3.5_

  - [x] 12.2 Implement Start screen and Session Resume screen
    - Start screen: title, brief presentation, "Iniciar" button
    - Session Resume screen: offer "Retomar" or "Nova partida" when save exists
    - Handle IncompatibleSaveError with clear message
    - Handle corrupted saves with message and offer new game
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 12.3 Implement Narrative Reader — decision nodes with two-step confirmation
    - Render prose (first-person, light novel style)
    - Render choices as plain `<button>` elements (no color classification)
    - Implement two-step confirmation: select → highlight + show "Rever opções" / "Confirmar decisão"
    - Block controls during engine processing (prevent double-click, double-tap, key repeat)
    - Move focus to new content heading after transition (`tabindex="-1"`)
    - Announce "Decisão confirmada" via aria-live polite (short message only)
    - Integrate immediate beats as additional narrative prose
    - _Requirements: 2.4, 2.5, 2.6, 2.8, 2.9, RC-1.1, RC-1.2, RC-1.3, RC-1.4_

  - [x] 12.4 Implement Narrative Reader — progression nodes with continuation
    - Render prose content
    - Render "Continuar" button with accessible label
    - Optional: progressive reveal with `prefers-reduced-motion` respect
    - Block controls during transition
    - Move focus to new heading after advance
    - Integrate deferred beats as narrative prose
    - _Requirements: 2.3, 2.8, 2.9, 10.7_

  - [x] 12.5 Implement Ending screen and Debriefing screen
    - Ending screen: render ending prose via NodePresentation, show "Ver debriefing" continuation
    - Debriefing screen: render 6 structured sections with entries
    - Include clinical review disclaimer
    - Show "Iniciar nova partida" and "Voltar ao início" actions
    - Differentiate 8 analysis categories visually (without revealing mechanics)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 12.6_

  - [x] 12.6 Implement History panel
    - Desktop: collapsible side panel, closed by default
    - Mobile: overlay panel with contained focus, Escape to close, return focus on close
    - Render ordered list of visited scenes with `narrativeTime` and factual choice description
    - Show "Cena em andamento" for current unrevealed node
    - Never show future scenes, total count, or alternative endings
    - Navigable by heading/landmark
    - _Requirements: 9.6, RC-2.1, RC-2.2, RC-2.3, RC-2.4_

- [x] 13. UI layer — Accessibility and responsiveness
  - [x] 13.1 Implement full keyboard navigation and WCAG 2.1 AA compliance
    - Tab order: prose → choices → actions
    - Enter/Space to activate choices and continuations
    - Escape to close panels/modals
    - Visible focus outline on all interactive elements (never suppressed without substitute)
    - Contrast minimum 4.5:1 for text, 3:1 for large text and interactive elements
    - Touch targets minimum 44×44px
    - Color never sole indicator of meaning
    - `prefers-reduced-motion` disables animations, reveals content fully
    - Font base in `rem`, functional with 200% zoom at 320px minimum
    - Semantic HTML: `<section>`, `<article>`, `<button>`, `<h2>` with tabindex="-1"
    - aria-live polite for short messages only, assertive for critical errors only
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

  - [x] 13.2 Implement responsive layout (320px to desktop)
    - Reading-optimized layout with prose as central visual element
    - Fluid typography and spacing proportional to screen
    - No horizontal overflow at 320px with 200% zoom
    - Smooth transitions between nodes (SPA, no full page reload)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 13.3 Write accessibility tests
    - Run axe-core scan on each screen (start, playing, ending, debriefing, history, error)
    - Test full keyboard-only navigation
    - Test aria-live announcements after transitions
    - Test contrast ratios in both themes
    - Test zoom 200% without loss of functionality
    - _Requirements: 10.1–10.8_

- [x] 14. UI layer — Error screens and preferences
  - [x] 14.1 Implement error screens and persistence warnings
    - Recoverable error screen (persistence warning): discrete status indicator
    - Unrecoverable content error screen: message + "Iniciar nova partida"
    - Accessible error messages with `role="alert"`, focus moved to error
    - Save status indicator: "Salvando…", "Salvo", "Salvamento indisponível" with debounced aria-live
    - _Requirements: 3.7, 7.3, 8.4_

  - [x] 14.2 Implement theme selector and font scale preferences
    - Three modes: system (default), light, dark
    - Immediate theme change without reload
    - Persist in `cdp_preferences` (never mix with session snapshot)
    - Fallback to memory-only if localStorage unavailable
    - Font scale adjustment
    - _Requirements: RC-3.1, RC-3.2, RC-3.3, RC-3.4, RC-3.5, RC-4.1, RC-4.2_

  - [ ]* 14.3 Write property test for preferences isolation
    - **Property 13: Isolamento das preferências visuais**
    - **Validates: Requirements 3.1 (estados ocultos)**

- [x] 15. Checkpoint — Ensure UI renders correctly and all a11y tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Application Composition and offline capability
  - [x] 16.1 Implement Application Bootstrap (composition root)
    - Wire all dependencies: SessionRepository impl → Engine → UI store
    - Implement bootstrap sequence: check save → offer resume/new → start or restore
    - Handle all error cases during bootstrap (corrupted save, incompatible version)
    - Ensure only Bootstrap accesses SessionRepository directly (UI never does)
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 16.2 Implement Service Worker with Workbox for offline capability
    - Configure vite-plugin-pwa with precache manifest
    - Precache: index.html, JS bundle, CSS, case-01.json, fonts, manifest, icons
    - Cache strategies: network-first for index.html, cache-first for hashed assets
    - Implement update detection (`updatefound` event)
    - Show "Nova versão disponível. Atualizar?" notification
    - Handle skip-waiting with user confirmation
    - Ensure offline operation after first load
    - _Requirements: RNF-2.2_

  - [x] 16.3 Implement multi-tab detection
    - Use BroadcastChannel (fallback: storage event) to detect other tabs
    - Show warning: "O Caderno de Plantão pode estar aberto em outra aba"
    - Do NOT block second tab
    - Use sessionId and updatedAt to identify most recent update
    - _Requirements: (design §18.8)_

- [ ] 17. Integration tests — full flow
  - [ ]* 17.1 Write integration tests for complete Case 01 playthrough
    - Test full flow: start → 4 decision scenes → outcome resolution → ending → debriefing
    - Test save and restore mid-game
    - Test version incompatibility detection
    - Test behavior with storage unavailable
    - Test idempotency: reload at any point produces consistent state
    - _Requirements: 12.1–12.8, 7.1–7.6, 8.1–8.4_

  - [ ]* 17.2 Write property test for engine determinism
    - **Property 1: Determinismo do motor narrativo**
    - **Validates: Requirements 3.4, 5.6**

- [x] 18. Build pipeline and deployment
  - [x] 18.1 Configure Vite production build and GitHub Actions CI/CD
    - Configure base path for GitHub Pages
    - Set up GitHub Actions workflow: schema validation → content validation → route enumeration → unit tests → integration tests → a11y tests → static build → deploy
    - Configure production environment flag (NODE_ENV=production)
    - Ensure pipeline fails at any stage on blocking errors
    - Configure content hash filenames for cache busting
    - _Requirements: RNF-2.1, RNF-2.2_

  - [x] 18.2 Create validation CLI runner
    - CLI script that loads case-01.json, runs all 22+ validation criteria, reports results
    - Exit code 1 on blocking errors
    - Integrate into CI pipeline
    - _Requirements: 11.21, 11.22_

- [x] 19. Final checkpoint — Full regression
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Content lacunas (B.1, B.2, B.4, B.5) are handled with placeholder prose — the system architecture is fully functional with provisional content
- The case file (9.1) uses available prose from Rotas_As_Balas.md + placeholders where content is pending
- Validation (10.1, 10.2) runs at build time, never in production runtime
- Ajv is used only in tooling/build (criterion validation); runtime uses minimal snapshot validator

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "2.1", "2.3"] },
    { "id": 3, "tasks": ["2.2", "2.4", "3.1", "3.3"] },
    { "id": 4, "tasks": ["3.2", "3.4", "4.1", "4.3"] },
    { "id": 5, "tasks": ["4.2", "4.4", "6.1"] },
    { "id": 6, "tasks": ["6.2", "6.3", "6.4", "6.6", "6.8", "6.10"] },
    { "id": 7, "tasks": ["6.5", "6.7", "6.9", "6.11", "8.1"] },
    { "id": 8, "tasks": ["8.2", "9.1"] },
    { "id": 9, "tasks": ["10.1", "10.2"] },
    { "id": 10, "tasks": ["10.3", "12.1"] },
    { "id": 11, "tasks": ["12.2", "12.3", "12.4", "12.5", "12.6"] },
    { "id": 12, "tasks": ["13.1", "13.2", "14.1", "14.2"] },
    { "id": 13, "tasks": ["13.3", "14.3", "16.1"] },
    { "id": 14, "tasks": ["16.2", "16.3"] },
    { "id": 15, "tasks": ["17.1", "17.2"] },
    { "id": 16, "tasks": ["18.1", "18.2"] }
  ]
}
```
