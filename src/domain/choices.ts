/**
 * Domain Types — Choices and Continuation Actions
 * Design §4.4
 *
 * Formal distinction: ChoiceDefinition applies effects and participates in
 * decisional history. ContinuationAction never applies effects and never
 * appears in debriefing.
 */

import type { StateEffect } from './effects.ts';
import type { TransitionDefinition } from './transitions.ts';

// === Escolha (aparece apenas em DecisionNode) ===

export interface ChoiceDefinition {
  id: string;
  label: string;
  accessibleLabel?: string;
  effects: StateEffect[];
  transition: TransitionDefinition;
}

// === Ação de Continuidade (aparece em ProgressionNode e EndingNode) ===

export interface ContinuationAction {
  label: string;
  accessibleLabel?: string;
  // SEM effects — por definição não altera estados
  // Destino: em ProgressionNode usa node.transition; em EndingNode usa node.nextNodeId
}
