import { createHash } from 'node:crypto'
import { config } from '../config'
import { getHighestRiskZones } from './analytics'
import type {
  DecisionPayload,
  DecisionRequest,
  DecisionResponse,
  LanguageCode,
  RiskLevel,
  StadiumSnapshot,
} from '../../shared/schemas'
import { DecisionPayloadSchema } from '../../shared/schemas'
import {
  CHALLENGE_CONTEXT,
  CHALLENGE_ID,
  CHALLENGE_PROBLEM_STATEMENT,
  CHALLENGE_VERTICAL,
  challengeAudiences,
  challengeCapabilities,
  languageOptions,
  riskRank,
  roleLabels,
} from '../../shared/constants'

type CacheRecord = {
  expiresAt: number
  response: DecisionResponse
}

type GeminiPart = {
  text?: string
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[]
    }
  }>
}

const decisionCache = new Map<string, CacheRecord>()
const maxDecisionCacheEntries = 128

const translations: Record<LanguageCode, { publicPrefix: string; crowd: string; accessibility: string }> = {
  en: {
    publicPrefix: 'For guests',
    crowd: 'Please use the calmer signed route and follow staff directions.',
    accessibility: 'Accessible support staff are being moved closer to the lift queue.',
  },
  es: {
    publicPrefix: 'Para los aficionados',
    crowd: 'Use la ruta senalizada con menor congestion y siga las indicaciones del personal.',
    accessibility: 'El equipo de accesibilidad se esta acercando a la fila del ascensor.',
  },
  fr: {
    publicPrefix: 'Pour les supporters',
    crowd: 'Utilisez l itineraire le moins charge et suivez les consignes du personnel.',
    accessibility: 'L equipe accessibilite se rapproche de la file de l ascenseur.',
  },
  ar: {
    publicPrefix: 'للجماهير',
    crowd: 'يرجى استخدام المسار الاكثر هدوءا واتباع تعليمات الموظفين.',
    accessibility: 'يتم نقل فريق الدعم القابل للوصول بالقرب من طابور المصعد.',
  },
  hi: {
    publicPrefix: 'Darshako ke liye',
    crowd: 'Kripya kam bheed wale sanketit raaste ka upyog karein aur staff ki baat maanein.',
    accessibility: 'Accessibility support staff ko lift queue ke kareeb bheja ja raha hai.',
  },
  pt: {
    publicPrefix: 'Para os torcedores',
    crowd: 'Use a rota sinalizada mais tranquila e siga a orientacao da equipe.',
    accessibility: 'A equipe de acessibilidade esta sendo deslocada para perto da fila do elevador.',
  },
}

export async function createDecisionSupport(
  request: DecisionRequest,
  snapshot: StadiumSnapshot,
): Promise<DecisionResponse> {
  const cacheKey = buildCacheKey(request, snapshot)
  const cached = decisionCache.get(cacheKey)

  if (cached && cached.expiresAt > Date.now()) {
    return {
      ...cached.response,
      cacheHit: true,
    }
  }

  const generatedAt = new Date().toISOString()

  if (!config.geminiApiKey) {
    const response = {
      ...buildRulesDecision(request, snapshot),
      source: 'demo-rules' as const,
      generatedAt,
      cacheHit: false,
    }
    storeCache(cacheKey, response)
    return response
  }

  try {
    const payload = await callGemini(request, snapshot)
    const response = {
      ...payload,
      source: 'gemini' as const,
      generatedAt,
      cacheHit: false,
    }
    storeCache(cacheKey, response)
    return response
  } catch {
    const response = {
      ...buildRulesDecision(request, snapshot),
      source: 'gemini-fallback' as const,
      generatedAt,
      cacheHit: false,
    }
    storeCache(cacheKey, response)
    return response
  }
}

function buildCacheKey(request: DecisionRequest, snapshot: StadiumSnapshot) {
  const highRisk = getHighestRiskZones(snapshot, 5).map((zone) => ({
    zoneId: zone.zoneId,
    score: zone.riskScore,
  }))

  return createHash('sha256')
    .update(
      JSON.stringify({
        request,
        metrics: snapshot.metrics,
        incidents: snapshot.incidents.map((incident) => incident.id),
        highRisk,
      }),
    )
    .digest('hex')
}

function storeCache(cacheKey: string, response: DecisionResponse) {
  const now = Date.now()

  for (const [key, record] of decisionCache.entries()) {
    if (record.expiresAt <= now) {
      decisionCache.delete(key)
    }
  }

  while (decisionCache.size >= maxDecisionCacheEntries) {
    const oldestKey = decisionCache.keys().next().value

    if (!oldestKey) {
      break
    }

    decisionCache.delete(oldestKey)
  }

  decisionCache.set(cacheKey, {
    expiresAt: now + config.aiCacheTtlMs,
    response,
  })
}

function buildRulesDecision(request: DecisionRequest, snapshot: StadiumSnapshot): DecisionPayload {
  const [primary, secondary] = getHighestRiskZones(snapshot, 2)
  const phrase = translations[request.language]
  const incident = snapshot.incidents[0]
  const roleLabel = roleLabels[request.role]
  const riskLevel = strongerRisk(primary?.riskLevel ?? 'medium', request.urgency)

  return {
    summary: `${roleLabel} should treat ${primary?.zoneName ?? 'the venue'} as the active priority because ${primary?.drivers.join(', ') ?? 'crowd load is elevated'}.`,
    riskLevel,
    confidence: 0.82,
    recommendedActions: [
      {
        priority: 'now',
        owner: 'Crowd flow lead',
        action: `Move eight mobile stewards from South Gate to ${primary?.zoneName ?? 'East Gate'} and open the signed bypass.`,
        rationale: primary?.drivers.join(', ') ?? 'Highest calculated pressure in the venue snapshot.',
        etaMinutes: 3,
      },
      {
        priority: 'next-5-min',
        owner: 'Accessibility captain',
        action: 'Place two mobility support staff at Accessibility Lift A and prioritize wheelchair groups.',
        rationale: 'Lift wait and accessibility readiness are below the target for inclusive service.',
        etaMinutes: 5,
      },
      {
        priority: 'next-15-min',
        owner: 'Transport desk',
        action: `Send arrival guidance away from ${secondary?.zoneName ?? 'the busiest approach'} through push notifications and PA copy.`,
        rationale: 'Rerouting demand before kickoff prevents queue growth from becoming an egress issue.',
        etaMinutes: 12,
      },
    ],
    publicMessage: `${phrase.publicPrefix}: ${phrase.crowd}`,
    staffBriefing: `Current top incident is ${incident.title}. Keep messages calm, direct guests to visible staff, and update the command channel every five minutes.`,
    accessibilityNote: phrase.accessibility,
    sustainabilityNote: `Cup return is ${snapshot.sustainability.reusableCupReturnRate}%; add volunteers near the return bank while queues are redirected.`,
    assumptions: [
      'Uses demo venue sensor data included in this repository.',
      'No personal data is used for recommendations.',
      'Human operators approve all public and staff actions before execution.',
    ],
  }
}

async function callGemini(
  request: DecisionRequest,
  snapshot: StadiumSnapshot,
): Promise<DecisionPayload> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.aiTimeoutMs)

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${encodeURIComponent(config.geminiApiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: [
                  `You are a stadium operations decision support assistant for ${CHALLENGE_CONTEXT} matchdays.`,
                  `${CHALLENGE_ID}: ${CHALLENGE_VERTICAL}.`,
                  CHALLENGE_PROBLEM_STATEMENT,
                  'Return only valid JSON matching the requested fields.',
                  'Use only the supplied venue snapshot. Do not claim live integrations that are not present.',
                  'Do not include secrets, credentials, surveillance advice, or unsafe crowd-control tactics.',
                  'Every action must keep accessibility, safety, sustainability, and human operator approval in mind.',
                ].join(' '),
              },
            ],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: buildPrompt(request, snapshot) }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      },
    )

    if (!response.ok) {
      throw new Error(`Gemini request failed with ${response.status}`)
    }

    const data = (await response.json()) as GeminiResponse
    const text = data.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text ?? '')
      .join('\n')
      .trim()

    if (!text) {
      throw new Error('Gemini response did not contain text')
    }

    return DecisionPayloadSchema.parse(JSON.parse(text))
  } finally {
    clearTimeout(timeout)
  }
}

function buildPrompt(request: DecisionRequest, snapshot: StadiumSnapshot) {
  const language = languageOptions.find((option) => option.code === request.language)?.label ?? 'English'
  const highRisk = getHighestRiskZones(snapshot, 4)

  return JSON.stringify({
    operatorRequest: {
      role: request.role,
      urgency: request.urgency,
      language,
      prompt: request.prompt.slice(0, 1200),
      includePublicMessage: request.includePublicMessage,
    },
    challengeAlignment: {
      id: CHALLENGE_ID,
      vertical: CHALLENGE_VERTICAL,
      context: CHALLENGE_CONTEXT,
      audiences: challengeAudiences,
      capabilities: challengeCapabilities,
    },
    requiredJsonShape: {
      summary: 'string',
      riskLevel: 'low | medium | high | critical',
      confidence: 'number between 0 and 1',
      recommendedActions:
        'array of 2 to 6 objects with priority, owner, action, rationale, etaMinutes',
      publicMessage: 'string in requested language when possible',
      staffBriefing: 'string',
      accessibilityNote: 'string',
      sustainabilityNote: 'string',
      assumptions: 'array of strings',
    },
    venueSnapshot: {
      eventPhase: snapshot.eventPhase,
      metrics: snapshot.metrics,
      highRiskZones: highRisk,
      incidents: snapshot.incidents,
      transit: snapshot.transit,
      sustainability: snapshot.sustainability,
    },
  })
}

function strongerRisk(left: RiskLevel, right: RiskLevel) {
  return riskRank[right] > riskRank[left] ? right : left
}
