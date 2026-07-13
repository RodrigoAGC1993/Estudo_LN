/**
 * Domain Types — Endings and Debriefing
 * Design §4.6
 *
 * EndingDefinition defines outcome rules evaluated by the OutcomeResolver.
 * DebriefingDefinition/DebriefingFragment define the causal post-game analysis.
 */

import type { ConditionExpression } from './effects.ts';

// === Desfecho ===

export type EndingName = 'tragico' | 'grave' | 'excelente' | 'bom';

export interface EndingDefinition {
  id: string;
  name: EndingName;
  evaluationOrder: 1 | 2 | 3 | 4;  // tragico=1, grave=2, excelente=3, bom=4
  condition: ConditionExpression;
  prose: string;
}

// === Debriefing ===

export interface DebriefingDefinition {
  id: string;
  endingId: string;
  outcomeFragmentId: string;
  fragmentIds: string[];
  closingFragmentId: string;
}

export interface DebriefingFragment {
  id: string;
  section:
    | 'desfecho'
    | 'percepcao'
    | 'risco'
    | 'protecao'
    | 'aprendizado'
    | 'revisao_clinica';
  condition?: ConditionExpression;
  sourceChoiceIds?: string[];
  analysisCategory?: AnalysisCategory;
  priority: number;
  content: string;
}

export type AnalysisCategory =
  | 'decisao_adequada'
  | 'decisao_defensavel_incompleta'
  | 'processo_inseguro_sem_dano'
  | 'atraso'
  | 'omissao'
  | 'fator_protetor'
  | 'fator_sistemico'
  | 'decisao_critica';
