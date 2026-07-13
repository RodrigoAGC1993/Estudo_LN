#!/usr/bin/env tsx
/**
 * Validation CLI — Runs structural + coverage validators on case-01.json.
 * Exits with code 1 on blocking errors.
 * Used in CI pipeline.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json -r tsconfig-paths/register scripts/validate-case.ts
 *   npm run validate
 */

import { case01 } from '../src/content/index'
import { validateStructure, validateCoverage } from '../src/validation/index'

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'draft'

console.log(`\n🔍 Validating case: ${case01.metadata.title} (${case01.caseId})`)
console.log(`   Mode: ${mode}\n`)

// Run structural validation
console.log('── Structural Validation ──')
const structural = validateStructure(case01, mode)
for (const err of structural.errors) {
  console.log(`  ❌ [${err.code}] ${err.location}: ${err.message}`)
}
for (const warn of structural.warnings) {
  console.log(`  ⚠️  [${warn.code}] ${warn.location}: ${warn.message}`)
}
console.log(`  Errors: ${structural.errors.length} | Warnings: ${structural.warnings.length}`)
console.log()

// Run coverage validation
console.log('── Coverage Validation ──')
const coverage = validateCoverage(case01)
for (const err of coverage.errors) {
  console.log(`  ❌ [${err.code}] ${err.location}: ${err.message}`)
}
console.log(`  Errors: ${coverage.errors.length}`)
console.log()

// Summary
const totalErrors = structural.errors.length + coverage.errors.length
if (totalErrors > 0) {
  console.log(`\n❌ VALIDATION FAILED — ${totalErrors} blocking error(s)`)
  process.exit(1)
} else {
  console.log(`\n✅ VALIDATION PASSED — Case "${case01.metadata.title}" is valid`)
  process.exit(0)
}
