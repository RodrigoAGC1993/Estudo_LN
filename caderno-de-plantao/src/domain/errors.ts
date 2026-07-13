/**
 * Domain — Error Classes
 *
 * Typed error classes for different failure modes.
 * All extend the base Error class for stack trace support.
 */

/** Thrown when content data is logically invalid at runtime (e.g., domain violation, no ending matched). */
export class ContentRuntimeError extends Error {
  override readonly name = 'ContentRuntimeError'
  readonly code: string
  readonly location?: string

  constructor(message: string, code: string, location?: string) {
    super(message)
    this.code = code
    if (location !== undefined) {
      this.location = location
    }
  }
}

/** Thrown when persistence operations fail (localStorage unavailable, quota exceeded). */
export class PersistenceError extends Error {
  override readonly name = 'PersistenceError'
  override readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.cause = cause
  }
}

/** Thrown when a saved session is incompatible with the current case/schema version. */
export class IncompatibleSaveError extends Error {
  override readonly name = 'IncompatibleSaveError'
  readonly savedVersion: string
  readonly currentVersion: string

  constructor(message: string, savedVersion: string, currentVersion: string) {
    super(message)
    this.savedVersion = savedVersion
    this.currentVersion = currentVersion
  }
}

/** Thrown when the engine receives an invalid command (e.g., wrong nodeId, already confirmed). */
export class InvalidCommandError extends Error {
  override readonly name = 'InvalidCommandError'
  readonly command: string

  constructor(message: string, command: string) {
    super(message)
    this.command = command
  }
}

/** Thrown for unexpected internal errors that should not occur in normal operation. */
export class UnexpectedEngineError extends Error {
  override readonly name = 'UnexpectedEngineError'
  override readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.cause = cause
  }
}
