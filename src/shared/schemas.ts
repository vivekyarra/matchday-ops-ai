import { z } from 'zod'

export const RiskLevelSchema = z.enum(['low', 'medium', 'high', 'critical'])
export const LanguageSchema = z.enum(['en', 'es', 'fr', 'ar', 'hi', 'pt'])
export const RoleSchema = z.enum([
  'operations',
  'security',
  'accessibility',
  'transport',
  'sustainability',
])

export const StadiumZoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['gate', 'concourse', 'seating', 'service', 'transit', 'medical', 'fan-zone']),
  capacity: z.number().int().positive(),
  occupancy: z.number().int().nonnegative(),
  queueMinutes: z.number().nonnegative(),
  accessible: z.boolean(),
  accessibilityScore: z.number().min(0).max(100),
  staffAvailable: z.number().int().nonnegative(),
  staffNeeded: z.number().int().positive(),
  coordinates: z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
  }),
  sensorHealth: z.number().min(0).max(100),
  status: RiskLevelSchema,
})

export const IncidentSchema = z.object({
  id: z.string(),
  zoneId: z.string(),
  title: z.string(),
  severity: RiskLevelSchema,
  category: z.enum(['crowd', 'medical', 'security', 'accessibility', 'transport', 'sustainability']),
  openedAt: z.string(),
  summary: z.string(),
  owner: z.string(),
})

export const TransitSignalSchema = z.object({
  mode: z.enum(['metro', 'bus', 'rideshare', 'walk']),
  label: z.string(),
  loadPercent: z.number().min(0).max(100),
  nextArrivalMinutes: z.number().int().nonnegative(),
  status: RiskLevelSchema,
})

export const SustainabilitySignalSchema = z.object({
  waterRefillUtilization: z.number().min(0).max(100),
  wasteDiversionRate: z.number().min(0).max(100),
  energyLoadPercent: z.number().min(0).max(100),
  reusableCupReturnRate: z.number().min(0).max(100),
})

export const SnapshotMetricsSchema = z.object({
  attendance: z.number().int().nonnegative(),
  venueLoadPercent: z.number().min(0).max(100),
  averageQueueMinutes: z.number().nonnegative(),
  highRiskZones: z.number().int().nonnegative(),
  openIncidents: z.number().int().nonnegative(),
  staffCoveragePercent: z.number().min(0).max(100),
  accessibilityReadinessPercent: z.number().min(0).max(100),
  sustainabilityScore: z.number().min(0).max(100),
})

export const ZoneAssessmentSchema = z.object({
  zoneId: z.string(),
  riskScore: z.number().min(0).max(100),
  riskLevel: RiskLevelSchema,
  drivers: z.array(z.string()),
  projectedOccupancy15m: z.number().int().nonnegative(),
})

export const RouteStepSchema = z.object({
  from: z.string(),
  to: z.string(),
  minutes: z.number().positive(),
  instruction: z.string(),
  accessible: z.boolean(),
  crowdNote: z.string(),
})

export const RoutePlanSchema = z.object({
  from: z.string(),
  to: z.string(),
  totalMinutes: z.number().positive(),
  riskLevel: RiskLevelSchema,
  steps: z.array(RouteStepSchema).min(1),
  assumptions: z.array(z.string()),
})

export const StadiumSnapshotSchema = z.object({
  generatedAt: z.string(),
  venueName: z.string(),
  eventName: z.string(),
  eventPhase: z.enum(['pre-gates', 'arrival', 'pre-kickoff', 'halftime', 'egress']),
  metrics: SnapshotMetricsSchema,
  zones: z.array(StadiumZoneSchema),
  assessments: z.array(ZoneAssessmentSchema),
  incidents: z.array(IncidentSchema),
  transit: z.array(TransitSignalSchema),
  sustainability: SustainabilitySignalSchema,
})

export const DecisionRequestSchema = z.object({
  role: RoleSchema,
  language: LanguageSchema.default('en'),
  urgency: RiskLevelSchema.default('medium'),
  prompt: z.string().trim().min(8).max(1200),
  includePublicMessage: z.boolean().default(true),
})

export const AiActionSchema = z.object({
  priority: z.enum(['now', 'next-5-min', 'next-15-min']),
  owner: z.string().min(2),
  action: z.string().min(6),
  rationale: z.string().min(6),
  etaMinutes: z.number().int().min(0).max(60),
})

export const DecisionPayloadSchema = z.object({
  summary: z.string().min(12),
  riskLevel: RiskLevelSchema,
  confidence: z.number().min(0).max(1),
  recommendedActions: z.array(AiActionSchema).min(2).max(6),
  publicMessage: z.string().min(8),
  staffBriefing: z.string().min(8),
  accessibilityNote: z.string().min(8),
  sustainabilityNote: z.string().min(8),
  assumptions: z.array(z.string()).min(1).max(6),
})

export const DecisionResponseSchema = DecisionPayloadSchema.extend({
  source: z.enum(['gemini', 'demo-rules', 'gemini-fallback']),
  generatedAt: z.string(),
  cacheHit: z.boolean(),
})

export const RouteRequestSchema = z.object({
  from: z.string().trim().min(2).max(80),
  to: z.string().trim().min(2).max(80),
  mobility: z.enum(['standard', 'wheelchair', 'low-vision', 'sensory-sensitive']).default('standard'),
  avoidCrowds: z.boolean().default(true),
})

export const EvaluationSourcePathSchema = z.string().min(1)

export const ChallengeAlignmentEvidenceItemSchema = z.object({
  requirement: z.string().min(2),
  implementation: z.string().min(40),
  sourcePaths: z.array(EvaluationSourcePathSchema).min(1),
})

export const CodeQualityEvidenceItemSchema = z.object({
  signal: z.string().min(2),
  implementation: z.string().min(40),
  sourcePaths: z.array(EvaluationSourcePathSchema).min(1),
})

export const EvaluationCoverageSchema = z.object({
  requiredCount: z.number().int().positive(),
  coveredCount: z.number().int().nonnegative(),
  complete: z.boolean(),
  missingRequirements: z.array(z.string()),
})

export const EvaluationEvidenceSchema = z.object({
  problemStatementAlignment: z.object({
    targetScore: z.literal(100),
    challengeId: z.string(),
    vertical: z.string(),
    context: z.string(),
    exactProblemStatement: z.string(),
    requiredAudiences: z.array(z.string()).min(1),
    requiredCapabilities: z.array(z.string()).min(1),
    requiredRequirements: z.array(z.string()).min(1),
    coverage: EvaluationCoverageSchema,
    evidence: z.array(ChallengeAlignmentEvidenceItemSchema).min(1),
  }),
  codeQuality: z.object({
    targetScore: z.literal(100),
    validationCommand: z.string(),
    validationSteps: z.array(z.string()).min(1),
    coverageCommand: z.string(),
    evidence: z.array(CodeQualityEvidenceItemSchema).min(1),
  }),
})

export type RiskLevel = z.infer<typeof RiskLevelSchema>
export type LanguageCode = z.infer<typeof LanguageSchema>
export type Role = z.infer<typeof RoleSchema>
export type StadiumZone = z.infer<typeof StadiumZoneSchema>
export type Incident = z.infer<typeof IncidentSchema>
export type TransitSignal = z.infer<typeof TransitSignalSchema>
export type SustainabilitySignal = z.infer<typeof SustainabilitySignalSchema>
export type ZoneAssessment = z.infer<typeof ZoneAssessmentSchema>
export type StadiumSnapshot = z.infer<typeof StadiumSnapshotSchema>
export type DecisionRequest = z.infer<typeof DecisionRequestSchema>
export type DecisionPayload = z.infer<typeof DecisionPayloadSchema>
export type DecisionResponse = z.infer<typeof DecisionResponseSchema>
export type RouteRequest = z.infer<typeof RouteRequestSchema>
export type RoutePlan = z.infer<typeof RoutePlanSchema>
export type ChallengeAlignmentEvidenceItem = z.infer<typeof ChallengeAlignmentEvidenceItemSchema>
export type CodeQualityEvidenceItem = z.infer<typeof CodeQualityEvidenceItemSchema>
export type EvaluationEvidence = z.infer<typeof EvaluationEvidenceSchema>
