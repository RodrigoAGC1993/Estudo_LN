/**
 * Domain / Contracts — Camada neutra de tipos compartilhados.
 * Nenhuma implementação, apenas definições.
 * Não depende de navegador, DOM, framework de UI ou mecanismo concreto de armazenamento.
 */
export type {
  AppVersion,
  StateValue,
  StateMap,
  StateType,
  StateDefinition,
  EffectOperation,
  StateEffect,
  ConditionExpression,
  EndingName,
  EndingDefinition,
  InterpersonalBeat,
  AnalysisCategory,
  DebriefingDefinition,
  DebriefingFragment,
  DebriefingPresentation,
  DebriefingSection,
  DebriefingEntryPresentation,
  TransitionDefinition,
  ConditionalBranch,
} from './types'

export type {
  NarrativeNode,
  DecisionNode,
  ProgressionNode,
  OutcomeResolutionNode,
  EndingNode,
  DebriefingNode,
  ChoiceDefinition,
  ContinuationAction,
  RequiredTitlePresentationMetadata,
  OptionalTitlePresentationMetadata,
  NarrativePresentationMetadata,
} from './narrative-nodes'

export type { CaseFile, CaseMetadata } from './case-file'

export type {
  ActiveSessionSnapshot,
  ConfirmedChoice,
  LastCompletionRecord,
  SessionRepository,
} from './session'

export type {
  NodePresentation,
  OptionPresentation,
  BeatPresentation,
  EndingPresentation,
  DebriefingScreenPresentation,
  DebriefingScreenSection,
  DebriefingScreenEntry,
  ContentError,
  EngineEvent,
  EngineInternalState,
} from './engine-events'

export type { HistoryPresentation, HistoryEntry, CurrentHistoryPosition } from './history'

export type { NarrativeEngine, EngineEventListener, Unsubscribe } from './engine-api'

export {
  ContentRuntimeError,
  PersistenceError,
  IncompatibleSaveError,
  InvalidCommandError,
  UnexpectedEngineError,
} from './errors'

export type {
  ContentValidationResult,
  ContentValidationError,
  ContentValidationWarning,
} from './validation'
