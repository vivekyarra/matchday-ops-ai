/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

const decisionResponse = {
  summary: 'Operations should open the calm bypass and keep staff visible.',
  riskLevel: 'high',
  confidence: 0.82,
  recommendedActions: [
    {
      priority: 'now',
      owner: 'Crowd flow lead',
      action: 'Open north east bypass for guest routing.',
      rationale: 'East gate queue pressure is elevated.',
      etaMinutes: 3,
    },
    {
      priority: 'next-5-min',
      owner: 'Accessibility captain',
      action: 'Move mobility support to the lift queue.',
      rationale: 'Accessible route demand is rising.',
      etaMinutes: 5,
    },
  ],
  publicMessage: 'For guests: please follow the calmer signed route.',
  staffBriefing: 'Keep messages calm and update command every five minutes.',
  accessibilityNote: 'Accessible support staff are moving closer.',
  sustainabilityNote: 'Add volunteers near cup return points.',
  assumptions: ['Human operators approve all public and staff actions before execution.'],
  source: 'demo-rules',
  generatedAt: '2026-06-19T19:00:00.000Z',
  cacheHit: false,
}

const routeResponse = {
  from: 'north-gate',
  to: 'section-224',
  totalMinutes: 12,
  riskLevel: 'high',
  steps: [
    {
      from: 'north-gate',
      to: 'east-gate',
      minutes: 7,
      instruction: 'Use Outer concourse north-east bypass from North Gate to East Gate.',
      accessible: true,
      crowdNote: 'Crowd pressure is manageable.',
    },
  ],
  assumptions: ['Route avoids non-accessible edges for the selected mobility need.'],
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

  it('shows a clear alert when the snapshot request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })))

    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load venue snapshot')
  })

  it('submits the existing AI briefing and route planning workflows', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url === '/api/stadium/snapshot') {
        return new Response(JSON.stringify(snapshot), { status: 200 })
      }

      if (url === '/api/operations/decision') {
        return new Response(JSON.stringify(decisionResponse), { status: 200 })
      }

      if (url === '/api/routes/plan') {
        return new Response(JSON.stringify(routeResponse), { status: 200 })
      }

      return new Response('{}', { status: 404 })
    })

    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await screen.findByText('Ops briefing')
    await waitFor(() => expect(screen.getByRole('button', { name: /generate briefing/i })).toBeEnabled())

    fireEvent.click(screen.getByRole('button', { name: /generate briefing/i }))
    expect(await screen.findByText('Open north east bypass for guest routing.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /plan route/i }))
    expect(await screen.findByText('12 minutes')).toBeInTheDocument()
    expect(await screen.findByText(/Outer concourse north-east bypass/)).toBeInTheDocument()
  })
})
