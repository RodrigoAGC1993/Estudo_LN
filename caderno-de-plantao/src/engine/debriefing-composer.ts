import type {
  DebriefingDefinition,
  DebriefingFragment,
  DebriefingPresentation,
  DebriefingSection,
  DebriefingEntryPresentation,
  StateMap,
} from '@domain/types'
import { evaluate } from './condition-evaluator'

/**
 * Mapeamento de seção → título de apresentação.
 */
const SECTION_TITLES: Record<DebriefingFragment['section'], string> = {
  desfecho: 'Seu desfecho',
  percepcao: 'O que você percebeu',
  risco: 'Onde o risco aumentou',
  protecao: 'O que protegeu o paciente',
  aprendizado: 'O que levar para o próximo plantão',
  revisao_clinica: 'Revisão clínica',
}

/**
 * Ordem canônica das seções no debriefing.
 */
const SECTION_ORDER: readonly DebriefingFragment['section'][] = [
  'desfecho',
  'percepcao',
  'risco',
  'protecao',
  'aprendizado',
  'revisao_clinica',
]

/** Limite máximo de fragmentos por seção (evita sobrecarga). */
const MAX_FRAGMENTS_PER_SECTION = 3

/** Aviso obrigatório de validação profissional para revisão clínica. */
const CLINICAL_REVIEW_DISCLAIMER =
  'Esta revisão clínica é opcional e sujeita a validação profissional.'

/**
 * Compõe o debriefing a partir da definição, fragmentos disponíveis,
 * escolhas confirmadas e estados finais da sessão.
 *
 * Algoritmo determinístico conforme Design §13.3:
 * 1. Inclui outcomeFragmentId na seção desfecho
 * 2. Para cada fragmento do pool (fragmentIds):
 *    a. Avalia condition contra estados finais
 *    b. Verifica sourceChoiceIds contra confirmedChoices
 *    c. Se ambos passam (ou ausentes), inclui na seção correspondente
 * 3. Ordena por priority (ascendente = maior precedência)
 * 4. Limite: máx 3 fragmentos por seção
 * 5. Deduplicação por id (mantém apenas o de maior prioridade — menor valor)
 * 6. Inclui closingFragmentId na seção aprendizado
 * 7. Inclui fragmento de revisão clínica (se presente) com aviso obrigatório
 * 8. Seção vazia → warning editorial
 */
export function composeDebriefing(
  debriefingDef: DebriefingDefinition,
  allFragments: ReadonlyArray<DebriefingFragment>,
  confirmedChoices: ReadonlyArray<{ choiceId: string }>,
  states: StateMap,
): DebriefingPresentation {
  const fragmentMap = new Map<string, DebriefingFragment>()
  for (const f of allFragments) {
    fragmentMap.set(f.id, f)
  }

  const confirmedChoiceIds = new Set(confirmedChoices.map((c) => c.choiceId))

  // Collect fragments per section
  const sectionFragments: Record<
    DebriefingFragment['section'],
    DebriefingFragment[]
  > = {
    desfecho: [],
    percepcao: [],
    risco: [],
    protecao: [],
    aprendizado: [],
    revisao_clinica: [],
  }

  // Step 1: Include outcome fragment in section desfecho
  const outcomeFragment = fragmentMap.get(debriefingDef.outcomeFragmentId)
  if (outcomeFragment) {
    sectionFragments.desfecho.push(outcomeFragment)
  }

  // Step 2: Evaluate pool fragments
  for (const fragmentId of debriefingDef.fragmentIds) {
    const fragment = fragmentMap.get(fragmentId)
    if (!fragment) continue

    // 2a: Evaluate condition against final states
    if (fragment.condition) {
      if (!evaluate(fragment.condition, states)) {
        continue
      }
    }

    // 2b: Check sourceChoiceIds against confirmedChoices
    if (fragment.sourceChoiceIds && fragment.sourceChoiceIds.length > 0) {
      const hasMatchingChoice = fragment.sourceChoiceIds.some((id) =>
        confirmedChoiceIds.has(id),
      )
      if (!hasMatchingChoice) {
        continue
      }
    }

    // 2c: Include in corresponding section
    sectionFragments[fragment.section].push(fragment)
  }

  // Step 6: Include closing fragment in section aprendizado
  const closingFragment = fragmentMap.get(debriefingDef.closingFragmentId)
  if (closingFragment) {
    sectionFragments.aprendizado.push(closingFragment)
  }

  // Step 7: Clinical review fragments get disclaimer appended
  // (they are already included from the pool evaluation in step 2)

  // Process each section: deduplicate, sort, limit
  const warnings: string[] = []
  const sections: DebriefingSection[] = []

  for (const sectionKey of SECTION_ORDER) {
    let fragments = sectionFragments[sectionKey]

    // Step 5: Deduplicate by id — keep only the one with lowest priority value (highest precedence)
    const deduped = new Map<string, DebriefingFragment>()
    for (const f of fragments) {
      const existing = deduped.get(f.id)
      if (!existing || f.priority < existing.priority) {
        deduped.set(f.id, f)
      }
    }
    fragments = Array.from(deduped.values())

    // Step 3: Order by priority ascending (lower number = higher precedence)
    fragments.sort((a, b) => a.priority - b.priority)

    // Step 4: Apply limit — max 3 fragments per section
    fragments = fragments.slice(0, MAX_FRAGMENTS_PER_SECTION)

    // Build entries
    const entries: DebriefingEntryPresentation[] = fragments.map((f) => {
      const entry: DebriefingEntryPresentation = {
        content: f.content,
      }
      if (f.analysisCategory) {
        entry.analysisCategory = f.analysisCategory
      }
      return entry
    })

    // Step 7: Append disclaimer to clinical review section entries
    if (sectionKey === 'revisao_clinica' && entries.length > 0) {
      // Add disclaimer as a separate entry at the end
      entries.push({ content: CLINICAL_REVIEW_DISCLAIMER })
    }

    // Step 8: Empty section warning
    if (entries.length === 0) {
      warnings.push(
        `Seção "${SECTION_TITLES[sectionKey]}" está vazia após avaliação dos fragmentos.`,
      )
    }

    sections.push({
      title: SECTION_TITLES[sectionKey],
      entries,
    })
  }

  return { sections, warnings }
}
