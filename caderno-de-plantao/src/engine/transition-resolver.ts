import type { TransitionDefinition, StateMap } from '@domain/types'
import { evaluate } from './condition-evaluator'

/**
 * Resolve uma transição, retornando o nodeId de destino.
 *
 * - Para transições diretas: retorna targetNodeId imediatamente.
 * - Para transições condicionais: avalia branches em ordem de prioridade
 *   (menor priority = avaliado primeiro). Retorna o targetNodeId do primeiro
 *   branch cuja condição seja verdadeira. Se nenhum branch for satisfeito,
 *   retorna fallbackNodeId.
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4
 */
export function resolveTransition(
  transition: TransitionDefinition,
  states: StateMap,
): string {
  if (transition.kind === 'direct') {
    return transition.targetNodeId
  }

  // Ordena branches por prioridade ascendente (menor = avaliado primeiro)
  const sorted = [...transition.branches].sort((a, b) => a.priority - b.priority)

  for (const branch of sorted) {
    if (evaluate(branch.condition, states)) {
      return branch.targetNodeId
    }
  }

  return transition.fallbackNodeId
}
