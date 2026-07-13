/**
 * Coverage Validator — Enumeração exaustiva de rotas e validação de cobertura.
 * Design §15.3
 *
 * Valida critérios 8, 9, 10, 11, 12, 13, 17, 18, 19, 20 do Requisito 11.
 * Depende de: Domain + Engine (condition-evaluator, effect-applicator).
 */

import type {
  CaseFile,
  StateMap,
  StateDefinition,
  EndingDefinition,
  NarrativeNode,
  ConditionExpression,
} from '@domain/index'
import type {
  ContentValidationResult,
  ContentValidationError,
} from '@domain/validation'
import { evaluate } from '@engine/condition-evaluator'
import { applyEffects } from '@engine/effect-applicator'
import { ContentRuntimeError } from '@domain/index'

// === Types for route enumeration ===

interface RouteChoice {
  sequence: number
  nodeId: string
  choiceId: string
}

interface EnumeratedRoute {
  choices: RouteChoice[]
  finalStates: StateMap
  endingId: string | null
  traversedNodeIds: string[]
}

interface DomainViolation {
  nodeId: string
  choiceId: string
  stateName: string
  message: string
}

// === Helper: initialize states from definitions ===

function initializeStates(stateDefinitions: ReadonlyArray<StateDefinition>): StateMap {
  const states: StateMap = {}
  for (const def of stateDefinitions) {
    states[def.name] = def.initialValue
  }
  return states
}

// === Helper: resolve transition (simplified for validation — no import of transition-resolver to avoid circular deps) ===

function resolveTransitionForValidation(
  transition: { kind: string; targetNodeId?: string; branches?: Array<{ condition: ConditionExpression; targetNodeId: string; priority: number }>; fallbackNodeId?: string },
  states: StateMap,
): string {
  if (transition.kind === 'direct') {
    return transition.targetNodeId!
  }
  // Conditional transition
  const sorted = [...(transition.branches ?? [])].sort((a, b) => a.priority - b.priority)
  for (const branch of sorted) {
    if (evaluate(branch.condition, states)) {
      return branch.targetNodeId
    }
  }
  return transition.fallbackNodeId!
}

// === Helper: find node by id ===

function findNode(nodes: ReadonlyArray<NarrativeNode>, nodeId: string): NarrativeNode | undefined {
  return nodes.find((n) => n.id === nodeId)
}

// === Helper: find EndingNode by endingId ===

function findEndingNodeByEndingId(nodes: ReadonlyArray<NarrativeNode>, endingId: string): NarrativeNode | undefined {
  return nodes.find((n) => n.kind === 'ending' && n.endingId === endingId)
}

// === Helper: check if state value is within domain ===

/** @internal — reserved for criterion-8 (effect domain simulation), not yet wired. */
export function isWithinDomain(value: number, def: StateDefinition): boolean {
  if (def.minimum !== undefined && value < def.minimum) return false
  if (def.maximum !== undefined && value > def.maximum) return false
  return true
}

// === Helper: extract state names referenced in a condition ===

/** @internal — reserved for criterion-20 (condition domain checks), not yet wired. */
export function extractStateReferences(condition: ConditionExpression): string[] {
  switch (condition.op) {
    case 'eq':
    case 'neq':
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
    case 'isNull':
    case 'isNotNull':
      return [condition.state]
    case 'and':
    case 'or':
      return condition.conditions.flatMap(extractStateReferences)
    case 'not':
      return extractStateReferences(condition.condition)
  }
}

// === Helper: check if condition references values outside declared domain ===

function checkConditionDomainViolations(
  condition: ConditionExpression,
  stateDefMap: Map<string, StateDefinition>,
): string[] {
  const violations: string[] = []

  switch (condition.op) {
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const def = stateDefMap.get(condition.state)
      if (def && def.type === 'integer') {
        const val = condition.value
        // A comparison against a value that is itself outside domain bounds
        // indicates a condition that depends on out-of-domain state
        if (def.maximum !== undefined && val > def.maximum) {
          violations.push(`Condição referencia valor ${val} > maximum ${def.maximum} para "${condition.state}"`)
        }
        if (def.minimum !== undefined && val < def.minimum) {
          violations.push(`Condição referencia valor ${val} < minimum ${def.minimum} para "${condition.state}"`)
        }
      }
      break
    }
    case 'eq':
    case 'neq': {
      const def = stateDefMap.get(condition.state)
      if (def && def.type === 'integer' && typeof condition.value === 'number') {
        const val = condition.value
        if (def.maximum !== undefined && val > def.maximum) {
          violations.push(`Condição referencia valor ${val} > maximum ${def.maximum} para "${condition.state}"`)
        }
        if (def.minimum !== undefined && val < def.minimum) {
          violations.push(`Condição referencia valor ${val} < minimum ${def.minimum} para "${condition.state}"`)
        }
      }
      break
    }
    case 'and':
    case 'or':
      for (const c of condition.conditions) {
        violations.push(...checkConditionDomainViolations(c, stateDefMap))
      }
      break
    case 'not':
      violations.push(...checkConditionDomainViolations(condition.condition, stateDefMap))
      break
  }

  return violations
}

// === Route Enumeration (DFS) ===

interface EnumerationContext {
  caseFile: CaseFile
  stateDefMap: Map<string, StateDefinition>
  routes: EnumeratedRoute[]
  domainViolations: DomainViolation[]
  criticalNullPaths: RouteChoice[][]
  maxDepth: number
}

function enumerateRoutes(caseFile: CaseFile): EnumerationContext {
  const stateDefMap = new Map<string, StateDefinition>()
  for (const def of caseFile.states) {
    stateDefMap.set(def.name, def)
  }

  const ctx: EnumerationContext = {
    caseFile,
    stateDefMap,
    routes: [],
    domainViolations: [],
    criticalNullPaths: [],
    maxDepth: 200, // protection against infinite loops
  }

  const startStates = initializeStates(caseFile.states)
  traverse(ctx, caseFile.startNodeId, startStates, [], [], null, 0)

  return ctx
}

function traverse(
  ctx: EnumerationContext,
  nodeId: string,
  states: StateMap,
  choices: RouteChoice[],
  traversedNodeIds: string[],
  resolvedEndingId: string | null,
  depth: number,
): void {
  if (depth > ctx.maxDepth) {
    // Exceeded max depth — likely a cycle; skip
    return
  }

  const node = findNode(ctx.caseFile.nodes, nodeId)
  if (!node) {
    // Missing node — this would be caught by graph validator
    return
  }

  const newTraversed = [...traversedNodeIds, nodeId]

  switch (node.kind) {
    case 'decision': {
      for (const choice of node.choices) {
        const nextSequence = choices.length + 1
        let newStates: StateMap
        try {
          newStates = applyEffects(states, choice.effects, ctx.caseFile.states)
        } catch (e) {
          if (e instanceof ContentRuntimeError && e.code === 'DOMAIN_VIOLATION') {
            // Criterion 8: domain violation detected
            ctx.domainViolations.push({
              nodeId: node.id,
              choiceId: choice.id,
              stateName: e.location ?? '',
              message: e.message,
            })
            continue
          }
          throw e
        }

        const newChoices: RouteChoice[] = [
          ...choices,
          { sequence: nextSequence, nodeId: node.id, choiceId: choice.id },
        ]
        const nextId = resolveTransitionForValidation(choice.transition, newStates)
        traverse(ctx, nextId, newStates, newChoices, newTraversed, resolvedEndingId, depth + 1)
      }
      return
    }

    case 'progression': {
      const nextId = resolveTransitionForValidation(node.transition, states)
      traverse(ctx, nextId, states, choices, newTraversed, resolvedEndingId, depth + 1)
      return
    }

    case 'outcome_resolution': {
      // Criterion 13: check if acao_critica_a_tempo is null
      if (states['acao_critica_a_tempo'] === null || states['acao_critica_a_tempo'] === undefined) {
        ctx.criticalNullPaths.push([...choices])
      }

      // Resolve outcome
      const sortedEndings = [...ctx.caseFile.endings].sort(
        (a, b) => a.evaluationOrder - b.evaluationOrder,
      )
      let matchedEnding: EndingDefinition | null = null
      for (const ending of sortedEndings) {
        if (evaluate(ending.condition, states)) {
          matchedEnding = ending
          break
        }
      }

      if (!matchedEnding) {
        // No ending matched — this route has no ending (criterion 11/17)
        ctx.routes.push({
          choices,
          finalStates: states,
          endingId: null,
          traversedNodeIds: newTraversed,
        })
        return
      }

      const endingNode = findEndingNodeByEndingId(ctx.caseFile.nodes, matchedEnding.id)
      if (endingNode) {
        traverse(ctx, endingNode.id, states, choices, newTraversed, matchedEnding.id, depth + 1)
      } else {
        // EndingNode not found — record route with ending but traversal stops
        ctx.routes.push({
          choices,
          finalStates: states,
          endingId: matchedEnding.id,
          traversedNodeIds: newTraversed,
        })
      }
      return
    }

    case 'ending': {
      // Follow to debriefing
      traverse(ctx, node.nextNodeId, states, choices, newTraversed, resolvedEndingId, depth + 1)
      return
    }

    case 'debriefing': {
      // Terminal node — record route
      ctx.routes.push({
        choices,
        finalStates: states,
        endingId: resolvedEndingId,
        traversedNodeIds: newTraversed,
      })
      return
    }
  }
}

// === Main validator function ===

export function validateCoverage(caseFile: CaseFile): ContentValidationResult {
  const errors: ContentValidationError[] = []
  const stateDefMap = new Map<string, StateDefinition>()
  for (const def of caseFile.states) {
    stateDefMap.set(def.name, def)
  }

  // Enumerate all routes
  const ctx = enumerateRoutes(caseFile)

  // --- Criterion 8: effects producing out-of-domain values ---
  for (const violation of ctx.domainViolations) {
    errors.push({
      code: 'COVERAGE_DOMAIN_VIOLATION',
      severity: 'blocking',
      location: `nodes[${violation.nodeId}].choices[${violation.choiceId}]`,
      message: `Sequência de efeitos produz valor fora do domínio: ${violation.message}`,
      category: 'coverage',
    })
  }

  // --- Criterion 9: contradictory conditions in ending rules ---
  // A condition is contradictory if it's internally impossible (e.g., x > 5 AND x < 3)
  // We check this by analyzing if any ending condition can never be true
  // given the domain constraints. This is partially covered by criterion 10 (unreachable endings).
  // For a more specific check: look for logical contradictions within a single ending's condition.
  for (const ending of caseFile.endings) {
    if (hasContradiction(ending.condition, stateDefMap)) {
      errors.push({
        code: 'COVERAGE_CONTRADICTORY_CONDITION',
        severity: 'blocking',
        location: `endings[${ending.id}]`,
        message: `Condição de desfecho "${ending.name}" contém condições contraditórias`,
        category: 'coverage',
      })
    }
  }

  // --- Criterion 10: unreachable endings ---
  const reachedEndingIds = new Set<string>()
  for (const route of ctx.routes) {
    if (route.endingId) {
      reachedEndingIds.add(route.endingId)
    }
  }
  for (const ending of caseFile.endings) {
    if (!reachedEndingIds.has(ending.id)) {
      errors.push({
        code: 'COVERAGE_UNREACHABLE_ENDING',
        severity: 'blocking',
        location: `endings[${ending.id}]`,
        message: `Desfecho "${ending.name}" (${ending.id}) é inalcançável — nenhuma sequência válida de escolhas leva a este desfecho`,
        category: 'coverage',
      })
    }
  }

  // --- Criterion 11: paths without ending ---
  const pathsWithoutEnding = ctx.routes.filter((r) => r.endingId === null)
  for (const route of pathsWithoutEnding) {
    const choiceDesc = route.choices.map((c) => c.choiceId).join(' → ')
    errors.push({
      code: 'COVERAGE_PATH_NO_ENDING',
      severity: 'blocking',
      location: `route[${choiceDesc}]`,
      message: `Caminho sem desfecho: nenhuma regra de desfecho satisfeita para a sequência [${choiceDesc}]`,
      category: 'coverage',
    })
  }

  // --- Criterion 12: overlapping rules without priority resolution ---
  // Check if any route's final states satisfy multiple ending conditions simultaneously.
  // Since endings have evaluationOrder (priority), overlapping is only a problem
  // if two endings with the SAME evaluationOrder match the same route.
  const endingsByOrder = new Map<number, EndingDefinition[]>()
  for (const ending of caseFile.endings) {
    const list = endingsByOrder.get(ending.evaluationOrder) ?? []
    list.push(ending)
    endingsByOrder.set(ending.evaluationOrder, list)
  }

  for (const route of ctx.routes) {
    if (route.endingId === null) continue
    // Count how many endings match this route at the same priority level
    for (const [order, endings] of endingsByOrder) {
      if (endings.length <= 1) continue
      const matching = endings.filter((e) => evaluate(e.condition, route.finalStates))
      if (matching.length > 1) {
        const names = matching.map((e) => e.name).join(', ')
        errors.push({
          code: 'COVERAGE_OVERLAPPING_RULES',
          severity: 'blocking',
          location: `endings[order=${order}]`,
          message: `Regras de desfecho sobrepostas sem resolução por prioridade: [${names}] satisfeitas simultaneamente na mesma ordem de avaliação ${order}`,
          category: 'coverage',
        })
        break // Report once per route
      }
    }
  }

  // --- Criterion 13: critical null state on path to outcome ---
  for (const path of ctx.criticalNullPaths) {
    const choiceDesc = path.map((c) => c.choiceId).join(' → ')
    errors.push({
      code: 'COVERAGE_CRITICAL_STATE_NULL',
      severity: 'blocking',
      location: `route[${choiceDesc}]`,
      message: `Estado crítico 'acao_critica_a_tempo' permanece null ao alcançar cálculo de desfecho na sequência [${choiceDesc}]`,
      category: 'coverage',
    })
  }

  // --- Criterion 17: all valid sequences reach exactly one ending ---
  // Routes with endingId !== null already resolved exactly one ending (first match by priority).
  // Routes with endingId === null are reported by criterion 11.
  // This criterion is satisfied if criterion 11 has no errors.
  // (Already covered above)

  // --- Criterion 18: all 4 endings reachable by at least one sequence ---
  // (Already covered by criterion 10 above — checks all declared endings are reached)

  // --- Criterion 19: prioritized rule not made useless by lower priority ---
  // A higher-priority rule is "useless" if a lower-priority rule matches in ALL cases
  // where the higher-priority rule matches (i.e., the higher-priority rule is a subset
  // of the lower-priority rule's matches, so it never actually changes the outcome).
  // Check: for each ending E with evaluationOrder > 1, is there a lower-priority ending
  // that captures ALL routes that E captures?
  const routesByEnding = new Map<string, EnumeratedRoute[]>()
  for (const route of ctx.routes) {
    if (route.endingId) {
      const list = routesByEnding.get(route.endingId) ?? []
      list.push(route)
      routesByEnding.set(route.endingId, list)
    }
  }

  const sortedEndings = [...caseFile.endings].sort((a, b) => a.evaluationOrder - b.evaluationOrder)
  for (let i = 0; i < sortedEndings.length; i++) {
    const higherPriority = sortedEndings[i]!
    const higherRoutes = routesByEnding.get(higherPriority.id) ?? []

    if (higherRoutes.length === 0) continue // Already caught by criterion 10

    // Check if removing this ending would change nothing (all its routes would still
    // be captured by a lower-priority ending)
    for (const route of higherRoutes) {
      // Without this ending, would a lower-priority ending capture this route?
      let capturedByLower = false
      for (let j = i + 1; j < sortedEndings.length; j++) {
        if (evaluate(sortedEndings[j]!.condition, route.finalStates)) {
          capturedByLower = true
          break
        }
      }
      if (!capturedByLower) {
        // This route is ONLY captured by the higher-priority ending — the rule is useful
        break
      }
      // If we checked all routes and all are captured by lower priority endings...
      if (route === higherRoutes[higherRoutes.length - 1] && capturedByLower) {
        // Every route that matches this ending also matches a lower-priority one
        // The higher-priority rule is useless (never differentiates)
        errors.push({
          code: 'COVERAGE_USELESS_PRIORITY',
          severity: 'blocking',
          location: `endings[${higherPriority.id}]`,
          message: `Regra de desfecho "${higherPriority.name}" (prioridade ${higherPriority.evaluationOrder}) é inutilizada — todas suas rotas também são capturadas por regras de menor prioridade`,
          category: 'coverage',
        })
      }
    }
  }

  // --- Criterion 20: ending condition depends on out-of-domain state ---
  for (const ending of caseFile.endings) {
    const violations = checkConditionDomainViolations(ending.condition, stateDefMap)
    for (const v of violations) {
      errors.push({
        code: 'COVERAGE_CONDITION_OUT_OF_DOMAIN',
        severity: 'blocking',
        location: `endings[${ending.id}].condition`,
        message: `Condição de desfecho "${ending.name}" depende de valor fora do domínio: ${v}`,
        category: 'coverage',
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
  }
}

// === Helper: detect contradictions in a condition ===

/**
 * Checks for obvious contradictions within a single condition expression.
 * A contradiction occurs when:
 * - An 'and' contains both eq(state, X) and eq(state, Y) where X !== Y
 * - An 'and' contains both gt(state, X) and lt(state, Y) where X >= Y
 * - An 'and' contains eq(state, X) and neq(state, X)
 * - An 'and' contains isNull(state) and isNotNull(state)
 */
function hasContradiction(
  condition: ConditionExpression,
  stateDefMap: Map<string, StateDefinition>,
): boolean {
  if (condition.op !== 'and') {
    // Only check within 'and' for contradictions at top level
    if (condition.op === 'or' || condition.op === 'not') {
      // Recurse into sub-conditions
      if (condition.op === 'or') {
        // An 'or' with all contradictory branches is itself contradictory
        return condition.conditions.every((c) => hasContradiction(c, stateDefMap))
      }
      return hasContradiction(condition.condition, stateDefMap)
    }
    return false
  }

  // Flatten nested 'and' conditions
  const flatConditions = flattenAnd(condition)

  // Group by state
  const byState = new Map<string, ConditionExpression[]>()
  for (const c of flatConditions) {
    if ('state' in c) {
      const list = byState.get(c.state) ?? []
      list.push(c)
      byState.set(c.state, list)
    }
  }

  // Check each state for contradictions
  for (const [stateName, conditions] of byState) {
    const def = stateDefMap.get(stateName)

    // Check eq vs eq with different values
    const eqConditions = conditions.filter((c) => c.op === 'eq') as Array<{ op: 'eq'; state: string; value: unknown }>
    if (eqConditions.length >= 2) {
      const values = eqConditions.map((c) => c.value)
      if (new Set(values.map(String)).size > 1) return true
    }

    // Check eq vs neq with same value
    const neqConditions = conditions.filter((c) => c.op === 'neq') as Array<{ op: 'neq'; state: string; value: unknown }>
    for (const eq of eqConditions) {
      for (const neq of neqConditions) {
        if (eq.value === neq.value) return true
      }
    }

    // Check isNull vs isNotNull
    const hasIsNull = conditions.some((c) => c.op === 'isNull')
    const hasIsNotNull = conditions.some((c) => c.op === 'isNotNull')
    if (hasIsNull && hasIsNotNull) return true

    // Check isNull vs eq(non-null) or isNotNull vs eq(null)
    if (hasIsNull && eqConditions.some((c) => c.value !== null)) return true
    if (hasIsNotNull && eqConditions.some((c) => c.value === null)) return true

    // Check gt vs lt contradictions
    const gtConditions = conditions.filter((c) => c.op === 'gt' || c.op === 'gte') as Array<{ op: 'gt' | 'gte'; state: string; value: number }>
    const ltConditions = conditions.filter((c) => c.op === 'lt' || c.op === 'lte') as Array<{ op: 'lt' | 'lte'; state: string; value: number }>
    for (const gt of gtConditions) {
      for (const lt of ltConditions) {
        const lowerBound = gt.op === 'gt' ? gt.value + 1 : gt.value
        const upperBound = lt.op === 'lt' ? lt.value - 1 : lt.value
        if (lowerBound > upperBound) return true
      }
    }

    // Check if domain makes condition impossible
    if (def && def.type === 'integer') {
      for (const gt of gtConditions) {
        if (def.maximum !== undefined) {
          const minRequired = gt.op === 'gt' ? gt.value + 1 : gt.value
          if (minRequired > def.maximum) return true
        }
      }
      for (const lt of ltConditions) {
        if (def.minimum !== undefined) {
          const maxRequired = lt.op === 'lt' ? lt.value - 1 : lt.value
          if (maxRequired < def.minimum) return true
        }
      }
    }
  }

  // Recurse into nested and/or within this and
  for (const c of flatConditions) {
    if (c.op === 'and' || c.op === 'or' || c.op === 'not') {
      if (hasContradiction(c, stateDefMap)) return true
    }
  }

  return false
}

function flattenAnd(condition: ConditionExpression): ConditionExpression[] {
  if (condition.op === 'and') {
    return condition.conditions.flatMap(flattenAnd)
  }
  return [condition]
}
