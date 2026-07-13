/**
 * Application Composition — Wiring de dependências, bootstrap, Service Worker.
 * Único ponto que instancia implementações concretas.
 */
export { init, handleStart, handleResume, handleRestart, handleContinueNarrative, checkSaveStatus } from './bootstrap'
export type { SaveDetectionStatus } from './bootstrap'
export { initMultiTabDetection } from './multi-tab'
