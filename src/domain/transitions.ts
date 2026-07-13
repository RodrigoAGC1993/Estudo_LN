/**
 * Domain Types — Transitions
 * Design §4.3
 *
 * Transitions are self-contained: they belong to a choice (in DecisionNode)
 * or to a node (in ProgressionNode). There is no separate conditionalTransitions
 * or defaultNextNodeId at the node level.
 */

import type { ConditionExpression } from './effects.ts';

// === Transição (direct ou conditional) ===

export type TransitionDefinition =
  | { kind: 'direct'; targetNodeId: string }
  | { kind: 'conditional'; branches: ConditionalBranch[]; fallbackNodeId: string };

export interface ConditionalBranch {
  condition: ConditionExpression;
  targetNodeId: string;
  priority: number;  // menor = avaliado primeiro
}
