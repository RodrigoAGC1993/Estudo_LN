/**
 * Validation — Structural Validator
 * Design §15.2, §15.2.1
 *
 * Validates a CaseFile against structural, graph, and domain criteria.
 * Criteria implemented: 1-7, 14-16, 21-22, 23-28.
 * Criteria 8-13, 17-20 are coverage/domain criteria handled by the domain/coverage validator.
 */

import type { CaseFile } from '@domain/case-file'
import type { NarrativeNode, DecisionNode } from '@domain/narrative-nodes'
import type {
  ConditionExpression,
  StateDefinition,
  StateEffect,
  TransitionDefinition,
} from '@domain/types'
import type {
  ContentValidationResult,
  ContentValidationError,
  ContentValidationWarning,
} from '@domain/validation'

const SUPPORTED_SCHEMA_VERSION = '1.0.0'

/**
 * Validates the structural integrity of a CaseFile.
 *
 * @param caseFile - The case file to validate
 * @param mode - 'draft' or 'production'; controls severity of certain checks
 * @returns ContentValidationResult with errors and warnings
 */
export function validateStructure(
  caseFile: CaseFile,
  mode: 'draft' | 'production' = 'draft',
): ContentValidationResult {
  const errors: ContentValidationError[] = []
  const warnings: ContentValidationWarning[] = []

  // Criterion 15: missing required metadata
  checkRequiredMetadata(caseFile, errors)

  // Criterion 16: incompatible schema version
  checkSchemaVersion(caseFile, errors)

  // Criterion 1: duplicate IDs
  checkDuplicateIds(caseFile, errors)

  // Criterion 14: decision nodes with < 3 choices
  checkMinimumChoices(caseFile, errors)

  // Criterion 6: references to undeclared states
  checkUndeclaredStateReferences(caseFile, errors)

  // Criterion 7: effects incompatible with state type
  checkEffectTypeCompatibility(caseFile, errors)

  // Criterion 4: choices without defined destination
  checkChoiceDestinations(caseFile, errors)

  // Graph criteria (2, 3, 5) — build adjacency and do BFS/DFS
  checkGraphIntegrity(caseFile, errors)

  // Criterion 21: beat interpessoal ausente
  checkInterpersonalBeatCoverage(caseFile, mode, errors, warnings)

  // Criterion 22: provisional content in production
  checkProvisionalContent(caseFile, warnings)

  // Criteria 23-28: design-specific structural validations
  checkDesignSpecificCriteria(caseFile, errors)

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

// ─── Criterion 15: Required Metadata ─────────────────────────────────────────

function checkRequiredMetadata(caseFile: CaseFile, errors: ContentValidationError[]): void {
  if (!caseFile.schemaVersion) {
    errors.push({
      code: 'MISSING_SCHEMA_VERSION',
      severity: 'blocking',
      location: 'schemaVersion',
      message: 'schemaVersion é obrigatório',
      category: 'structural',
    })
  }
  if (!caseFile.caseId) {
    errors.push({
      code: 'MISSING_CASE_ID',
      severity: 'blocking',
      location: 'caseId',
      message: 'caseId é obrigatório',
      category: 'structural',
    })
  }
  if (!caseFile.startNodeId) {
    errors.push({
      code: 'MISSING_START_NODE_ID',
      severity: 'blocking',
      location: 'startNodeId',
      message: 'startNodeId é obrigatório',
      category: 'structural',
    })
  }
  if (!caseFile.endings || caseFile.endings.length === 0) {
    errors.push({
      code: 'NO_ENDINGS_DEFINED',
      severity: 'blocking',
      location: 'endings',
      message: 'Pelo menos um desfecho deve ser definido',
      category: 'structural',
    })
  }
}

// ─── Criterion 16: Schema Version ───────────────────────────────────────────

function checkSchemaVersion(caseFile: CaseFile, errors: ContentValidationError[]): void {
  if (caseFile.schemaVersion && caseFile.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    errors.push({
      code: 'INCOMPATIBLE_SCHEMA_VERSION',
      severity: 'blocking',
      location: 'schemaVersion',
      message: `Versão de schema "${caseFile.schemaVersion}" incompatível. Suportada: "${SUPPORTED_SCHEMA_VERSION}"`,
      category: 'structural',
    })
  }
}

// ─── Criterion 1: Duplicate IDs ─────────────────────────────────────────────

function checkDuplicateIds(caseFile: CaseFile, errors: ContentValidationError[]): void {
  // Check node IDs
  const nodeIds = new Set<string>()
  for (let i = 0; i < caseFile.nodes.length; i++) {
    const node = caseFile.nodes[i]!
    if (nodeIds.has(node.id)) {
      errors.push({
        code: 'DUPLICATE_NODE_ID',
        severity: 'blocking',
        location: `nodes[${i}].id`,
        message: `Identificador de nó duplicado: "${node.id}"`,
        category: 'structural',
      })
    }
    nodeIds.add(node.id)
  }

  // Check choice IDs (globally unique)
  const choiceIds = new Set<string>()
  for (let i = 0; i < caseFile.nodes.length; i++) {
    const node = caseFile.nodes[i]!
    if (node.kind === 'decision') {
      for (let j = 0; j < node.choices.length; j++) {
        const choice = node.choices[j]!
        if (choiceIds.has(choice.id)) {
          errors.push({
            code: 'DUPLICATE_CHOICE_ID',
            severity: 'blocking',
            location: `nodes[${i}].choices[${j}].id`,
            message: `Identificador de escolha duplicado: "${choice.id}"`,
            category: 'structural',
          })
        }
        choiceIds.add(choice.id)
      }
    }
  }

  // Check state names
  const stateNames = new Set<string>()
  for (let i = 0; i < caseFile.states.length; i++) {
    const state = caseFile.states[i]!
    if (stateNames.has(state.name)) {
      errors.push({
        code: 'DUPLICATE_STATE_NAME',
        severity: 'blocking',
        location: `states[${i}].name`,
        message: `Nome de estado duplicado: "${state.name}"`,
        category: 'structural',
      })
    }
    stateNames.add(state.name)
  }
}

// ─── Criterion 14: Minimum Choices ──────────────────────────────────────────

function checkMinimumChoices(caseFile: CaseFile, errors: ContentValidationError[]): void {
  for (let i = 0; i < caseFile.nodes.length; i++) {
    const node = caseFile.nodes[i]!
    if (node.kind === 'decision' && node.choices.length < 3) {
      errors.push({
        code: 'INSUFFICIENT_CHOICES',
        severity: 'blocking',
        location: `nodes[${i}]`,
        message: `Nó de decisão "${node.id}" possui ${node.choices.length} escolha(s), mínimo é 3`,
        category: 'structural',
      })
    }
  }
}

// ─── Criterion 6: Undeclared State References ───────────────────────────────

function checkUndeclaredStateReferences(
  caseFile: CaseFile,
  errors: ContentValidationError[],
): void {
  const declaredStates = new Set(caseFile.states.map((s) => s.name))

  // Check effects in choices
  for (let i = 0; i < caseFile.nodes.length; i++) {
    const node = caseFile.nodes[i]!
    if (node.kind === 'decision') {
      for (let j = 0; j < node.choices.length; j++) {
        const choice = node.choices[j]!
        for (let k = 0; k < choice.effects.length; k++) {
          const effect = choice.effects[k]!
          if (!declaredStates.has(effect.target)) {
            errors.push({
              code: 'UNDECLARED_STATE_IN_EFFECT',
              severity: 'blocking',
              location: `nodes[${i}].choices[${j}].effects[${k}]`,
              message: `Efeito referencia estado não declarado: "${effect.target}"`,
              category: 'structural',
            })
          }
        }
      }
    }
  }

  // Check conditions in endings
  for (let i = 0; i < caseFile.endings.length; i++) {
    const ending = caseFile.endings[i]!
    const undeclaredInCondition = findUndeclaredStatesInCondition(ending.condition, declaredStates)
    for (const stateName of undeclaredInCondition) {
      errors.push({
        code: 'UNDECLARED_STATE_IN_CONDITION',
        severity: 'blocking',
        location: `endings[${i}].condition`,
        message: `Condição de desfecho referencia estado não declarado: "${stateName}"`,
        category: 'structural',
      })
    }
  }

  // Check conditions in transitions (conditional branches)
  for (let i = 0; i < caseFile.nodes.length; i++) {
    const node = caseFile.nodes[i]!
    if (node.kind === 'decision') {
      for (let j = 0; j < node.choices.length; j++) {
        const choice = node.choices[j]!
        checkTransitionConditions(choice.transition, declaredStates, `nodes[${i}].choices[${j}].transition`, errors)
      }
    } else if (node.kind === 'progression') {
      checkTransitionConditions(node.transition, declaredStates, `nodes[${i}].transition`, errors)
    }
  }

  // Check conditions in interpersonal beats
  for (let i = 0; i < caseFile.interpersonalBeats.length; i++) {
    const beat = caseFile.interpersonalBeats[i]!
    const undeclaredInBand = findUndeclaredStatesInCondition(beat.bandCondition, declaredStates)
    for (const stateName of undeclaredInBand) {
      errors.push({
        code: 'UNDECLARED_STATE_IN_CONDITION',
        severity: 'blocking',
        location: `interpersonalBeats[${i}].bandCondition`,
        message: `Condição de beat referencia estado não declarado: "${stateName}"`,
        category: 'structural',
      })
    }
    if (beat.deferredActivationCondition) {
      const undeclaredInDeferred = findUndeclaredStatesInCondition(
        beat.deferredActivationCondition,
        declaredStates,
      )
      for (const stateName of undeclaredInDeferred) {
        errors.push({
          code: 'UNDECLARED_STATE_IN_CONDITION',
          severity: 'blocking',
          location: `interpersonalBeats[${i}].deferredActivationCondition`,
          message: `Condição de ativação diferida referencia estado não declarado: "${stateName}"`,
          category: 'structural',
        })
      }
    }
  }
}

function checkTransitionConditions(
  transition: TransitionDefinition,
  declaredStates: Set<string>,
  basePath: string,
  errors: ContentValidationError[],
): void {
  if (transition.kind === 'conditional') {
    for (let b = 0; b < transition.branches.length; b++) {
      const branch = transition.branches[b]!
      const undeclared = findUndeclaredStatesInCondition(branch.condition, declaredStates)
      for (const stateName of undeclared) {
        errors.push({
          code: 'UNDECLARED_STATE_IN_CONDITION',
          severity: 'blocking',
          location: `${basePath}.branches[${b}].condition`,
          message: `Condição de transição referencia estado não declarado: "${stateName}"`,
          category: 'structural',
        })
      }
    }
  }
}

function findUndeclaredStatesInCondition(
  condition: ConditionExpression,
  declaredStates: Set<string>,
): string[] {
  const undeclared: string[] = []

  function walk(cond: ConditionExpression): void {
    switch (cond.op) {
      case 'eq':
      case 'neq':
      case 'gt':
      case 'gte':
      case 'lt':
      case 'lte':
      case 'isNull':
      case 'isNotNull':
        if (!declaredStates.has(cond.state)) {
          undeclared.push(cond.state)
        }
        break
      case 'and':
      case 'or':
        for (const sub of cond.conditions) {
          walk(sub)
        }
        break
      case 'not':
        walk(cond.condition)
        break
    }
  }

  walk(condition)
  return undeclared
}

// ─── Criterion 7: Effect Type Compatibility ─────────────────────────────────

function checkEffectTypeCompatibility(
  caseFile: CaseFile,
  errors: ContentValidationError[],
): void {
  const stateMap = new Map<string, StateDefinition>()
  for (const state of caseFile.states) {
    stateMap.set(state.name, state)
  }

  for (let i = 0; i < caseFile.nodes.length; i++) {
    const node = caseFile.nodes[i]!
    if (node.kind === 'decision') {
      for (let j = 0; j < node.choices.length; j++) {
        const choice = node.choices[j]!
        for (let k = 0; k < choice.effects.length; k++) {
          const effect = choice.effects[k]!
          const stateDef = stateMap.get(effect.target)
          if (!stateDef) continue // already reported by criterion 6

          validateEffectCompatibility(effect, stateDef, `nodes[${i}].choices[${j}].effects[${k}]`, errors)
        }
      }
    }
  }
}

function validateEffectCompatibility(
  effect: StateEffect,
  stateDef: StateDefinition,
  location: string,
  errors: ContentValidationError[],
): void {
  switch (effect.operation) {
    case 'increment':
    case 'decrement':
      if (stateDef.type !== 'integer') {
        errors.push({
          code: 'INCOMPATIBLE_EFFECT_TYPE',
          severity: 'blocking',
          location,
          message: `Operação "${effect.operation}" é incompatível com estado "${stateDef.name}" do tipo "${stateDef.type}" (apenas integer permite increment/decrement)`,
          category: 'domain',
        })
      }
      break
    case 'set':
      switch (stateDef.type) {
        case 'integer':
          if (typeof effect.value !== 'number') {
            errors.push({
              code: 'INCOMPATIBLE_EFFECT_TYPE',
              severity: 'blocking',
              location,
              message: `Operação "set" para estado inteiro "${stateDef.name}" requer valor numérico, recebeu ${typeof effect.value}`,
              category: 'domain',
            })
          }
          break
        case 'boolean':
          if (typeof effect.value !== 'boolean') {
            errors.push({
              code: 'INCOMPATIBLE_EFFECT_TYPE',
              severity: 'blocking',
              location,
              message: `Operação "set" para estado booleano "${stateDef.name}" requer valor booleano, recebeu ${typeof effect.value}`,
              category: 'domain',
            })
          }
          break
        case 'nullable_boolean':
          if (effect.value !== null && typeof effect.value !== 'boolean') {
            errors.push({
              code: 'INCOMPATIBLE_EFFECT_TYPE',
              severity: 'blocking',
              location,
              message: `Operação "set" para estado nullable_boolean "${stateDef.name}" requer boolean ou null, recebeu ${typeof effect.value}`,
              category: 'domain',
            })
          }
          break
        case 'enum':
          if (typeof effect.value !== 'string') {
            errors.push({
              code: 'INCOMPATIBLE_EFFECT_TYPE',
              severity: 'blocking',
              location,
              message: `Operação "set" para estado enum "${stateDef.name}" requer valor string, recebeu ${typeof effect.value}`,
              category: 'domain',
            })
          } else if (stateDef.enumValues && !stateDef.enumValues.includes(effect.value)) {
            errors.push({
              code: 'INCOMPATIBLE_EFFECT_TYPE',
              severity: 'blocking',
              location,
              message: `Valor "${effect.value}" não pertence aos valores permitidos do enum "${stateDef.name}": [${stateDef.enumValues.join(', ')}]`,
              category: 'domain',
            })
          }
          break
      }
      break
  }
}

// ─── Criterion 4: Choice Destinations ───────────────────────────────────────

function checkChoiceDestinations(caseFile: CaseFile, errors: ContentValidationError[]): void {
  const nodeIds = new Set(caseFile.nodes.map((n) => n.id))

  for (let i = 0; i < caseFile.nodes.length; i++) {
    const node = caseFile.nodes[i]!
    if (node.kind === 'decision') {
      for (let j = 0; j < node.choices.length; j++) {
        const choice = node.choices[j]!
        checkTransitionTargets(choice.transition, nodeIds, `nodes[${i}].choices[${j}].transition`, errors)
      }
    } else if (node.kind === 'progression') {
      checkTransitionTargets(node.transition, nodeIds, `nodes[${i}].transition`, errors)
    }
  }
}

function checkTransitionTargets(
  transition: TransitionDefinition,
  nodeIds: Set<string>,
  basePath: string,
  errors: ContentValidationError[],
): void {
  if (transition.kind === 'direct') {
    if (!nodeIds.has(transition.targetNodeId)) {
      errors.push({
        code: 'INVALID_TRANSITION_TARGET',
        severity: 'blocking',
        location: basePath,
        message: `Transição referencia nó inexistente: "${transition.targetNodeId}"`,
        category: 'structural',
      })
    }
  } else {
    // conditional
    for (let b = 0; b < transition.branches.length; b++) {
      const branch = transition.branches[b]!
      if (!nodeIds.has(branch.targetNodeId)) {
        errors.push({
          code: 'INVALID_TRANSITION_TARGET',
          severity: 'blocking',
          location: `${basePath}.branches[${b}]`,
          message: `Branch de transição referencia nó inexistente: "${branch.targetNodeId}"`,
          category: 'structural',
        })
      }
    }
    if (!nodeIds.has(transition.fallbackNodeId)) {
      errors.push({
        code: 'INVALID_TRANSITION_TARGET',
        severity: 'blocking',
        location: `${basePath}.fallbackNodeId`,
        message: `Fallback de transição referencia nó inexistente: "${transition.fallbackNodeId}"`,
        category: 'structural',
      })
    }
  }
}

// ─── Criteria 2, 3, 5: Graph Integrity ──────────────────────────────────────

function checkGraphIntegrity(caseFile: CaseFile, errors: ContentValidationError[]): void {
  const nodeMap = new Map<string, NarrativeNode>()
  for (const node of caseFile.nodes) {
    nodeMap.set(node.id, node)
  }

  if (!nodeMap.has(caseFile.startNodeId)) {
    errors.push({
      code: 'INVALID_START_NODE',
      severity: 'blocking',
      location: 'startNodeId',
      message: `startNodeId "${caseFile.startNodeId}" não referencia um nó existente`,
      category: 'graph',
    })
    return
  }

  // Build adjacency list (outgoing edges)
  const adjacency = buildAdjacencyList(caseFile)

  // Criterion 2: unreachable nodes from startNodeId (BFS)
  const reachable = bfs(caseFile.startNodeId, adjacency)
  for (const node of caseFile.nodes) {
    if (!reachable.has(node.id)) {
      errors.push({
        code: 'UNREACHABLE_NODE',
        severity: 'blocking',
        location: `node:"${node.id}"`,
        message: `Nó "${node.id}" é inalcançável a partir do nó inicial "${caseFile.startNodeId}"`,
        category: 'graph',
      })
    }
  }

  // Criterion 3: dead-end nodes (no outgoing edges, not ending/debriefing/outcome_resolution)
  for (const node of caseFile.nodes) {
    const outgoing = adjacency.get(node.id)
    if ((!outgoing || outgoing.length === 0) && !isTerminalNode(node)) {
      errors.push({
        code: 'DEAD_END_NODE',
        severity: 'blocking',
        location: `node:"${node.id}"`,
        message: `Nó "${node.id}" não possui saída e não é nó terminal (ending/debriefing/outcome_resolution)`,
        category: 'graph',
      })
    }
  }

  // Criterion 5: unauthorized cycles (BFS-based cycle detection via DFS coloring)
  const cycles = detectCycles(caseFile.nodes, adjacency)
  for (const cycle of cycles) {
    errors.push({
      code: 'UNAUTHORIZED_CYCLE',
      severity: 'blocking',
      location: `node:"${cycle}"`,
      message: `Ciclo não autorizado detectado envolvendo nó "${cycle}"`,
      category: 'graph',
    })
  }
}

function buildAdjacencyList(caseFile: CaseFile): Map<string, string[]> {
  const adjacency = new Map<string, string[]>()

  for (const node of caseFile.nodes) {
    const targets: string[] = []

    switch (node.kind) {
      case 'decision':
        for (const choice of node.choices) {
          collectTransitionTargets(choice.transition, targets)
        }
        break
      case 'progression':
        collectTransitionTargets(node.transition, targets)
        break
      case 'ending':
        targets.push(node.nextNodeId)
        break
      case 'outcome_resolution':
        // OutcomeResolutionNode connects to all EndingNodes
        for (const endingNode of caseFile.nodes) {
          if (endingNode.kind === 'ending') {
            targets.push(endingNode.id)
          }
        }
        break
      case 'debriefing':
        // Terminal node — no outgoing edges
        break
    }

    adjacency.set(node.id, targets)
  }

  return adjacency
}

function collectTransitionTargets(transition: TransitionDefinition, targets: string[]): void {
  if (transition.kind === 'direct') {
    targets.push(transition.targetNodeId)
  } else {
    for (const branch of transition.branches) {
      targets.push(branch.targetNodeId)
    }
    targets.push(transition.fallbackNodeId)
  }
}

function bfs(startId: string, adjacency: Map<string, string[]>): Set<string> {
  const visited = new Set<string>()
  const queue: string[] = [startId]
  visited.add(startId)

  while (queue.length > 0) {
    const current = queue.shift()!
    const neighbors = adjacency.get(current) ?? []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push(neighbor)
      }
    }
  }

  return visited
}

function isTerminalNode(node: NarrativeNode): boolean {
  return node.kind === 'ending' || node.kind === 'debriefing' || node.kind === 'outcome_resolution'
}

function detectCycles(nodes: NarrativeNode[], adjacency: Map<string, string[]>): string[] {
  // DFS coloring: 0=white (unvisited), 1=gray (in stack), 2=black (done)
  const color = new Map<string, number>()
  for (const node of nodes) {
    color.set(node.id, 0)
  }

  const cycleNodes: string[] = []

  function dfs(nodeId: string): boolean {
    color.set(nodeId, 1) // gray — in current path

    const neighbors = adjacency.get(nodeId) ?? []
    for (const neighbor of neighbors) {
      const neighborColor = color.get(neighbor)
      if (neighborColor === 1) {
        // Back edge found — cycle detected
        cycleNodes.push(neighbor)
        return true
      }
      if (neighborColor === 0) {
        if (dfs(neighbor)) {
          return true
        }
      }
    }

    color.set(nodeId, 2) // black — done
    return false
  }

  for (const node of nodes) {
    if (color.get(node.id) === 0) {
      dfs(node.id)
    }
  }

  return cycleNodes
}

// ─── Criterion 21: Interpersonal Beat Coverage ──────────────────────────────

function checkInterpersonalBeatCoverage(
  caseFile: CaseFile,
  mode: 'draft' | 'production',
  errors: ContentValidationError[],
  warnings: ContentValidationWarning[],
): void {
  const bands: Array<'negative' | 'neutral' | 'positive'> = ['negative', 'neutral', 'positive']

  // Find all decision nodes
  const decisionNodes = caseFile.nodes.filter(
    (n): n is DecisionNode => n.kind === 'decision',
  )

  for (const node of decisionNodes) {
    // Find all beats for this node
    const nodeBeats = caseFile.interpersonalBeats.filter(
      (b) => b.sourceNodeId === node.id,
    )

    for (const band of bands) {
      const hasBand = nodeBeats.some((b) => b.band === band)
      if (!hasBand) {
        if (mode === 'production') {
          errors.push({
            code: 'MISSING_BEAT_FOR_BAND',
            severity: 'blocking',
            location: `node:"${node.id}"`,
            message: `Nó de decisão "${node.id}" não possui beat interpessoal para a banda "${band}"`,
            category: 'structural',
          })
        } else {
          warnings.push({
            code: 'MISSING_BEAT_FOR_BAND',
            severity: 'editorial',
            location: `node:"${node.id}"`,
            message: `Nó de decisão "${node.id}" não possui beat interpessoal para a banda "${band}"`,
          })
        }
      }
    }
  }
}

// ─── Criterion 22: Provisional Content ──────────────────────────────────────

function checkProvisionalContent(
  caseFile: CaseFile,
  warnings: ContentValidationWarning[],
): void {
  if (caseFile.provisionalContent && caseFile.provisionalContent.length > 0) {
    for (const item of caseFile.provisionalContent) {
      warnings.push({
        code: 'PROVISIONAL_CONTENT',
        severity: 'editorial',
        location: `provisionalContent`,
        message: `Conteúdo provisório presente: "${item}"`,
      })
    }
  }
}

// ─── Criteria 23-28: Design-Specific Structural Validations ─────────────────

function checkDesignSpecificCriteria(
  caseFile: CaseFile,
  errors: ContentValidationError[],
): void {
  const nodeMap = new Map<string, NarrativeNode>()
  for (const node of caseFile.nodes) {
    nodeMap.set(node.id, node)
  }

  // Collect all choice IDs for reference validation
  const allChoiceIds = new Set<string>()
  for (const node of caseFile.nodes) {
    if (node.kind === 'decision') {
      for (const choice of node.choices) {
        allChoiceIds.add(choice.id)
      }
    }
  }

  // Criterion 23: DecisionNode, EndingNode, DebriefingNode must have non-empty title
  for (let i = 0; i < caseFile.nodes.length; i++) {
    const node = caseFile.nodes[i]!
    if (node.kind === 'decision' || node.kind === 'ending' || node.kind === 'debriefing') {
      const title = node.presentationMetadata.title
      if (!title || title.trim().length === 0) {
        errors.push({
          code: 'EMPTY_PRESENTATION_TITLE',
          severity: 'blocking',
          location: `nodes[${i}].presentationMetadata.title`,
          message: `Nó "${node.id}" (${node.kind}) deve possuir presentationMetadata.title não vazio`,
          category: 'structural',
        })
      }
    }
  }

  // Criterion 24: InterpersonalBeat.sourceChoiceIds references valid choices
  for (let i = 0; i < caseFile.interpersonalBeats.length; i++) {
    const beat = caseFile.interpersonalBeats[i]!
    if (beat.sourceChoiceIds && beat.sourceChoiceIds.length > 0) {
      // The sourceNodeId must be a decision node
      const sourceNode = nodeMap.get(beat.sourceNodeId)
      if (sourceNode && sourceNode.kind === 'decision') {
        const nodeChoiceIds = new Set(sourceNode.choices.map((c) => c.id))
        for (const choiceId of beat.sourceChoiceIds) {
          if (!nodeChoiceIds.has(choiceId)) {
            errors.push({
              code: 'INVALID_BEAT_SOURCE_CHOICE',
              severity: 'blocking',
              location: `interpersonalBeats[${i}].sourceChoiceIds`,
              message: `Beat "${beat.id}" referencia choiceId "${choiceId}" inexistente no nó "${beat.sourceNodeId}"`,
              category: 'structural',
            })
          }
        }
      }
    } else if (beat.sourceChoiceIds && beat.sourceChoiceIds.length === 0) {
      errors.push({
        code: 'EMPTY_BEAT_SOURCE_CHOICES',
        severity: 'blocking',
        location: `interpersonalBeats[${i}].sourceChoiceIds`,
        message: `Beat "${beat.id}" possui sourceChoiceIds vazio (deve ser não-vazio se presente)`,
        category: 'structural',
      })
    }
  }

  // Criterion 25: DebriefingFragment.sourceChoiceIds references valid choices
  for (let i = 0; i < caseFile.debriefingFragments.length; i++) {
    const fragment = caseFile.debriefingFragments[i]!
    if (fragment.sourceChoiceIds && fragment.sourceChoiceIds.length > 0) {
      for (const choiceId of fragment.sourceChoiceIds) {
        if (!allChoiceIds.has(choiceId)) {
          errors.push({
            code: 'INVALID_FRAGMENT_SOURCE_CHOICE',
            severity: 'blocking',
            location: `debriefingFragments[${i}].sourceChoiceIds`,
            message: `Fragmento "${fragment.id}" referencia choiceId "${choiceId}" inexistente`,
            category: 'structural',
          })
        }
      }
    } else if (fragment.sourceChoiceIds && fragment.sourceChoiceIds.length === 0) {
      errors.push({
        code: 'EMPTY_FRAGMENT_SOURCE_CHOICES',
        severity: 'blocking',
        location: `debriefingFragments[${i}].sourceChoiceIds`,
        message: `Fragmento "${fragment.id}" possui sourceChoiceIds vazio (deve ser não-vazio se presente)`,
        category: 'structural',
      })
    }
  }

  // Criterion 26: InterpersonalBeat.eligibleNodeId references existing node
  for (let i = 0; i < caseFile.interpersonalBeats.length; i++) {
    const beat = caseFile.interpersonalBeats[i]!
    if (beat.eligibleNodeId && !nodeMap.has(beat.eligibleNodeId)) {
      errors.push({
        code: 'INVALID_BEAT_ELIGIBLE_NODE',
        severity: 'blocking',
        location: `interpersonalBeats[${i}].eligibleNodeId`,
        message: `Beat "${beat.id}" referencia eligibleNodeId "${beat.eligibleNodeId}" que não existe no grafo`,
        category: 'graph',
      })
    }
  }

  // Criterion 27: EndingNode.nextNodeId references a valid DebriefingNode
  for (let i = 0; i < caseFile.nodes.length; i++) {
    const node = caseFile.nodes[i]!
    if (node.kind === 'ending') {
      const targetNode = nodeMap.get(node.nextNodeId)
      if (!targetNode) {
        errors.push({
          code: 'INVALID_ENDING_NEXT_NODE',
          severity: 'blocking',
          location: `nodes[${i}].nextNodeId`,
          message: `EndingNode "${node.id}" referencia nextNodeId "${node.nextNodeId}" que não existe`,
          category: 'graph',
        })
      } else if (targetNode.kind !== 'debriefing') {
        errors.push({
          code: 'INVALID_ENDING_NEXT_NODE',
          severity: 'blocking',
          location: `nodes[${i}].nextNodeId`,
          message: `EndingNode "${node.id}" referencia nextNodeId "${node.nextNodeId}" que não é um DebriefingNode (é ${targetNode.kind})`,
          category: 'graph',
        })
      }
    }
  }

  // Criterion 28: EndingNode.endingId references a valid EndingDefinition
  const endingDefIds = new Set(caseFile.endings.map((e) => e.id))
  for (let i = 0; i < caseFile.nodes.length; i++) {
    const node = caseFile.nodes[i]!
    if (node.kind === 'ending') {
      if (!endingDefIds.has(node.endingId)) {
        errors.push({
          code: 'INVALID_ENDING_REFERENCE',
          severity: 'blocking',
          location: `nodes[${i}].endingId`,
          message: `EndingNode "${node.id}" referencia endingId "${node.endingId}" que não existe nas definições de desfecho`,
          category: 'structural',
        })
      }
    }
  }

  // Also check DebriefingNode.debriefingId references a valid DebriefingDefinition
  const debriefingDefIds = new Set(caseFile.debriefings.map((d) => d.id))
  for (let i = 0; i < caseFile.nodes.length; i++) {
    const node = caseFile.nodes[i]!
    if (node.kind === 'debriefing') {
      if (!debriefingDefIds.has(node.debriefingId)) {
        errors.push({
          code: 'INVALID_DEBRIEFING_REFERENCE',
          severity: 'blocking',
          location: `nodes[${i}].debriefingId`,
          message: `DebriefingNode "${node.id}" referencia debriefingId "${node.debriefingId}" que não existe nas definições de debriefing`,
          category: 'structural',
        })
      }
    }
  }

  // Check that OutcomeResolutionNode exists in the case file (at least one)
  const hasOutcomeResolution = caseFile.nodes.some((n) => n.kind === 'outcome_resolution')
  if (!hasOutcomeResolution) {
    errors.push({
      code: 'MISSING_OUTCOME_RESOLUTION_NODE',
      severity: 'blocking',
      location: 'nodes',
      message: 'O caso deve conter pelo menos um OutcomeResolutionNode',
      category: 'structural',
    })
  }
}
