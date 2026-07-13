/**
 * Checkpoint — Validate Case 01 file passes all 22+ criteria
 *
 * This integration test imports case01 from @content/index and runs
 * both structural and coverage validators, asserting the case file
 * is valid and reporting any errors/warnings.
 */
import { describe, it, expect } from 'vitest'
import { case01 } from '@content/index'
import { validateStructure, validateCoverage } from '@validation/index'

describe('Case 01 — Full Validation Checkpoint', () => {
  describe('Structural Validation (22+ criteria)', () => {
    it('should pass structural validation with no blocking errors', () => {
      const result = validateStructure(case01, 'draft')

      // Report details for debugging
      if (result.errors.length > 0) {
        console.log('\n=== STRUCTURAL ERRORS ===')
        for (const err of result.errors) {
          console.log(`  [${err.code}] ${err.location}: ${err.message}`)
        }
      }
      if (result.warnings.length > 0) {
        console.log('\n=== STRUCTURAL WARNINGS ===')
        for (const warn of result.warnings) {
          console.log(`  [${warn.code}] ${warn.location}: ${warn.message}`)
        }
      }

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Coverage Validation (route enumeration + domain)', () => {
    it('should pass coverage validation with no blocking errors', () => {
      const result = validateCoverage(case01)

      // Report details for debugging
      if (result.errors.length > 0) {
        console.log('\n=== COVERAGE ERRORS ===')
        for (const err of result.errors) {
          console.log(`  [${err.code}] ${err.location}: ${err.message}`)
        }
      }
      if (result.warnings.length > 0) {
        console.log('\n=== COVERAGE WARNINGS ===')
        for (const warn of result.warnings) {
          console.log(`  [${warn.code}] ${warn.location}: ${warn.message}`)
        }
      }

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })
})
