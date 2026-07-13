/**
 * Narrative Engine — Interpretação do grafo, avaliação de condições,
 * aplicação de efeitos, resolução de desfechos.
 * Depende de: Domain + contratos abstratos de persistência.
 */
export { evaluate } from './condition-evaluator'
export { applyEffects } from './effect-applicator'
export { resolveTransition } from './transition-resolver'
export { resolveOutcome } from './outcome-resolver'
export { composeDebriefing } from './debriefing-composer'
export { selectImmediateBeat, selectDeferredBeat } from './beat-selector'
export { buildNodePresentation } from './presentation-builder'
export { EngineCore } from './engine-core'
