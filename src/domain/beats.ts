/**
 * Domain Types — Interpersonal Beats
 * Design §4.7
 *
 * Beats represent interpersonal consequences of decisions, presented as
 * narrative prose. They are bound to confidence bands and can be immediate
 * or deferred.
 */

import type { ConditionExpression } from './effects.ts';

export interface InterpersonalBeat {
  id: string;
  sourceNodeId: string;
  sourceChoiceIds?: string[];  // se presente, restringe ativação a essas escolhas
  band: 'negative' | 'neutral' | 'positive';
  bandCondition: ConditionExpression;
  timing: 'immediate' | 'deferred';
  prose: string;
  // Para beats diferidos:
  deferredActivationCondition?: ConditionExpression;
  eligibleNodeId?: string;
}
