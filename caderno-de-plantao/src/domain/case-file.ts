/**
 * Domain Types — Case File
 * Design §4.1, §5.1
 */

import type {
  StateDefinition,
  EndingDefinition,
  DebriefingDefinition,
  DebriefingFragment,
  InterpersonalBeat,
} from './types'
import type { NarrativeNode } from './narrative-nodes'

export interface CaseMetadata {
  title: string
  subtitle?: string
  playableCharacterId: string
  synopsis?: string
  locale: 'pt-BR'
}

export interface CaseFile {
  schemaVersion: string
  caseId: string
  caseVersion: string
  metadata: CaseMetadata
  startNodeId: string
  states: StateDefinition[]
  nodes: NarrativeNode[]
  endings: EndingDefinition[]
  debriefings: DebriefingDefinition[]
  debriefingFragments: DebriefingFragment[]
  interpersonalBeats: InterpersonalBeat[]
  warnings?: string[]
  editorialReferences?: string[]
  provisionalContent?: string[]
  editorialReviewStatus: 'draft' | 'reviewed' | 'approved'
  clinicalReviewStatus: 'pending' | 'reviewed' | 'approved'
}
