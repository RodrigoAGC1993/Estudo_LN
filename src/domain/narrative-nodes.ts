/**
 * Domain Types — Narrative Nodes (Discriminated Union)
 * Design §4.2
 *
 * The `kind` field enables compile-time narrowing. Each variant exposes
 * only the fields relevant to that node type.
 */

import type { ChoiceDefinition, ContinuationAction } from './choices.ts';
import type { TransitionDefinition } from './transitions.ts';

// === Metadados de apresentação dos nós ===

export interface RequiredTitlePresentationMetadata {
  title: string;              // obrigatório — não pode ser vazio
  narrativeTime?: string;
}

export interface OptionalTitlePresentationMetadata {
  title?: string;
  narrativeTime?: string;
}

/** Alias para uso genérico */
export type NarrativePresentationMetadata =
  | RequiredTitlePresentationMetadata
  | OptionalTitlePresentationMetadata;

// === Nós Narrativos ===

export interface DecisionNode {
  kind: 'decision';
  id: string;
  prose: string;
  presentationMetadata: RequiredTitlePresentationMetadata;
  choices: ChoiceDefinition[];
  interpersonalBeatIds: string[];
}

export interface ProgressionNode {
  kind: 'progression';
  id: string;
  prose: string;
  presentationMetadata: OptionalTitlePresentationMetadata;
  continuationAction: ContinuationAction;
  transition: TransitionDefinition;
}

/**
 * Nó interno — NÃO apresentado ao jogador.
 * Não possui presentationMetadata porque nunca é renderizado nem aparece no histórico.
 * Dispara o OutcomeResolver e redireciona para o EndingNode correto.
 */
export interface OutcomeResolutionNode {
  kind: 'outcome_resolution';
  id: string;
}

/**
 * Referência a EndingDefinition — conteúdo NÃO é inline.
 * Possui continuationAction para o jogador avançar explicitamente ao debriefing.
 */
export interface EndingNode {
  kind: 'ending';
  id: string;
  endingId: string;
  presentationMetadata: RequiredTitlePresentationMetadata;
  continuationAction: ContinuationAction;
  nextNodeId: string;
}

/** Referência a DebriefingDefinition — conteúdo NÃO é inline. */
export interface DebriefingNode {
  kind: 'debriefing';
  id: string;
  debriefingId: string;
  presentationMetadata: RequiredTitlePresentationMetadata;
}

// === Discriminated Union ===

export type NarrativeNode =
  | DecisionNode
  | ProgressionNode
  | OutcomeResolutionNode
  | EndingNode
  | DebriefingNode;
