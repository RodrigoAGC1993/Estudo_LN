/**
 * Domain Types — Effects and Conditions
 * Design §4.5
 *
 * StateEffect represents a single mutation to apply.
 * ConditionExpression is a recursive discriminated union for logical evaluation.
 */

// === Operações de Efeito ===

export type EffectOperation = 'set' | 'increment' | 'decrement';

// === Efeito sobre Estado ===

export interface StateEffect {
  target: string;
  operation: EffectOperation;
  value?: number | boolean | string | null;  // obrigatório para 'set'
  amount?: number;                           // obrigatório para increment/decrement; DEVE ser > 0
}

// === Expressões de Condição (recursive discriminated union) ===

export type ConditionExpression =
  | { op: 'eq'; state: string; value: number | boolean | string | null }
  | { op: 'neq'; state: string; value: number | boolean | string | null }
  | { op: 'gt'; state: string; value: number }
  | { op: 'gte'; state: string; value: number }
  | { op: 'lt'; state: string; value: number }
  | { op: 'lte'; state: string; value: number }
  | { op: 'isNull'; state: string }
  | { op: 'isNotNull'; state: string }
  | { op: 'and'; conditions: ConditionExpression[] }
  | { op: 'or'; conditions: ConditionExpression[] }
  | { op: 'not'; condition: ConditionExpression };
