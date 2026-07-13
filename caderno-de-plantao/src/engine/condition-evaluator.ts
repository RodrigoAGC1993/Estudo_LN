import type { ConditionExpression, StateMap } from '@domain/types'

/**
 * Avalia uma expressão de condição contra um mapa de estados.
 *
 * Função pura e determinística — mesma condição + mesmos estados = mesmo resultado.
 * Sem eval(), sem Function(), sem template literals. Interpretação declarativa pura.
 *
 * @param condition - Expressão de condição (discriminated union recursiva)
 * @param states - Mapa de estados invisíveis da sessão
 * @returns boolean indicando se a condição é satisfeita
 */
export function evaluate(
  condition: ConditionExpression,
  states: StateMap,
): boolean {
  switch (condition.op) {
    case 'eq':
      return states[condition.state] === condition.value

    case 'neq':
      return states[condition.state] !== condition.value

    case 'gt':
      return (states[condition.state] as number) > condition.value

    case 'gte':
      return (states[condition.state] as number) >= condition.value

    case 'lt':
      return (states[condition.state] as number) < condition.value

    case 'lte':
      return (states[condition.state] as number) <= condition.value

    case 'isNull':
      return states[condition.state] === null

    case 'isNotNull':
      return states[condition.state] !== null

    case 'and':
      return condition.conditions.every((c) => evaluate(c, states))

    case 'or':
      return condition.conditions.some((c) => evaluate(c, states))

    case 'not':
      return !evaluate(condition.condition, states)
  }
}
