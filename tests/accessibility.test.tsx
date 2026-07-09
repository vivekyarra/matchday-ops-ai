/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import axe from 'axe-core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../src/client/App'
import type { StadiumSnapshot } from '../src/shared/schemas'

const snapshot: StadiumSnapshot = {
  generatedAt: '2026-06-19T19:00:00.000Z',
  venueName: 'Harbor Park Stadium',
  eventName: 'World Cup 2026 Matchday Operations Simulation',
  eventPhase: 'pre-kickoff',
  metrics: {
    attendance: 12000,
    venueLoadPercent: 77,
    averageQueueMinutes: 14,
    highRiskZones: 1,
    openIncidents: 1,
    staffCoveragePercent: 88,
    accessibilityReadinessPercent: 84,
    sustainabilityScore: 76,
  },
  zones: [
    {
      id: 'north-gate',
      name: 'North Gate',
      type: 'gate',
      capacity: 5200,
      occupancy: 4210,
      queueMinutes: 18,
      accessible: true,
      accessibilityScore: 88,
      staffAvailable: 24,
      staffNeeded: 28,
      coordinates: { x: 50, y: 9 },
      sensorHealth: 98,
      status: 'medium',
    },
    {
      id: 'fan-fest-plaza',
      name: 'Fan Fest Plaza',
      type: 'fan-zone',
      capacity: 7800,
      occupancy: 7210,
      queueMinutes: 26,
      accessible: true,
      accessibilityScore: 78,
      staffAvailable: 34,
      staffNeeded: 48,
      coordinates: { x: 18, y: 54 },
      sensorHealth: 91,
      status: 'high',
    },
    {
      id: 'section-224',
      name: 'Section 224',
      type: 'seating',
      capacity: 4100,
      occupancy: 3610,
      queueMinutes: 13,
      accessible: false,
      accessibilityScore: 58,
      staffAvailable: 8,
      staffNeeded: 13,
      coordinates: { x: 64, y: 30 },
      sensorHealth: 90,
      status: 'medium',
    },
  ],
  assessments: [
    {
      zoneId: 'north-gate',
      riskScore: 54,
      riskLevel: 'medium',
      drivers: ['18 minute queue'],
      projectedOccupancy15m: 4500,
    },
    {
      zoneId: 'fan-fest-plaza',
      riskScore: 76,
      riskLevel: 'high',
      drivers: ['92% load', '1 open incident'],
      projectedOccupancy15m: 7600,
    },
    {
      zoneId: 'section-224',
      riskScore: 55,
      riskLevel: 'medium',
      drivers: ['accessibility service below target'],
      projectedOccupancy15m: 3790,
    },
  ],
  incidents: [
    {
      id: 'inc-1001',
      zoneId: 'fan-fest-plaza',
      title: 'Density rising near sponsor stage',
      severity: 'high',
      category: 'crowd',
      openedAt: '2026-06-19T18:36:00.000Z',
      summary: 'Fan arrival pulse is compressing the west side of the plaza before kickoff.',
      owner: 'Crowd flow lead',
    },
  ],
  transit: [
    {
      mode: 'metro',
      label: 'Blue Line inbound',
      loadPercent: 86,
      nextArrivalMinutes: 4,
      status: 'high',
    },
  ],
  sustainability: {
    waterRefillUtilization: 72,
    wasteDiversionRate: 64,
    energyLoadPercent: 81,
    reusableCupReturnRate: 57,
  },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('client accessibility', () => {
  it('renders the dashboard without automated axe violations', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(snapshot), { status: 200 })),
    )

    const { container } = render(<App />)

    await screen.findByText('Operations map')
    await screen.findByText('Incidents, transport, sustainability')
    await waitFor(() => expect(screen.getAllByText('Fan Fest Plaza').length).toBeGreaterThan(0))

    const results = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
      },
    })
    expect(results.violations).toHaveLength(0)
  }, 15000)
})
