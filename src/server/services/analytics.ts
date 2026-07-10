import { incidents, sustainabilitySignal, transitSignals, venueProfile, zones } from '../data/stadium'
import type {
  Incident,
  RiskLevel,
  StadiumSnapshot,
  StadiumZone,
  ZoneAssessment,
} from '../../shared/schemas'
import { riskRank } from '../../shared/constants'

const riskLabels: RiskLevel[] = ['low', 'medium', 'high', 'critical']

const riskThresholds = {
  medium: 45,
  high: 68,
  critical: 84,
} as const

const zoneRiskWeights = {
  occupancy: 48,
  queuePressure: 20,
  staffGap: 14,
  incidentSeverity: 12,
  accessibilityDrag: 4,
  sensorDrag: 2,
} as const

const queuePressureMaxMinutes = 40
const nonAccessibleZonePenalty = 0.75

const occupancyProjection = {
  ingressPulse: 0.08,
  defaultPulse: 0.04,
  queuePulseDivisor: 100,
  minQueuePulse: 0.02,
  maxQueuePulse: 0.12,
  capacityBuffer: 1.12,
} as const

const sustainabilityWeights = {
  energyLoad: 0.25,
  wasteGap: 0.35,
  cupReturnGap: 0.25,
  refillOverTarget: 0.15,
} as const

const refillUtilizationTarget = 85

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= riskThresholds.critical) {
    return 'critical'
  }

  if (score >= riskThresholds.high) {
    return 'high'
  }

  if (score >= riskThresholds.medium) {
    return 'medium'
  }

  return 'low'
}

function strongestIncidentLevel(zoneIncidents: Incident[]): RiskLevel {
  return zoneIncidents.reduce<RiskLevel>((highest, incident) => {
    return riskRank[incident.severity] > riskRank[highest] ? incident.severity : highest
  }, 'low')
}

export function calculateZoneRisk(zone: StadiumZone, activeIncidents: Incident[]): ZoneAssessment {
  const zoneIncidents = activeIncidents.filter((incident) => incident.zoneId === zone.id)
  const occupancyRatio = zone.occupancy / zone.capacity
  const queuePressure = clamp(zone.queueMinutes / queuePressureMaxMinutes, 0, 1)
  const staffGap = clamp((zone.staffNeeded - zone.staffAvailable) / zone.staffNeeded, 0, 1)
  const incidentScore = riskLabels.indexOf(strongestIncidentLevel(zoneIncidents)) / (riskLabels.length - 1)
  const accessibilityDrag = zone.accessible
    ? clamp((100 - zone.accessibilityScore) / 100, 0, 1)
    : nonAccessibleZonePenalty
  const sensorDrag = clamp((100 - zone.sensorHealth) / 100, 0, 1)

  const riskScore = Math.round(
    clamp(
      occupancyRatio * zoneRiskWeights.occupancy +
        queuePressure * zoneRiskWeights.queuePressure +
        staffGap * zoneRiskWeights.staffGap +
        incidentScore * zoneRiskWeights.incidentSeverity +
        accessibilityDrag * zoneRiskWeights.accessibilityDrag +
        sensorDrag * zoneRiskWeights.sensorDrag,
      0,
      100,
    ),
  )

  const drivers: string[] = []

  if (occupancyRatio >= 0.86) {
    drivers.push(`${Math.round(occupancyRatio * 100)}% load`)
  }

  if (zone.queueMinutes >= 15) {
    drivers.push(`${zone.queueMinutes} minute queue`)
  }

  if (staffGap > 0.18) {
    drivers.push(`${zone.staffNeeded - zone.staffAvailable} staff gap`)
  }

  if (zoneIncidents.length > 0) {
    drivers.push(`${zoneIncidents.length} open incident${zoneIncidents.length > 1 ? 's' : ''}`)
  }

  if (zone.accessibilityScore < 82) {
    drivers.push('accessibility service below target')
  }

  if (drivers.length === 0) {
    drivers.push('within operating target')
  }

  return {
    zoneId: zone.id,
    riskScore,
    riskLevel: riskLevelFromScore(riskScore),
    drivers,
    projectedOccupancy15m: projectOccupancy(zone),
  }
}

function projectOccupancy(zone: StadiumZone) {
  const ingressPulse =
    zone.type === 'gate' || zone.type === 'fan-zone'
      ? occupancyProjection.ingressPulse
      : occupancyProjection.defaultPulse
  const queuePulse = clamp(
    zone.queueMinutes / occupancyProjection.queuePulseDivisor,
    occupancyProjection.minQueuePulse,
    occupancyProjection.maxQueuePulse,
  )

  return Math.round(
    clamp(
      zone.occupancy * (1 + ingressPulse + queuePulse),
      0,
      zone.capacity * occupancyProjection.capacityBuffer,
    ),
  )
}

export function buildSnapshot(now = new Date()): StadiumSnapshot {
  const assessments = zones.map((zone) => calculateZoneRisk(zone, incidents))
  const attendance = zones.reduce((sum, zone) => sum + zone.occupancy, 0)
  const capacity = zones.reduce((sum, zone) => sum + zone.capacity, 0)
  const staffAvailable = zones.reduce((sum, zone) => sum + zone.staffAvailable, 0)
  const staffNeeded = zones.reduce((sum, zone) => sum + zone.staffNeeded, 0)
  const averageQueueMinutes =
    zones.reduce((sum, zone) => sum + zone.queueMinutes, 0) / zones.length
  const accessibilityReadinessPercent =
    zones.reduce((sum, zone) => sum + zone.accessibilityScore, 0) / zones.length
  const highRiskZones = assessments.filter(
    (assessment) => assessment.riskLevel === 'high' || assessment.riskLevel === 'critical',
  ).length

  const sustainabilityScore = Math.round(
    100 -
      (sustainabilitySignal.energyLoadPercent * sustainabilityWeights.energyLoad +
        (100 - sustainabilitySignal.wasteDiversionRate) * sustainabilityWeights.wasteGap +
        (100 - sustainabilitySignal.reusableCupReturnRate) * sustainabilityWeights.cupReturnGap +
        Math.max(sustainabilitySignal.waterRefillUtilization - refillUtilizationTarget, 0) *
          sustainabilityWeights.refillOverTarget),
  )

  return {
    generatedAt: now.toISOString(),
    ...venueProfile,
    metrics: {
      attendance,
      venueLoadPercent: Math.round((attendance / capacity) * 100),
      averageQueueMinutes: Math.round(averageQueueMinutes),
      highRiskZones,
      openIncidents: incidents.length,
      staffCoveragePercent: Math.round((staffAvailable / staffNeeded) * 100),
      accessibilityReadinessPercent: Math.round(accessibilityReadinessPercent),
      sustainabilityScore: clamp(sustainabilityScore, 0, 100),
    },
    zones,
    assessments,
    incidents,
    transit: transitSignals,
    sustainability: sustainabilitySignal,
  }
}

export function getHighestRiskZones(snapshot: StadiumSnapshot, count = 3) {
  return [...snapshot.assessments]
    .sort((left, right) => right.riskScore - left.riskScore)
    .slice(0, count)
    .map((assessment) => {
      const zone = snapshot.zones.find((candidate) => candidate.id === assessment.zoneId)

      return {
        ...assessment,
        zoneName: zone?.name ?? assessment.zoneId,
      }
    })
}
