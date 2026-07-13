/**
 * Domain Types — Content Validation
 * Design §4.12
 *
 * Used by the structural validator to report errors and warnings.
 * Validation runs at build time, never in production runtime.
 */

export interface ContentValidationResult {
  isValid: boolean
  errors: ContentValidationError[]
  warnings: ContentValidationWarning[]
}

export interface ContentValidationError {
  code: string
  severity: 'blocking'
  location: string
  message: string
  category: 'structural' | 'graph' | 'domain' | 'coverage'
}

export interface ContentValidationWarning {
  code: string
  severity: 'editorial' | 'clinical' | 'quality'
  location: string
  message: string
}
