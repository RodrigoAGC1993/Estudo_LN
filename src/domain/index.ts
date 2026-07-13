/**
 * Domain Layer — Barrel Export
 *
 * Pure type definitions shared across all layers.
 * No implementations, no runtime code, no framework dependencies.
 */

// §4.1 — Case File, Metadata, States
export type {
  CaseFile,
  CaseMetadata,
  StateDefinition,
  StateType,
} from './case-file.ts';

// §4.2 — Narrative Nodes (discriminated union)
export type {
  NarrativeNode,
  DecisionNode,
  ProgressionNode,
  OutcomeResolutionNode,
  EndingNode,
  DebriefingNode,
  RequiredTitlePresentationMetadata,
  OptionalTitlePresentationMetadata,
  NarrativePresentationMetadata,
} from './narrative-nodes.ts';

// §4.3 — Transitions
export type {
  TransitionDefinition,
  ConditionalBranch,
} from './transitions.ts';

// §4.4 — Choices and Continuation Actions
export type {
  ChoiceDefinition,
  ContinuationAction,
} from './choices.ts';

// §4.5 — Effects and Conditions
export type {
  StateEffect,
  EffectOperation,
  ConditionExpression,
} from './effects.ts';

// §4.6 — Endings and Debriefing
export type {
  EndingDefinition,
  EndingName,
  DebriefingDefinition,
  DebriefingFragment,
  AnalysisCategory,
} from './endings.ts';

// §4.7 — Interpersonal Beats
export type { InterpersonalBeat } from './beats.ts';

// §4.8 — Session and Persistence
export type {
  ActiveSessionSnapshot,
  ConfirmedChoice,
  LastCompletionRecord,
  SessionRepository,
} from './session.ts';

// §4.9 — Narrative Engine API
export type {
  NarrativeEngine,
  EngineEventListener,
  Unsubscribe,
} from './engine-api.ts';

// §4.10 — Engine Events and Presentations
export type {
  EngineEvent,
  NodePresentation,
  OptionPresentation,
  BeatPresentation,
  EndingPresentation,
  DebriefingPresentation,
  DebriefingSection,
  DebriefingEntryPresentation,
  ContentError,
  EngineInternalState,
} from './engine-events.ts';

// History
export type {
  HistoryPresentation,
  HistoryEntry,
  CurrentHistoryPosition,
} from './history.ts';

// §4.12 — Validation
export type {
  ContentValidationResult,
  ContentValidationError,
  ContentValidationWarning,
} from './validation.ts';

// Preferences
export type {
  UserPreferences,
  ThemePreference,
} from './preferences.ts';

// Error classes (runtime values, not just types)
export {
  ContentRuntimeError,
  PersistenceError,
  IncompatibleSaveError,
  InvalidCommandError,
  UnexpectedEngineError,
} from './errors.ts';
