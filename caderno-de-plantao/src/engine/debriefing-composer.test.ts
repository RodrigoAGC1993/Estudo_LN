import { describe, it, expect } from 'vitest'
import { composeDebriefing } from './debriefing-composer'
import type {
  DebriefingDefinition,
  DebriefingFragment,
  StateMap,
} from '@domain/types'

// === Helpers ===

function makeFragment(
  overrides: Partial<DebriefingFragment> & { id: string; section: DebriefingFragment['section'] },
): DebriefingFragment {
  return {
    priority: 1,
    content: `Content for ${overrides.id}`,
    ...overrides,
  }
}

function makeDebriefingDef(
  overrides?: Partial<DebriefingDefinition>,
): DebriefingDefinition {
  return {
    id: 'debrief-1',
    endingId: 'ending-tragico',
    outcomeFragmentId: 'frag-outcome',
    fragmentIds: [],
    closingFragmentId: 'frag-closing',
    ...overrides,
  }
}

// === Tests ===

describe('composeDebriefing', () => {
  describe('outcomeFragmentId in section desfecho', () => {
    it('includes outcome fragment in desfecho section', () => {
      const outcomeFragment = makeFragment({
        id: 'frag-outcome',
        section: 'desfecho',
        priority: 1,
        content: 'O paciente não sobreviveu.',
      })

      const closingFragment = makeFragment({
        id: 'frag-closing',
        section: 'aprendizado',
        priority: 1,
        content: 'Reflexão final.',
      })

      const def = makeDebriefingDef()
      const result = composeDebriefing(def, [outcomeFragment, closingFragment], [], {})

      const desfechoSection = result.sections.find((s) => s.title === 'Seu desfecho')
      expect(desfechoSection).toBeDefined()
      expect(desfechoSection!.entries).toHaveLength(1)
      expect(desfechoSection!.entries[0]!.content).toBe('O paciente não sobreviveu.')
    })
  })

  describe('condition evaluation against final states', () => {
    it('includes fragment when condition is satisfied', () => {
      const fragments: DebriefingFragment[] = [
        makeFragment({
          id: 'frag-outcome',
          section: 'desfecho',
          priority: 1,
          content: 'Outcome.',
        }),
        makeFragment({
          id: 'frag-closing',
          section: 'aprendizado',
          priority: 1,
          content: 'Closing.',
        }),
        makeFragment({
          id: 'frag-risco-1',
          section: 'risco',
          priority: 1,
          content: 'Risco identificado.',
          condition: { op: 'gte', state: 'tempo_atrasado', value: 2 },
        }),
      ]

      const def = makeDebriefingDef({ fragmentIds: ['frag-risco-1'] })
      const states: StateMap = { tempo_atrasado: 3 }

      const result = composeDebriefing(def, fragments, [], states)
      const riscoSection = result.sections.find((s) => s.title === 'Onde o risco aumentou')
      expect(riscoSection!.entries).toHaveLength(1)
      expect(riscoSection!.entries[0]!.content).toBe('Risco identificado.')
    })

    it('excludes fragment when condition is not satisfied', () => {
      const fragments: DebriefingFragment[] = [
        makeFragment({
          id: 'frag-outcome',
          section: 'desfecho',
          priority: 1,
          content: 'Outcome.',
        }),
        makeFragment({
          id: 'frag-closing',
          section: 'aprendizado',
          priority: 1,
          content: 'Closing.',
        }),
        makeFragment({
          id: 'frag-risco-1',
          section: 'risco',
          priority: 1,
          content: 'Risco identificado.',
          condition: { op: 'gte', state: 'tempo_atrasado', value: 2 },
        }),
      ]

      const def = makeDebriefingDef({ fragmentIds: ['frag-risco-1'] })
      const states: StateMap = { tempo_atrasado: 1 }

      const result = composeDebriefing(def, fragments, [], states)
      const riscoSection = result.sections.find((s) => s.title === 'Onde o risco aumentou')
      expect(riscoSection!.entries).toHaveLength(0)
    })

    it('includes fragment without condition (always included)', () => {
      const fragments: DebriefingFragment[] = [
        makeFragment({
          id: 'frag-outcome',
          section: 'desfecho',
          priority: 1,
          content: 'Outcome.',
        }),
        makeFragment({
          id: 'frag-closing',
          section: 'aprendizado',
          priority: 1,
          content: 'Closing.',
        }),
        makeFragment({
          id: 'frag-percepcao-1',
          section: 'percepcao',
          priority: 1,
          content: 'Você percebeu algo.',
        }),
      ]

      const def = makeDebriefingDef({ fragmentIds: ['frag-percepcao-1'] })
      const result = composeDebriefing(def, fragments, [], {})
      const percepcaoSection = result.sections.find(
        (s) => s.title === 'O que você percebeu',
      )
      expect(percepcaoSection!.entries).toHaveLength(1)
    })
  })

  describe('sourceChoiceIds verification against confirmedChoices', () => {
    it('includes fragment when at least one sourceChoiceId matches confirmedChoices', () => {
      const fragments: DebriefingFragment[] = [
        makeFragment({
          id: 'frag-outcome',
          section: 'desfecho',
          priority: 1,
          content: 'Outcome.',
        }),
        makeFragment({
          id: 'frag-closing',
          section: 'aprendizado',
          priority: 1,
          content: 'Closing.',
        }),
        makeFragment({
          id: 'frag-protecao-1',
          section: 'protecao',
          priority: 1,
          content: 'Proteção obtida.',
          sourceChoiceIds: ['choice-a', 'choice-b'],
        }),
      ]

      const def = makeDebriefingDef({ fragmentIds: ['frag-protecao-1'] })
      const confirmedChoices = [{ choiceId: 'choice-b' }]

      const result = composeDebriefing(def, fragments, confirmedChoices, {})
      const protecaoSection = result.sections.find(
        (s) => s.title === 'O que protegeu o paciente',
      )
      expect(protecaoSection!.entries).toHaveLength(1)
    })

    it('excludes fragment when no sourceChoiceId matches confirmedChoices', () => {
      const fragments: DebriefingFragment[] = [
        makeFragment({
          id: 'frag-outcome',
          section: 'desfecho',
          priority: 1,
          content: 'Outcome.',
        }),
        makeFragment({
          id: 'frag-closing',
          section: 'aprendizado',
          priority: 1,
          content: 'Closing.',
        }),
        makeFragment({
          id: 'frag-protecao-1',
          section: 'protecao',
          priority: 1,
          content: 'Proteção obtida.',
          sourceChoiceIds: ['choice-a', 'choice-b'],
        }),
      ]

      const def = makeDebriefingDef({ fragmentIds: ['frag-protecao-1'] })
      const confirmedChoices = [{ choiceId: 'choice-c' }]

      const result = composeDebriefing(def, fragments, confirmedChoices, {})
      const protecaoSection = result.sections.find(
        (s) => s.title === 'O que protegeu o paciente',
      )
      expect(protecaoSection!.entries).toHaveLength(0)
    })

    it('includes fragment when sourceChoiceIds is not declared', () => {
      const fragments: DebriefingFragment[] = [
        makeFragment({
          id: 'frag-outcome',
          section: 'desfecho',
          priority: 1,
          content: 'Outcome.',
        }),
        makeFragment({
          id: 'frag-closing',
          section: 'aprendizado',
          priority: 1,
          content: 'Closing.',
        }),
        makeFragment({
          id: 'frag-percepcao-1',
          section: 'percepcao',
          priority: 1,
          content: 'Percepção sem filtro.',
          // no sourceChoiceIds
        }),
      ]

      const def = makeDebriefingDef({ fragmentIds: ['frag-percepcao-1'] })
      const result = composeDebriefing(def, fragments, [], {})
      const percepcaoSection = result.sections.find(
        (s) => s.title === 'O que você percebeu',
      )
      expect(percepcaoSection!.entries).toHaveLength(1)
    })
  })

  describe('ordering by priority within section (ascending)', () => {
    it('orders fragments by ascending priority', () => {
      const fragments: DebriefingFragment[] = [
        makeFragment({
          id: 'frag-outcome',
          section: 'desfecho',
          priority: 1,
          content: 'Outcome.',
        }),
        makeFragment({
          id: 'frag-closing',
          section: 'aprendizado',
          priority: 1,
          content: 'Closing.',
        }),
        makeFragment({
          id: 'frag-r1',
          section: 'risco',
          priority: 3,
          content: 'Risco terceiro.',
        }),
        makeFragment({
          id: 'frag-r2',
          section: 'risco',
          priority: 1,
          content: 'Risco primeiro.',
        }),
        makeFragment({
          id: 'frag-r3',
          section: 'risco',
          priority: 2,
          content: 'Risco segundo.',
        }),
      ]

      const def = makeDebriefingDef({
        fragmentIds: ['frag-r1', 'frag-r2', 'frag-r3'],
      })
      const result = composeDebriefing(def, fragments, [], {})
      const riscoSection = result.sections.find((s) => s.title === 'Onde o risco aumentou')
      expect(riscoSection!.entries.map((e) => e.content)).toEqual([
        'Risco primeiro.',
        'Risco segundo.',
        'Risco terceiro.',
      ])
    })
  })

  describe('limit: max 3 fragments per section', () => {
    it('caps at 3 fragments per section', () => {
      const fragments: DebriefingFragment[] = [
        makeFragment({
          id: 'frag-outcome',
          section: 'desfecho',
          priority: 1,
          content: 'Outcome.',
        }),
        makeFragment({
          id: 'frag-closing',
          section: 'aprendizado',
          priority: 1,
          content: 'Closing.',
        }),
        makeFragment({ id: 'frag-p1', section: 'percepcao', priority: 1, content: 'P1' }),
        makeFragment({ id: 'frag-p2', section: 'percepcao', priority: 2, content: 'P2' }),
        makeFragment({ id: 'frag-p3', section: 'percepcao', priority: 3, content: 'P3' }),
        makeFragment({ id: 'frag-p4', section: 'percepcao', priority: 4, content: 'P4' }),
      ]

      const def = makeDebriefingDef({
        fragmentIds: ['frag-p1', 'frag-p2', 'frag-p3', 'frag-p4'],
      })
      const result = composeDebriefing(def, fragments, [], {})
      const percepcaoSection = result.sections.find(
        (s) => s.title === 'O que você percebeu',
      )
      expect(percepcaoSection!.entries).toHaveLength(3)
      // Should keep the top 3 by priority (ascending)
      expect(percepcaoSection!.entries.map((e) => e.content)).toEqual(['P1', 'P2', 'P3'])
    })
  })

  describe('deduplication by id', () => {
    it('deduplicates fragments with same id, keeping highest precedence (lowest priority)', () => {
      const fragments: DebriefingFragment[] = [
        makeFragment({
          id: 'frag-outcome',
          section: 'desfecho',
          priority: 1,
          content: 'Outcome.',
        }),
        makeFragment({
          id: 'frag-closing',
          section: 'aprendizado',
          priority: 1,
          content: 'Closing.',
        }),
        makeFragment({
          id: 'frag-dup',
          section: 'risco',
          priority: 5,
          content: 'Version with low precedence.',
        }),
        makeFragment({
          id: 'frag-dup',
          section: 'risco',
          priority: 2,
          content: 'Version with high precedence.',
        }),
      ]

      const def = makeDebriefingDef({
        fragmentIds: ['frag-dup', 'frag-dup'],
      })
      const result = composeDebriefing(def, fragments, [], {})
      const riscoSection = result.sections.find((s) => s.title === 'Onde o risco aumentou')
      expect(riscoSection!.entries).toHaveLength(1)
      expect(riscoSection!.entries[0]!.content).toBe('Version with high precedence.')
    })
  })

  describe('closingFragmentId in section aprendizado', () => {
    it('includes closing fragment in aprendizado section', () => {
      const fragments: DebriefingFragment[] = [
        makeFragment({
          id: 'frag-outcome',
          section: 'desfecho',
          priority: 1,
          content: 'Outcome.',
        }),
        makeFragment({
          id: 'frag-closing',
          section: 'aprendizado',
          priority: 10,
          content: 'Lição final para o próximo plantão.',
        }),
      ]

      const def = makeDebriefingDef()
      const result = composeDebriefing(def, fragments, [], {})
      const aprendizadoSection = result.sections.find(
        (s) => s.title === 'O que levar para o próximo plantão',
      )
      expect(aprendizadoSection!.entries).toHaveLength(1)
      expect(aprendizadoSection!.entries[0]!.content).toBe(
        'Lição final para o próximo plantão.',
      )
    })
  })

  describe('clinical review fragment with mandatory disclaimer', () => {
    it('includes clinical review fragment and appends disclaimer', () => {
      const fragments: DebriefingFragment[] = [
        makeFragment({
          id: 'frag-outcome',
          section: 'desfecho',
          priority: 1,
          content: 'Outcome.',
        }),
        makeFragment({
          id: 'frag-closing',
          section: 'aprendizado',
          priority: 1,
          content: 'Closing.',
        }),
        makeFragment({
          id: 'frag-clinical',
          section: 'revisao_clinica',
          priority: 1,
          content: 'O protocolo de heparina requer atenção redobrada.',
        }),
      ]

      const def = makeDebriefingDef({
        fragmentIds: ['frag-clinical'],
      })
      const result = composeDebriefing(def, fragments, [], {})
      const clinicalSection = result.sections.find((s) => s.title === 'Revisão clínica')
      expect(clinicalSection!.entries).toHaveLength(2)
      expect(clinicalSection!.entries[0]!.content).toBe(
        'O protocolo de heparina requer atenção redobrada.',
      )
      expect(clinicalSection!.entries[1]!.content).toBe(
        'Esta revisão clínica é opcional e sujeita a validação profissional.',
      )
    })

    it('does not append disclaimer when clinical review section is empty', () => {
      const fragments: DebriefingFragment[] = [
        makeFragment({
          id: 'frag-outcome',
          section: 'desfecho',
          priority: 1,
          content: 'Outcome.',
        }),
        makeFragment({
          id: 'frag-closing',
          section: 'aprendizado',
          priority: 1,
          content: 'Closing.',
        }),
      ]

      const def = makeDebriefingDef()
      const result = composeDebriefing(def, fragments, [], {})
      const clinicalSection = result.sections.find((s) => s.title === 'Revisão clínica')
      expect(clinicalSection!.entries).toHaveLength(0)
    })
  })

  describe('empty section detection → editorial warning', () => {
    it('emits warning for each empty section', () => {
      // Only outcome and closing fragments → percepcao, risco, protecao, revisao_clinica will be empty
      const fragments: DebriefingFragment[] = [
        makeFragment({
          id: 'frag-outcome',
          section: 'desfecho',
          priority: 1,
          content: 'Outcome.',
        }),
        makeFragment({
          id: 'frag-closing',
          section: 'aprendizado',
          priority: 1,
          content: 'Closing.',
        }),
      ]

      const def = makeDebriefingDef()
      const result = composeDebriefing(def, fragments, [], {})

      expect(result.warnings).toContain(
        'Seção "O que você percebeu" está vazia após avaliação dos fragmentos.',
      )
      expect(result.warnings).toContain(
        'Seção "Onde o risco aumentou" está vazia após avaliação dos fragmentos.',
      )
      expect(result.warnings).toContain(
        'Seção "O que protegeu o paciente" está vazia após avaliação dos fragmentos.',
      )
      expect(result.warnings).toContain(
        'Seção "Revisão clínica" está vazia após avaliação dos fragmentos.',
      )
      // desfecho and aprendizado have content → no warning
      expect(result.warnings).not.toContain(
        'Seção "Seu desfecho" está vazia após avaliação dos fragmentos.',
      )
      expect(result.warnings).not.toContain(
        'Seção "O que levar para o próximo plantão" está vazia após avaliação dos fragmentos.',
      )
    })

    it('emits no warnings when all sections have content', () => {
      const fragments: DebriefingFragment[] = [
        makeFragment({ id: 'frag-outcome', section: 'desfecho', priority: 1, content: 'O.' }),
        makeFragment({ id: 'frag-closing', section: 'aprendizado', priority: 1, content: 'C.' }),
        makeFragment({ id: 'frag-p', section: 'percepcao', priority: 1, content: 'P.' }),
        makeFragment({ id: 'frag-r', section: 'risco', priority: 1, content: 'R.' }),
        makeFragment({ id: 'frag-pr', section: 'protecao', priority: 1, content: 'Pr.' }),
        makeFragment({ id: 'frag-cl', section: 'revisao_clinica', priority: 1, content: 'Cl.' }),
      ]

      const def = makeDebriefingDef({
        fragmentIds: ['frag-p', 'frag-r', 'frag-pr', 'frag-cl'],
      })
      const result = composeDebriefing(def, fragments, [], {})
      expect(result.warnings).toHaveLength(0)
    })
  })

  describe('DebriefingPresentation structure', () => {
    it('returns sections in canonical order', () => {
      const fragments: DebriefingFragment[] = [
        makeFragment({ id: 'frag-outcome', section: 'desfecho', priority: 1, content: 'O.' }),
        makeFragment({ id: 'frag-closing', section: 'aprendizado', priority: 1, content: 'C.' }),
      ]

      const def = makeDebriefingDef()
      const result = composeDebriefing(def, fragments, [], {})

      expect(result.sections.map((s) => s.title)).toEqual([
        'Seu desfecho',
        'O que você percebeu',
        'Onde o risco aumentou',
        'O que protegeu o paciente',
        'O que levar para o próximo plantão',
        'Revisão clínica',
      ])
    })

    it('includes analysisCategory in entries when present', () => {
      const fragments: DebriefingFragment[] = [
        makeFragment({ id: 'frag-outcome', section: 'desfecho', priority: 1, content: 'O.' }),
        makeFragment({ id: 'frag-closing', section: 'aprendizado', priority: 1, content: 'C.' }),
        makeFragment({
          id: 'frag-r1',
          section: 'risco',
          priority: 1,
          content: 'Risco por atraso.',
          analysisCategory: 'atraso',
        }),
      ]

      const def = makeDebriefingDef({ fragmentIds: ['frag-r1'] })
      const result = composeDebriefing(def, fragments, [], {})
      const riscoSection = result.sections.find((s) => s.title === 'Onde o risco aumentou')
      expect(riscoSection!.entries[0]!.analysisCategory).toBe('atraso')
    })

    it('omits analysisCategory from entry when not present on fragment', () => {
      const fragments: DebriefingFragment[] = [
        makeFragment({ id: 'frag-outcome', section: 'desfecho', priority: 1, content: 'O.' }),
        makeFragment({ id: 'frag-closing', section: 'aprendizado', priority: 1, content: 'C.' }),
        makeFragment({
          id: 'frag-r1',
          section: 'risco',
          priority: 1,
          content: 'Risco genérico.',
        }),
      ]

      const def = makeDebriefingDef({ fragmentIds: ['frag-r1'] })
      const result = composeDebriefing(def, fragments, [], {})
      const riscoSection = result.sections.find((s) => s.title === 'Onde o risco aumentou')
      expect(riscoSection!.entries[0]!.analysisCategory).toBeUndefined()
    })
  })

  describe('combined condition + sourceChoiceIds filtering', () => {
    it('requires both condition AND sourceChoiceIds to pass when both declared', () => {
      const fragments: DebriefingFragment[] = [
        makeFragment({ id: 'frag-outcome', section: 'desfecho', priority: 1, content: 'O.' }),
        makeFragment({ id: 'frag-closing', section: 'aprendizado', priority: 1, content: 'C.' }),
        makeFragment({
          id: 'frag-combo',
          section: 'percepcao',
          priority: 1,
          content: 'Combo fragment.',
          condition: { op: 'eq', state: 'voltaren_comunicado', value: true },
          sourceChoiceIds: ['choice-voltaren'],
        }),
      ]

      const def = makeDebriefingDef({ fragmentIds: ['frag-combo'] })

      // Both pass
      const result1 = composeDebriefing(
        def,
        fragments,
        [{ choiceId: 'choice-voltaren' }],
        { voltaren_comunicado: true },
      )
      expect(
        result1.sections.find((s) => s.title === 'O que você percebeu')!.entries,
      ).toHaveLength(1)

      // Condition fails, choice passes
      const result2 = composeDebriefing(
        def,
        fragments,
        [{ choiceId: 'choice-voltaren' }],
        { voltaren_comunicado: false },
      )
      expect(
        result2.sections.find((s) => s.title === 'O que você percebeu')!.entries,
      ).toHaveLength(0)

      // Condition passes, choice fails
      const result3 = composeDebriefing(
        def,
        fragments,
        [{ choiceId: 'choice-other' }],
        { voltaren_comunicado: true },
      )
      expect(
        result3.sections.find((s) => s.title === 'O que você percebeu')!.entries,
      ).toHaveLength(0)
    })
  })
})
