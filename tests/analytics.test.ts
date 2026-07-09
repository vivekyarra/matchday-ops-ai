import { describe, expect, it } from 'vitest'
import { incidents, zones } from '../src/server/data/stadium'
import { buildSnapshot, calculateZoneRisk, riskLevelFromScore } from '../src/server/services/analytics'

describe('stadium analytics', () => {
  it('builds an operations snapshot with risk and service metrics', () => {
    const snapshot = buildSnapshot(new Date('2026-06-19T19:00:00.000Z'))

    expect(snapshot.venueName).toBe('Harbor Park Stadium')
    expect(snapshot.metrics.attendance).toBeGreaterThan(0)
    expect(snapshot.metrics.highRiskZones).toBeGreaterThan(0)
    expect(snapshot.assessments).toHaveLength(snapshot.zones.length)
    expect(snapshot.generatedAt).toBe('2026-06-19T19:00:00.000Z')
  })

  it('raises risk when load, queue, staff gap, and incidents stack up', () => {
    const fanFest = zones.find((zone) => zone.id === 'fan-fest-plaza')

    expect(fanFest).toBeDefined()

    const assessment = calculateZoneRisk(fanFest!, incidents)

    expect(assessment.riskScore).toBeGreaterThanOrEqual(68)
    expect(['high', 'critical']).toContain(assessment.riskLevel)
    expect(assessment.drivers.join(' ')).toContain('open incident')
  })

  it('uses stable thresholds for risk levels', () => {
    expect(riskLevelFromScore(20)).toBe('low')
    expect(riskLevelFromScore(51)).toBe('medium')
    expect(riskLevelFromScore(72)).toBe('high')
    expect(riskLevelFromScore(90)).toBe('critical')
  })
})
