/**
 * Domain Types — Narrative Nodes (Discriminated Union)
 * Design §4.2
 */

import type { StateEffect, TransitionDefinition } from './types'

// === Metadados de apresentação dos nós ===

export interface RequiredTitlePresentationMetadata {
  title: string
  narrativeTime?: string
}

export interface OptionalTitlePresentationMetadata {
  title?: string
  narrativeTime?: string
}

export type NarrativePresentationMetadata =
  | RequiredTitlePresentationMetadata
  | OptionalTitlePresentationMetadata

// === Escolha e Ação de Continuidade ===

export interface ChoiceDefinition {
  id: string
  label: string
  accessibleLabel?: string
  effects: StateEffect[]
  transition: TransitionDefinition
}

export interface ContinuationAction {
  label: string
  accessibleLabel?: string
}

// === Nós Narrativos ===

export interface DecisionNode {
  kind: 'decision'
  id: string
  prose: string
  presentationMetadata: RequiredTitlePresentationMetadata
  choices: ChoiceDefinition[]
  interpersonalBeatIds: string[]
}

export interface ProgressionNode {
  kind: 'progression'
  id: string
  prose: string
  presentationMetadata: OptionalTitlePresentationMetadata
  continuationAction: ContinuationAction
  transition: TransitionDefinition
}

export interface OutcomeResolutionNode {
  kind: 'outcome_resolution'
  id: string
}

export interface EndingNode {
  kind: 'ending'
  id: string
  endingId: string
  presentationMetadata: RequiredTitlePresentationMetadata
  continuationAction: ContinuationAction
  nextNodeId: string
}

export interface DebriefingNode {
  kind: 'debriefing'
  id: string
  debriefingId: string
  presentationMetadata: RequiredTitlePresentationMetadata
}

export type NarrativeNode =
  | DecisionNode
  | ProgressionNode
  | OutcomeResolutionNode
  | EndingNode
  | DebriefingNode
