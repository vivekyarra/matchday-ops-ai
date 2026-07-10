import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildSnapshot } from '../src/server/services/analytics'
import { createDecisionSupport } from '../src/server/services/aiDecisionService'
import type { DecisionPayload, LanguageCode } from '../src/shared/schemas'

const languages: LanguageCode[] = ['en', 'es', 'fr', 'ar', 'hi', 'pt']

const geminiPayload: DecisionPayload = {
  summary: 'Operations should redirect arrival flow and keep lift support visible.',
  riskLevel: 'high',
  confidence: 0.91,
  recommendedActions: [
    {
      priority: 'now',
      owner: 'Crowd flow lead',
      action: 'Open the outer concourse bypass and place stewards at both decision points.',
      rationale: 'Queue and load pressure are highest on the east approach.',
      etaMinutes: 3,
    },
    {
      priority: 'next-5-min',
      owner: 'Transport desk',
      action: 'Send transit arrival guidance through the command-approved public channel.',
      rationale: 'Inbound transport pressure can be reduced before it reaches the gate line.',
      etaMinutes: 5,
    },
  ],
  publicMessage: 'For guests: please follow the signed calmer route and staff directions.',
  staffBriefing: 'Keep updates calm, confirm lane status, and report changes every five minutes.',
  accessibilityNote: 'Keep mobility support visible near the lift queue and accessible route entrance.',
  sustainabilityNote: 'Move cup-return volunteers closer to redirected concourse traffic.',
  assumptions: ['Uses only the supplied venue snapshot.', 'Human operators approve actions before execution.'],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

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

  it('marks repeated deterministic decisions as cache hits', async () => {
    const snapshot = buildSnapshot(new Date('2026-06-19T19:00:00.000Z'))
    const request = {
      role: 'operations' as const,
      language: 'en' as const,
      urgency: 'high' as const,
      prompt: 'Create a safe staff action plan for the current cache validation route.',
      includePublicMessage: true,
    }

    const first = await createDecisionSupport(request, snapshot)
    const second = await createDecisionSupport(request, snapshot)

    expect(first.cacheHit).toBe(false)
    expect(second.cacheHit).toBe(true)
    expect(second.source).toBe('demo-rules')
  })

  it('uses a valid Gemini response when a provider key is configured', async () => {
    const snapshot = buildSnapshot(new Date('2026-06-19T19:00:00.000Z'))
    const fetchMock = vi.fn(async (input: unknown, init?: unknown) => {
      const body = JSON.parse(String((init as { body?: unknown }).body))

      expect(String(input)).toContain('test-provider-key')
      expect(body.systemInstruction.parts[0].text).toContain('Challenge 4')
      expect(body.contents[0].parts[0].text).toContain('challengeAlignment')

      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify(geminiPayload) }],
              },
            },
          ],
        }),
        { status: 200 },
      )
    })

    vi.stubGlobal('fetch', fetchMock)

    const response = await createDecisionSupport(
      {
        role: 'operations',
        language: 'en',
        urgency: 'high',
        prompt: 'Create a Gemini-backed action plan for provider success coverage.',
        includePublicMessage: true,
      },
      snapshot,
      {
        geminiApiKey: 'test-provider-key',
        now: new Date('2026-06-19T19:05:00.000Z'),
      },
    )

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(response.source).toBe('gemini')
    expect(response.cacheHit).toBe(false)
    expect(response.generatedAt).toBe('2026-06-19T19:05:00.000Z')
    expect(response.summary).toBe(geminiPayload.summary)
  })

  it('falls back to deterministic guidance when the Gemini provider fails', async () => {
    const snapshot = buildSnapshot(new Date('2026-06-19T19:00:00.000Z'))
    const fetchMock = vi.fn(async () => new Response('{}', { status: 503 }))

    vi.stubGlobal('fetch', fetchMock)

    const response = await createDecisionSupport(
      {
        role: 'transport',
        language: 'en',
        urgency: 'critical',
        prompt: 'Create a Gemini-backed action plan for provider failure coverage.',
        includePublicMessage: true,
      },
      snapshot,
      {
        geminiApiKey: 'test-provider-key-failure',
        now: new Date('2026-06-19T19:06:00.000Z'),
      },
    )

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(response.source).toBe('gemini-fallback')
    expect(response.cacheHit).toBe(false)
    expect(response.generatedAt).toBe('2026-06-19T19:06:00.000Z')
    expect(response.recommendedActions.length).toBeGreaterThanOrEqual(2)
  })
})
