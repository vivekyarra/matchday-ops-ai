import { describe, expect, it } from 'vitest'
import { buildSnapshot } from '../src/server/services/analytics'
import { createDecisionSupport } from '../src/server/services/aiDecisionService'
import type { LanguageCode } from '../src/shared/schemas'

const languages: LanguageCode[] = ['en', 'es', 'fr', 'ar', 'hi', 'pt']

describe('decision support service', () => {
  it('generates valid deterministic briefings for every supported language', async () => {
    const snapshot = buildSnapshot(new Date('2026-06-19T19:00:00.000Z'))

    for (const language of languages) {
      const response = await createDecisionSupport(
        {
          role: 'operations',
          language,
          urgency: 'high',
          prompt: 'Create a safe staff action plan for the busiest zone.',
          includePublicMessage: true,
        },
        snapshot,
      )

      expect(response.publicMessage.length).toBeGreaterThan(12)
      expect(response.source).toBe('demo-rules')
      expect(response.recommendedActions.length).toBeGreaterThanOrEqual(2)
      expect(response.assumptions).toContain('Human operators approve all public and staff actions before execution.')
    }
  })

  it('preserves Arabic output as real right-to-left text', async () => {
    const snapshot = buildSnapshot(new Date('2026-06-19T19:00:00.000Z'))
    const response = await createDecisionSupport(
      {
        role: 'operations',
        language: 'ar',
        urgency: 'high',
        prompt: 'Create a safe staff action plan for the busiest zone.',
        includePublicMessage: true,
      },
      snapshot,
    )

    expect(response.publicMessage).toMatch(/[\u0600-\u06ff]/)
  })
})
