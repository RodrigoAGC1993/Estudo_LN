import type { StateMap, StateEffect, StateDefinition } from '@domain/index'
import { ContentRuntimeError } from '@domain/index'

/**
 * Aplica uma lista de efeitos sobre um mapa de estados, retornando um NOVO mapa (copy-on-write).
 *
 * Função pura e determinística — mesmos estados + mesmos efeitos = mesmo resultado.
 * Nunca muta o mapa de entrada.
 *
 * Validações:
 * - amount > 0 para increment/decrement
 * - Compatibilidade de tipo (increment/decrement apenas em integer)
 * - Domínio [minimum, maximum] para integers — sem clamping
 * - Valor de set compatível com tipo do estado
 * - Valor de set para enum deve estar em enumValues[]
 *
 * @param states - Mapa de estados atual (não será mutado)
 * @param effects - Lista de efeitos a aplicar em ordem
 * @param stateDefinitions - Definições dos estados (tipos e domínios)
 * @returns Novo mapa de estados com efeitos aplicados
 * @throws ContentRuntimeError em violação de domínio ou incompatibilidade de tipo
 */
export function applyEffects(
  states: StateMap,
  effects: ReadonlyArray<StateEffect>,
  stateDefinitions: ReadonlyArray<StateDefinition>,
): StateMap {
  // Copy-on-write: create shallow copy
  const result: StateMap = { ...states }

  // Build lookup for state definitions by name
  const defByName = new Map<string, StateDefinition>()
  for (const def of stateDefinitions) {
    defByName.set(def.name, def)
  }

  for (const effect of effects) {
    const def = defByName.get(effect.target)
    if (!def) {
      throw new ContentRuntimeError(
        `Estado não declarado: "${effect.target}"`,
        'UNDECLARED_STATE',
        `effect.target="${effect.target}"`,
      )
    }

    switch (effect.operation) {
      case 'set':
        applySet(result, effect, def)
        break
      case 'increment':
        applyIncrement(result, effect, def)
        break
      case 'decrement':
        applyDecrement(result, effect, def)
        break
    }
  }

  return result
}

function applySet(result: StateMap, effect: StateEffect, def: StateDefinition): void {
  const { target, value } = effect

  switch (def.type) {
    case 'integer': {
      if (typeof value !== 'number') {
        throw new ContentRuntimeError(
          `Tipo incompatível: set em estado integer "${target}" requer valor numérico, recebeu ${typeof value}`,
          'TYPE_MISMATCH',
          `effect.target="${target}"`,
        )
      }
      validateIntegerBounds(value, def, target)
      result[target] = value
      break
    }
    case 'boolean': {
      if (typeof value !== 'boolean') {
        throw new ContentRuntimeError(
          `Tipo incompatível: set em estado boolean "${target}" requer valor booleano, recebeu ${typeof value}`,
          'TYPE_MISMATCH',
          `effect.target="${target}"`,
        )
      }
      result[target] = value
      break
    }
    case 'enum': {
      if (typeof value !== 'string') {
        throw new ContentRuntimeError(
          `Tipo incompatível: set em estado enum "${target}" requer valor string, recebeu ${typeof value}`,
          'TYPE_MISMATCH',
          `effect.target="${target}"`,
        )
      }
      if (!def.enumValues || !def.enumValues.includes(value)) {
        throw new ContentRuntimeError(
          `Valor inválido para enum "${target}": "${value}" não está em [${def.enumValues?.join(', ') ?? ''}]`,
          'INVALID_ENUM_VALUE',
          `effect.target="${target}"`,
        )
      }
      result[target] = value
      break
    }
    case 'nullable_boolean': {
      if (value !== null && typeof value !== 'boolean') {
        throw new ContentRuntimeError(
          `Tipo incompatível: set em estado nullable_boolean "${target}" requer booleano ou null, recebeu ${typeof value}`,
          'TYPE_MISMATCH',
          `effect.target="${target}"`,
        )
      }
      result[target] = value
      break
    }
  }
}

function applyIncrement(result: StateMap, effect: StateEffect, def: StateDefinition): void {
  const { target, amount } = effect

  if (def.type !== 'integer') {
    throw new ContentRuntimeError(
      `Operação incompatível: increment não é permitido em estado do tipo "${def.type}" ("${target}")`,
      'TYPE_MISMATCH',
      `effect.target="${target}"`,
    )
  }

  if (amount === undefined || amount <= 0) {
    throw new ContentRuntimeError(
      `Amount inválido para increment em "${target}": deve ser > 0, recebeu ${amount}`,
      'INVALID_AMOUNT',
      `effect.target="${target}"`,
    )
  }

  const current = result[target] as number
  const newValue = current + amount

  validateIntegerBounds(newValue, def, target)
  result[target] = newValue
}

function applyDecrement(result: StateMap, effect: StateEffect, def: StateDefinition): void {
  const { target, amount } = effect

  if (def.type !== 'integer') {
    throw new ContentRuntimeError(
      `Operação incompatível: decrement não é permitido em estado do tipo "${def.type}" ("${target}")`,
      'TYPE_MISMATCH',
      `effect.target="${target}"`,
    )
  }

  if (amount === undefined || amount <= 0) {
    throw new ContentRuntimeError(
      `Amount inválido para decrement em "${target}": deve ser > 0, recebeu ${amount}`,
      'INVALID_AMOUNT',
      `effect.target="${target}"`,
    )
  }

  const current = result[target] as number
  const newValue = current - amount

  validateIntegerBounds(newValue, def, target)
  result[target] = newValue
}

function validateIntegerBounds(value: number, def: StateDefinition, target: string): void {
  if (def.minimum !== undefined && value < def.minimum) {
    throw new ContentRuntimeError(
      `Violação de domínio: "${target}" = ${value} < minimum ${def.minimum}`,
      'DOMAIN_VIOLATION',
      `effect.target="${target}"`,
    )
  }
  if (def.maximum !== undefined && value > def.maximum) {
    throw new ContentRuntimeError(
      `Violação de domínio: "${target}" = ${value} > maximum ${def.maximum}`,
      'DOMAIN_VIOLATION',
      `effect.target="${target}"`,
    )
  }
}
