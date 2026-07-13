import type { InterpersonalBeat, StateMap } from '@domain/types'
import { evaluate } from './condition-evaluator'

/**
 * Determina a faixa (band) a partir do valor de `confianca_equipe`.
 *
 * - <= -1 → 'negative'
 * - === 0  → 'neutral'
 * - >= 1  → 'positive'
 */
function deriveBand(states: StateMap): 'negative' | 'neutral' | 'positive' {
  const confianca = states['confianca_equipe'] as number
  if (confianca <= -1) return 'negative'
  if (confianca >= 1) return 'positive'
  return 'neutral'
}

/**
 * Selects an immediate beat after a choice is confirmed.
 *
 * Algorithm (Design §12.2 — Immediate beat selection):
 * 1. Filter beats where `timing === 'immediate'`
 * 2. Filter beats where `sourceNodeId` matches the current node
 * 3. If `sourceChoiceIds` present, filter to only those matching the confirmed choiceId
 * 4. Derive band from post-effect `confianca_equipe`
 * 5. Filter by band matching the derived band
 * 6. Evaluate `bandCondition` against post-effect states
 * 7. Return at most one beat (the first matching)
 *
 * @param beats - All interpersonal beats from the case file
 * @param sourceNodeId - The current decision node id
 * @param choiceId - The confirmed choice id
 * @param states - Post-effect state map
 * @returns The first matching immediate beat, or null
 */
export function selectImmediateBeat(
  beats: ReadonlyArray<InterpersonalBeat>,
  sourceNodeId: string,
  choiceId: string,
  states: StateMap,
): InterpersonalBeat | null {
  const band = deriveBand(states)

  for (const beat of beats) {
    // Must be immediate timing
    if (beat.timing !== 'immediate') continue

    // Must match the source node
    if (beat.sourceNodeId !== sourceNodeId) continue

    // If sourceChoiceIds present, must include the confirmed choice
    if (beat.sourceChoiceIds && !beat.sourceChoiceIds.includes(choiceId)) continue

    // Must match the derived band
    if (beat.band !== band) continue

    // Must satisfy bandCondition against post-effect states
    if (!evaluate(beat.bandCondition, states)) continue

    // First matching beat wins
    return beat
  }

  return null
}

/**
 * Selects a deferred beat when reaching an eligible node.
 *
 * Algorithm (Design §12.2 — Deferred beat selection):
 * 1. Filter beats where `timing === 'deferred'`
 * 2. Check if destination === beat's `eligibleNodeId`
 * 3. Verify origin choice was confirmed (sourceNodeId in confirmedChoices)
 * 4. If `sourceChoiceIds`, verify specific choice was made
 * 5. Verify `eligibleNodeId` wasn't visited AFTER the origin choice (not consumed)
 * 6. Evaluate `deferredActivationCondition` against current states
 * 7. Evaluate `bandCondition` against current states
 * 8. Return at most one beat (the first matching)
 *
 * @param beats - All interpersonal beats from the case file
 * @param destinationNodeId - The node being arrived at
 * @param confirmedChoices - Ordered list of confirmed choices with sequence numbers
 * @param visitedNodes - List of nodes visited during the session
 * @param states - Current state map
 * @returns The first matching deferred beat, or null
 */
export function selectDeferredBeat(
  beats: ReadonlyArray<InterpersonalBeat>,
  destinationNodeId: string,
  confirmedChoices: ReadonlyArray<{ nodeId: string; choiceId: string; sequence: number }>,
  visitedNodes: ReadonlyArray<string>,
  states: StateMap,
): InterpersonalBeat | null {
  for (const beat of beats) {
    // Must be deferred timing
    if (beat.timing !== 'deferred') continue

    // Must target this destination node
    if (beat.eligibleNodeId !== destinationNodeId) continue

    // Find the origin confirmation (sourceNodeId must have been confirmed)
    const originConfirmation = confirmedChoices.find((c) => c.nodeId === beat.sourceNodeId)
    if (!originConfirmation) continue

    // If sourceChoiceIds present, verify the specific choice was made
    if (beat.sourceChoiceIds && !beat.sourceChoiceIds.includes(originConfirmation.choiceId)) continue

    // Verify the eligibleNodeId wasn't visited AFTER the origin choice (consumption check).
    // The beat is consumed if the eligible node appears in visitedNodes already.
    // We check if the eligibleNodeId was previously visited — if so, the beat was already consumed.
    if (visitedNodes.includes(beat.eligibleNodeId)) continue

    // Evaluate deferredActivationCondition if present
    if (beat.deferredActivationCondition && !evaluate(beat.deferredActivationCondition, states)) continue

    // Evaluate bandCondition against current states
    if (!evaluate(beat.bandCondition, states)) continue

    // First matching deferred beat wins
    return beat
  }

  return null
}
