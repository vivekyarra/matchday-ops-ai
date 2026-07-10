import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { evaluationEvidence } from '../src/shared/evaluation'
import { EvaluationEvidenceSchema } from '../src/shared/schemas'

function expectSourcePathsToExist(sourcePaths: string[]) {
  for (const sourcePath of sourcePaths) {
    expect(existsSync(join(process.cwd(), sourcePath)), sourcePath).toBe(true)
  }
}

describe('evaluation evidence contract', () => {
  it('matches the shared runtime schema', () => {
    expect(() => EvaluationEvidenceSchema.parse(evaluationEvidence)).not.toThrow()
  })

  it('proves complete Challenge 4 coverage from evidence rows', () => {
    const alignment = evaluationEvidence.problemStatementAlignment

    expect(alignment.coverage.complete).toBe(true)
    expect(alignment.coverage.missingRequirements).toEqual([])
    expect(alignment.coverage.coveredCount).toBe(alignment.coverage.requiredCount)
    expect(alignment.evidence).toHaveLength(alignment.coverage.requiredCount)
  })

  it('keeps every evaluation evidence source path valid', () => {
    for (const item of evaluationEvidence.problemStatementAlignment.evidence) {
      expectSourcePathsToExist(item.sourcePaths)
    }

    for (const item of evaluationEvidence.codeQuality.evidence) {
      expectSourcePathsToExist(item.sourcePaths)
    }
  })
})
