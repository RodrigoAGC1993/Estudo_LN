/**
 * Domain / Contracts — Tipos compartilhados do Caderno de Plantão.
 * Nenhuma implementação, apenas definições.
 */

export type AppVersion = string

// === State values (runtime representation) ===
export type StateValue = number | boolean | string | null
export type StateMap = Record<string, StateValue>

// === Tipos de Estado ===
export type StateType = 'integer' | 'boolean' | 'enum' | 'nullable_boolean'

// === Definição de Estado ===
export interface StateDefinition {
  name: string
  type: StateType
  initialValue: StateValue
  minimum?: number       // obrigatório para integer
  maximum?: number       // obrigatório para integer
  enumValues?: string[]  // obrigatório para enum
}

// === Operações de Efeito ===
export type EffectOperation = 'set' | 'increment' | 'decrement'

// === Efeito sobre Estado ===
export interface StateEffect {
  target: string
  operation: EffectOperation
  value?: StateValue              // obrigatório para 'set'
  amount?: number                 // obrigatório para increment/decrement; DEVE ser > 0
}

// === Desfecho ===
export type EndingName = 'tragico' | 'grave' | 'excelente' | 'bom'

export interface EndingDefinition {
  id: string
  name: EndingName
  evaluationOrder: 1 | 2 | 3 | 4  // tragico=1, grave=2, excelente=3, bom=4
  condition: ConditionExpression
  prose: string
}

// === Expressões de Condição (discriminated union recursiva) ===
export type ConditionExpression =
  | { op: 'eq'; state: string; value: StateValue }
  | { op: 'neq'; state: string; value: StateValue }
  | { op: 'gt'; state: string; value: number }
  | { op: 'gte'; state: string; value: number }
  | { op: 'lt'; state: string; value: number }
  | { op: 'lte'; state: string; value: number }
  | { op: 'isNull'; state: string }
  | { op: 'isNotNull'; state: string }
  | { op: 'and'; conditions: ConditionExpression[] }
  | { op: 'or'; conditions: ConditionExpression[] }
  | { op: 'not'; condition: ConditionExpression }

// === Categorias de Análise do Debriefing ===
export type AnalysisCategory =
  | 'decisao_adequada'
  | 'decisao_defensavel_incompleta'
  | 'processo_inseguro_sem_dano'
  | 'atraso'
  | 'omissao'
  | 'fator_protetor'
  | 'fator_sistemico'
  | 'decisao_critica'

// === Debriefing — Composto por fragmentos condicionais ===
export interface DebriefingDefinition {
  id: string
  endingId: string
  outcomeFragmentId: string      // fragmento fixo do desfecho
  fragmentIds: string[]           // fragmentos condicionais disponíveis
  closingFragmentId: string       // fragmento de encerramento
}

export interface DebriefingFragment {
  id: string
  section:
    | 'desfecho'
    | 'percepcao'
    | 'risco'
    | 'protecao'
    | 'aprendizado'
    | 'revisao_clinica'
  condition?: ConditionExpression
  sourceChoiceIds?: string[]
  analysisCategory?: AnalysisCategory
  priority: number                 // menor = maior precedência dentro da seção
  content: string
}

// === Apresentação do Debriefing (output types) ===
export interface DebriefingPresentation {
  sections: DebriefingSection[]
  warnings: string[]
}

export interface DebriefingSection {
  title: string
  entries: DebriefingEntryPresentation[]
}

export interface DebriefingEntryPresentation {
  content: string
  analysisCategory?: string
}

// === Transição (direct ou conditional) — Design §4.3 ===
export type TransitionDefinition =
  | { kind: 'direct'; targetNodeId: string }
  | { kind: 'conditional'; branches: ConditionalBranch[]; fallbackNodeId: string }

export interface ConditionalBranch {
  condition: ConditionExpression
  targetNodeId: string
  priority: number  // menor = avaliado primeiro
}

// === Beats Interpessoais — Design §4.7 ===
export interface InterpersonalBeat {
  id: string
  sourceNodeId: string
  sourceChoiceIds?: string[]  // se presente, restringe ativação a essas escolhas; se ausente, qualquer escolha
  band: 'negative' | 'neutral' | 'positive'  // confianca <= -1, = 0, >= 1
  bandCondition: ConditionExpression
  timing: 'immediate' | 'deferred'
  prose: string
  // Para beats diferidos:
  deferredActivationCondition?: ConditionExpression
  eligibleNodeId?: string  // nó onde o beat pode aparecer
}
