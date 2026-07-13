/**
 * Presentation Builder — Converts a NarrativeNode into a NodePresentation DTO.
 * Used by the Engine Core to produce safe, UI-ready data.
 * Design §4.10
 */

import type {
  NarrativeNode,
  NodePresentation,
  OptionPresentation,
  CaseFile,
} from '@domain/index'

/**
 * Builds a NodePresentation from a NarrativeNode.
 *
 * - DecisionNode: includes prose, metadata, choices as options (isContinuation: false)
 * - ProgressionNode: includes prose, metadata, one continuation option (isContinuation: true)
 * - EndingNode: includes ending prose (from caseFile.endings), metadata, one continuation option
 * - DebriefingNode: returns minimal presentation (debriefing is handled via separate event)
 * - OutcomeResolutionNode: should never be presented; returns empty presentation
 */
export function buildNodePresentation(
  node: NarrativeNode,
  caseFile: CaseFile,
): NodePresentation {
  switch (node.kind) {
    case 'decision': {
      const options: OptionPresentation[] = node.choices.map((choice) => ({
        id: choice.id,
        label: choice.label,
        ...(choice.accessibleLabel !== undefined && { accessibleLabel: choice.accessibleLabel }),
        isContinuation: false,
      }))
      return {
        nodeId: node.id,
        prose: node.prose,
        presentationMetadata: node.presentationMetadata,
        options,
        nodeKind: 'decision',
      }
    }

    case 'progression': {
      const option: OptionPresentation = {
        id: `${node.id}__continue`,
        label: node.continuationAction.label,
        ...(node.continuationAction.accessibleLabel !== undefined && { accessibleLabel: node.continuationAction.accessibleLabel }),
        isContinuation: true,
      }
      return {
        nodeId: node.id,
        prose: node.prose,
        presentationMetadata: node.presentationMetadata,
        options: [option],
        nodeKind: 'progression',
      }
    }

    case 'ending': {
      const endingDef = caseFile.endings.find((e) => e.id === node.endingId)
      const prose = endingDef?.prose ?? ''
      const option: OptionPresentation = {
        id: `${node.id}__continue`,
        label: node.continuationAction.label,
        ...(node.continuationAction.accessibleLabel !== undefined && { accessibleLabel: node.continuationAction.accessibleLabel }),
        isContinuation: true,
      }
      return {
        nodeId: node.id,
        prose,
        presentationMetadata: node.presentationMetadata,
        options: [option],
        nodeKind: 'ending',
      }
    }

    case 'debriefing': {
      return {
        nodeId: node.id,
        prose: '',
        presentationMetadata: node.presentationMetadata,
        nodeKind: 'debriefing',
      }
    }

    case 'outcome_resolution': {
      // Internal node — should never be presented to the player
      return {
        nodeId: node.id,
        prose: '',
        presentationMetadata: { title: '' },
        nodeKind: 'progression',
      }
    }
  }
}
