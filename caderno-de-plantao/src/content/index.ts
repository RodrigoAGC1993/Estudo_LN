/**
 * Content — Dados declarativos do caso (JSON).
 * Camada de dados puros, sem código executável.
 */
import caseData from './case-01.json'
import type { CaseFile } from '@domain/index'

export const case01: CaseFile = caseData as unknown as CaseFile
