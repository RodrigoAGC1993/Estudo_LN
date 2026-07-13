import type { StateMap, EndingDefinition } from '@domain/types'
import { ContentRuntimeError } from '@domain/index'
import { evaluate } from './condition-evaluator'

/**
 * Resolve o desfecho da partida com base nos estados finais acumulados.
 *
 * Algoritmo (Design §11.1):
 * 1. Pré-verificação: se `acao_critica_a_tempo === null` → erro de conteúdo
 * 2. Ordena endings por `evaluationOrder` ascendente (Trágico=1 → Grave=2 → Excelente=3 → Bom=4)
 * 3. Avalia condições em ordem, retorna primeiro match
 * 4. Se nenhuma regra for satisfeita → erro de conteúdo
 *
 * @param states - Mapa de estados invisíveis da sessão no momento do cálculo
 * @param endings - Definições de desfecho do arquivo de caso
 * @returns O EndingDefinition cujas condições foram satisfeitas primeiro (por precedência)
 * @throws ContentRuntimeError se acao_critica_a_tempo for null ou nenhum desfecho satisfeito
 */
export function resolveOutcome(
  states: StateMap,
  endings: ReadonlyArray<EndingDefinition>,
): EndingDefinition {
  // Pré-verificação: estado crítico obrigatório não pode estar indefinido
  if (states['acao_critica_a_tempo'] === null || states['acao_critica_a_tempo'] === undefined) {
    throw new ContentRuntimeError(
      "Estado crítico 'acao_critica_a_tempo' indefinido",
      'CRITICAL_STATE_NULL',
      'outcome-resolver',
    )
  }

  // Ordena por evaluationOrder ascendente (1=Trágico, 2=Grave, 3=Excelente, 4=Bom)
  const sortedEndings = [...endings].sort((a, b) => a.evaluationOrder - b.evaluationOrder)

  // Avalia condições em ordem de precedência, retorna primeiro match
  for (const ending of sortedEndings) {
    if (evaluate(ending.condition, states)) {
      return ending
    }
  }

  // Nenhuma regra satisfeita — erro de conteúdo
  throw new ContentRuntimeError(
    'Nenhuma regra de desfecho satisfeita',
    'NO_ENDING_MATCHED',
    'outcome-resolver',
  )
}
