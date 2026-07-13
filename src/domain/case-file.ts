/**
 * Domain Types — Case File and Core Structures
 * Design §4.1
 *
 * Defines the root CaseFile structure and its associated metadata and state types.
 */

import type { NarrativeNode } from './narrative-nodes.ts';
import type { EndingDefinition, DebriefingDefinition, DebriefingFragment } from './endings.ts';
import type { InterpersonalBeat } from './beats.ts';
import type { StateEffect } from './effects.ts';

// === Metadados do Caso ===
export interface CaseMetadata {
  title: string;
  subtitle?: string;
  playableCharacterId: string;
  synopsis?: string;
  locale: 'pt-BR';
}

// === Tipos de Estado ===
export type StateType = 'integer' | 'boolean' | 'enum' | 'nullable_boolean';

// === Definição de Estado ===
export interface StateDefinition {
  name: string;
  type: StateType;
  initialValue: number | boolean | string | null;
  minimum?: number;       // obrigatório para integer
  maximum?: number;       // obrigatório para integer
  enumValues?: string[];  // obrigatório para enum
}

// === Arquivo de Caso (raiz) ===
export interface CaseFile {
  schemaVersion: string;
  caseId: string;
  caseVersion: string;
  metadata: CaseMetadata;
  startNodeId: string;
  states: StateDefinition[];
  nodes: NarrativeNode[];
  endings: EndingDefinition[];
  debriefings: DebriefingDefinition[];
  debriefingFragments: DebriefingFragment[];
  interpersonalBeats: InterpersonalBeat[];
  warnings?: string[];
  editorialReferences?: string[];
  provisionalContent?: string[];
  editorialReviewStatus: 'draft' | 'reviewed' | 'approved';
  clinicalReviewStatus: 'pending' | 'reviewed' | 'approved';
}

// Re-export StateEffect so consumers can access it from case-file if needed
export type { StateEffect };
