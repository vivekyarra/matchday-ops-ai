import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CHALLENGE_CONTEXT,
  CHALLENGE_ID,
  CHALLENGE_PROBLEM_STATEMENT,
  CHALLENGE_VERTICAL,
  challengeAudiences,
  challengeCapabilities,
} from '../src/shared/constants'
import { challengeAlignmentEvidence, evaluationEvidence } from '../src/shared/evaluation'

const readme = readFileSync(join(process.cwd(), 'README.md'), 'utf8').toLowerCase()

describe('Challenge 4 alignment', () => {
  it('keeps the exact problem statement in submission documentation', () => {
    expect(CHALLENGE_ID).toBe('Challenge 4')
    expect(CHALLENGE_VERTICAL).toBe('Smart Stadiums & Tournament Operations')
    expect(CHALLENGE_CONTEXT).toBe('FIFA World Cup 2026')
    expect(readme).toContain(CHALLENGE_PROBLEM_STATEMENT.toLowerCase())
  })

  it('documents every named audience and capability from the problem statement', () => {
    for (const audience of challengeAudiences) {
      expect(readme).toContain(audience)
    }

    for (const capability of challengeCapabilities) {
      expect(readme).toContain(capability)
    }
  })

  it('maps every Challenge 4 audience and capability to implementation evidence', () => {
    const requirements = challengeAlignmentEvidence.map((item) => item.requirement)
    const alignment = evaluationEvidence.problemStatementAlignment

    expect(alignment.targetScore).toBe(100)
    expect(alignment.coverage.complete).toBe(true)
    expect(alignment.coverage.missingRequirements).toEqual([])
    expect(new Set(requirements).size).toBe(requirements.length)

    for (const audience of challengeAudiences) {
      expect(requirements).toContain(audience)
    }

    for (const capability of challengeCapabilities) {
      expect(requirements).toContain(capability)
    }

    for (const item of challengeAlignmentEvidence) {
      expect(item.implementation.length).toBeGreaterThan(40)
      expect(item.sourcePaths.length).toBeGreaterThan(0)
    }
  })
})
